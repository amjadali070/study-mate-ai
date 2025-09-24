import express, { Response } from 'express';
import { verifyJWT } from '../middleware/auth';
import { prisma } from '../index';
import { AuthRequest, QuizRequest, QuizResponse } from '../types';
import { generateQuizQuestions } from '../services/openai';
import { getChunksByDocumentId } from '../services/database';

const router = express.Router();

/**
 * POST /api/quiz
 * Generate quiz questions from document (protected route)
 */
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { documentId, numQuestions }: QuizRequest = req.body;
    const userId = req.user.id;

    // Validation
    if (!documentId) {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    if (!numQuestions || numQuestions < 1 || numQuestions > 20) {
      return res.status(400).json({ message: 'Number of questions must be between 1 and 20' });
    }

    console.log(`🧠 Generating ${numQuestions} quiz questions for document ${documentId}`);

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true, name: true }
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found or access denied' });
    }

    // Step 1: Get document chunks
    let documentChunks;
    try {
      documentChunks = await getChunksByDocumentId(documentId);
      console.log(`📚 Found ${documentChunks.length} chunks for document`);
    } catch (error) {
      console.error('Error fetching document chunks:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch document content',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    if (documentChunks.length === 0) {
      return res.status(400).json({ 
        message: 'No content available for this document to generate quiz questions' 
      });
    }

    // Step 2: Combine chunks into context (limit to avoid token limits)
    const maxChunks = Math.min(10, documentChunks.length); // Limit to first 10 chunks
    const context = documentChunks
      .slice(0, maxChunks)
      .map(chunk => chunk.text)
      .join('\n\n');

    if (context.length === 0) {
      return res.status(400).json({ 
        message: 'Document content is too short to generate quiz questions' 
      });
    }

    console.log(`📝 Using ${context.length} characters of context for quiz generation`);

    // Step 3: Generate quiz questions using OpenAI
    let quizQuestions;
    try {
      quizQuestions = await generateQuizQuestions(context, numQuestions);
      console.log(`✅ Generated ${quizQuestions.length} quiz questions`);
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      return res.status(500).json({ 
        message: 'Failed to generate quiz questions',
        error: error instanceof Error ? error.message : 'Quiz generation failed'
      });
    }

    // Step 4: Validate quiz questions format
    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
      return res.status(500).json({ 
        message: 'Failed to generate valid quiz questions' 
      });
    }

    // Validate each question has the required structure
    const validatedQuestions = quizQuestions
      .filter(q => q.question && q.options && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctAnswer === 'number')
      .slice(0, numQuestions); // Ensure we don't exceed requested number

    if (validatedQuestions.length === 0) {
      return res.status(500).json({ 
        message: 'Generated quiz questions are not in the correct format' 
      });
    }

    // Step 5: Prepare response
    const response: QuizResponse = {
      questions: validatedQuestions,
      documentName: document.name
    };

    res.json({
      message: `Quiz with ${validatedQuestions.length} questions generated successfully`,
      data: response
    });

  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ 
      message: 'Internal server error during quiz generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/quiz/documents
 * Get user's documents available for quiz generation (protected route)
 */
router.get('/documents', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;

    const documents = await prisma.document.findMany({
      where: { userId },
      include: {
        _count: {
          select: { chunks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter documents that have content (chunks)
    const availableDocuments = documents
      .filter((doc: typeof documents[number]) => doc._count.chunks > 0)
      .map((doc: typeof documents[number]) => ({
        id: doc.id,
        name: doc.name,
        createdAt: doc.createdAt,
        chunksCount: doc._count.chunks
      }));

    res.json({
      message: 'Quiz-eligible documents retrieved successfully',
      data: availableDocuments
    });

  } catch (error) {
    console.error('Error fetching quiz documents:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/quiz/validate
 * Validate quiz answers (protected route)
 */
router.post('/validate', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { answers, questions } = req.body;

    if (!Array.isArray(answers) || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Invalid answers or questions format' });
    }

    if (answers.length !== questions.length) {
      return res.status(400).json({ message: 'Number of answers must match number of questions' });
    }

    const results = answers.map((answer, index) => {
      const question = questions[index];
      const isCorrect = answer === question.correctAnswer;
      
      return {
        questionIndex: index,
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation || null
      };
    });

    const score = results.filter(result => result.isCorrect).length;
    const percentage = Math.round((score / answers.length) * 100);

    res.json({
      message: 'Quiz answers validated successfully',
      data: {
        score,
        totalQuestions: answers.length,
        percentage,
        results
      }
    });

  } catch (error) {
    console.error('Error validating quiz answers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
