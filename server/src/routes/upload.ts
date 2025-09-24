import express, { Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { verifyJWT } from '../middleware/auth';
import { prisma } from '../index';
import { AuthRequest } from '../types';
import { 
  extractText, 
  splitTextIntoChunks, 
  cleanText, 
  isValidFileType,
  getFileExtension 
} from '../utils/textProcessing';
import { generateEmbeddings } from '../services/openai';
import { storeEmbeddings } from '../services/pinecone';
import { storeEmbeddingsInDB, createDocument } from '../services/database';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (isValidFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

/**
 * POST /api/upload
 * Upload and process document (protected route)
 */
router.post('/', verifyJWT, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { file } = req;
    const { buffer, originalname, mimetype } = file;
    const userId = req.user.id;

    console.log(`📄 Processing file: ${originalname} (${mimetype})`);

    // Step 1: Extract text from file
    let extractedText: string;
    try {
      extractedText = await extractText(buffer, mimetype);
    } catch (error) {
      console.error('Text extraction error:', error);
      return res.status(400).json({ 
        message: 'Failed to extract text from file',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ message: 'No text content found in the file' });
    }

    // Step 2: Clean and prepare text
    const cleanedText = cleanText(extractedText);
    console.log(`📝 Extracted ${cleanedText.length} characters of text`);

    // Step 3: Split text into chunks
    const textChunks = splitTextIntoChunks(cleanedText, 500);
    console.log(`🔪 Split text into ${textChunks.length} chunks`);

    if (textChunks.length === 0) {
      return res.status(400).json({ message: 'No text chunks could be created from the file' });
    }

    // Step 4: Create document record in database
    const document = await createDocument(userId, originalname);
    console.log(`💾 Created document record: ${document.id}`);

    // Step 5: Generate embeddings for all chunks
    console.log('🧠 Generating embeddings...');
    let embeddings;
    try {
      const embeddingResponses = await generateEmbeddings(textChunks);
      embeddings = embeddingResponses.map((response, index) => ({
        id: crypto.randomUUID(),
        text: textChunks[index],
        embedding: response.embedding,
        documentId: document.id
      }));
    } catch (error) {
      console.error('Embedding generation error:', error);
      const status = (error as any)?.status === 429 || (error as any)?.code === 'insufficient_quota' ? 429 : 500;
      return res.status(status).json({ 
        message: status === 429 ? 'OpenAI quota exceeded. Please check billing or try later.' : 'Failed to generate embeddings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Step 6: Store embeddings (try Pinecone first, fallback to database)
    console.log('💽 Storing embeddings...');
    let storageMethod = 'database';
    
    try {
      // Try Pinecone first if configured
      if (process.env.PINECONE_API_KEY) {
        await storeEmbeddings(embeddings);
        storageMethod = 'pinecone';
        console.log('✅ Embeddings stored in Pinecone');
      } else {
        throw new Error('Pinecone not configured, using database');
      }
    } catch (pineconeError) {
      console.log('⚠️ Pinecone storage failed, falling back to database');
      try {
        await storeEmbeddingsInDB(embeddings);
        console.log('✅ Embeddings stored in database');
      } catch (dbError) {
        console.error('Database storage error:', dbError);
        return res.status(500).json({ 
          message: 'Failed to store embeddings',
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }
    }

    // Success response
    res.json({
      message: 'File processed successfully',
      data: {
        documentId: document.id,
        documentName: document.name,
        chunksCreated: textChunks.length,
        storageMethod,
        fileExtension: getFileExtension(mimetype),
        textLength: cleanedText.length,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ 
      message: 'Internal server error during file processing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/upload/documents
 * Get user's uploaded documents (protected route)
 */
router.get('/documents', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { getUserDocuments } = await import('../services/database');
    const documents = await getUserDocuments(req.user.id);

    res.json({
      message: 'Documents retrieved successfully',
      data: documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        createdAt: doc.createdAt,
        chunksCount: doc._count.chunks
      }))
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/upload/documents/:id
 * Delete a document and its embeddings (protected route)
 */
router.delete('/documents/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const documentId = req.params.id;
    const userId = req.user.id;

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId }
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found or access denied' });
    }

    // Delete embeddings from vector store
    try {
      if (process.env.PINECONE_API_KEY) {
        const { deleteEmbeddingsByDocumentId } = await import('../services/pinecone');
        await deleteEmbeddingsByDocumentId(documentId);
      } else {
        const { deleteEmbeddingsByDocumentIdInDB } = await import('../services/database');
        await deleteEmbeddingsByDocumentIdInDB(documentId);
      }
    } catch (error) {
      console.error('Error deleting embeddings:', error);
    }

    // Delete document (this will cascade delete chunks due to Prisma schema)
    await prisma.document.delete({
      where: { id: documentId }
    });

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware for multer
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${error.message}` });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }
  
  next(error);
});

export default router;
