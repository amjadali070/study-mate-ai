import express, { Response } from 'express';
import { verifyJWT } from '../middleware/auth';
import { prisma } from '../index';
import { AuthRequest, ChatRequest, ChatResponse } from '../types';
import { generateEmbedding, generateChatCompletion } from '../services/openai';
import { searchSimilarEmbeddings } from '../services/pinecone';
import { searchSimilarEmbeddingsInDB, createChatRecord, getChatHistory } from '../services/database';

const router = express.Router();

/**
 * POST /api/chat
 * Process chat query with RAG (protected route)
 */
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { query }: ChatRequest = req.body;
    const userId = req.user.id;

    // Validation
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query is required' });
    }

    if (query.length > 1000) {
      return res.status(400).json({ message: 'Query is too long. Maximum 1000 characters.' });
    }

    console.log(`💬 Processing chat query for user ${userId}: "${query.substring(0, 100)}..."`);

    // Step 1: Generate embedding for the query
    let queryEmbedding: number[];
    try {
      const embeddingResponse = await generateEmbedding(query);
      queryEmbedding = embeddingResponse.embedding;
      console.log('✅ Query embedding generated');
    } catch (error) {
      console.error('Error generating query embedding:', error);
      return res.status(500).json({ 
        message: 'Failed to process query',
        error: 'Embedding generation failed'
      });
    }

    // Step 2: Search for similar chunks
    let searchResults;
    try {
      if (process.env.PINECONE_API_KEY) {
        searchResults = await searchSimilarEmbeddings(queryEmbedding, 5, userId);
        console.log(`🔍 Found ${searchResults.length} similar chunks in Pinecone`);
      } else {
        searchResults = await searchSimilarEmbeddingsInDB(queryEmbedding, 5, userId);
        console.log(`🔍 Found ${searchResults.length} similar chunks in database`);
      }
    } catch (error) {
      console.error('Error searching embeddings:', error);
      return res.status(500).json({ 
        message: 'Failed to search knowledge base',
        error: 'Vector search failed'
      });
    }

    // Step 3: Prepare context from search results
    const contextChunks = searchResults
      .filter(result => result.score > 0.7) // Filter by similarity threshold
      .slice(0, 5) // Limit to top 5 results
      .map(result => result.text);

    const context = contextChunks.join('\n\n');
    const references = searchResults
      .filter(result => result.score > 0.7)
      .slice(0, 5)
      .map(result => `${result.text.substring(0, 100)}... (Score: ${result.score.toFixed(3)})`);

    console.log(`📚 Using ${contextChunks.length} context chunks`);

    // Step 4: Generate system prompt
    const systemPrompt = `You are a helpful study assistant. Your task is to answer questions based ONLY on the provided context information.

Instructions:
- Use only the information provided in the context to answer questions
- If the context doesn't contain enough information to answer the question, say "I don't have enough information in the provided documents to answer this question."
- Be accurate and concise in your responses
- If you quote directly from the context, use quotation marks
- Provide helpful explanations when possible

Context Information:
${context}

Remember: Only use the context provided above to answer questions. Do not use any external knowledge.`;

    // Step 5: Generate response using OpenAI
    let answer: string;
    try {
      answer = await generateChatCompletion(systemPrompt, query, context);
      console.log('🤖 AI response generated successfully');
    } catch (error) {
      console.error('Error generating AI response:', error);
      return res.status(500).json({ 
        message: 'Failed to generate response',
        error: 'AI response generation failed'
      });
    }

    // Step 6: Save chat record to database
    let chatRecord;
    try {
      chatRecord = await createChatRecord(userId, query, answer);
      console.log(`💾 Chat record saved: ${chatRecord.id}`);
    } catch (error) {
      console.error('Error saving chat record:', error);
      // Don't fail the request if saving fails, just log it
    }

    // Step 7: Prepare and send response
    const response: ChatResponse = {
      answer,
      references,
      chatId: chatRecord?.id || 'unknown'
    };

    res.json({
      message: 'Chat processed successfully',
      data: response
    });

  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      message: 'Internal server error during chat processing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/history
 * Get user's chat history (protected route)
 */
router.get('/history', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.user.id;

    const chatHistory = await getChatHistory(userId, limit);

    res.json({
      message: 'Chat history retrieved successfully',
      data: chatHistory.map(chat => ({
        id: chat.id,
        query: chat.query,
        answer: chat.answer,
        createdAt: chat.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/chat/history
 * Clear user's chat history (protected route)
 */
router.delete('/history', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;

    await prisma.chat.deleteMany({
      where: { userId }
    });

    res.json({ message: 'Chat history cleared successfully' });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/chat/stats
 * Get chat statistics for user (protected route)
 */
router.get('/stats', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;

    const [totalChats, totalDocuments] = await Promise.all([
      prisma.chat.count({ where: { userId } }),
      prisma.document.count({ where: { userId } })
    ]);

    const recentChats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        query: true,
        createdAt: true
      }
    });

    res.json({
      message: 'Chat statistics retrieved successfully',
      data: {
        totalChats,
        totalDocuments,
        recentChats
      }
    });

  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
