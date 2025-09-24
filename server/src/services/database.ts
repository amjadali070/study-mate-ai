import { prisma } from '../index';
import { VectorSearchResult } from '../types';

/**
 * Store embeddings in PostgreSQL (alternative to Pinecone)
 */
export async function storeEmbeddingsInDB(
  embeddings: { id: string; embedding: number[]; text: string; documentId: string }[]
): Promise<void> {
  try {
    const chunks = embeddings.map(item => ({
      id: item.id,
      documentId: item.documentId,
      text: item.text,
      embedding: item.embedding
    }));

    await prisma.chunk.createMany({
      data: chunks,
    });

    console.log(`✅ Stored ${chunks.length} embeddings in database`);
  } catch (error) {
    console.error('❌ Error storing embeddings in database:', error);
    throw new Error('Failed to store embeddings in database');
  }
}

/**
 * Search for similar embeddings using cosine similarity (PostgreSQL)
 */
export async function searchSimilarEmbeddingsInDB(
  queryEmbedding: number[],
  topK: number = 5,
  userId?: string
): Promise<VectorSearchResult[]> {
  try {
    // For now, we'll use a simple approach without pgvector
    // In a production environment, you'd want to use pgvector extension
    
    let whereClause = '';
    if (userId) {
      whereClause = `
        WHERE d."userId" = $2
      `;
    }

    // Simple cosine similarity calculation
    // Note: This is not optimal for large datasets - pgvector would be better
    const query = `
      SELECT 
        c.id,
        c.text,
        c.embedding,
        c."documentId",
        d.name as "documentName",
        (
          -- Cosine similarity calculation
          (
            SELECT SUM(a.value * b.value)
            FROM unnest($1::float[]) WITH ORDINALITY AS a(value, idx)
            JOIN unnest(c.embedding) WITH ORDINALITY AS b(value, idx) ON a.idx = b.idx
          ) / (
            sqrt((SELECT SUM(power(value, 2)) FROM unnest($1::float[])))
            * 
            sqrt((SELECT SUM(power(value, 2)) FROM unnest(c.embedding)))
          )
        ) as similarity
      FROM chunks c
      JOIN documents d ON c."documentId" = d.id
      ${whereClause}
      ORDER BY similarity DESC
      LIMIT $${userId ? '3' : '2'}
    `;

    const params = userId ? [queryEmbedding, userId, topK] : [queryEmbedding, topK];
    
    const results = await prisma.$queryRawUnsafe(query, ...params) as any[];

    return results.map(row => ({
      id: row.id,
      text: row.text,
      score: row.similarity || 0,
      metadata: {
        documentId: row.documentId,
        documentName: row.documentName
      }
    }));
  } catch (error) {
    console.error('❌ Error searching embeddings in database:', error);
    throw new Error('Failed to search embeddings in database');
  }
}

/**
 * Delete embeddings by document ID from database
 */
export async function deleteEmbeddingsByDocumentIdInDB(documentId: string): Promise<void> {
  try {
    await prisma.chunk.deleteMany({
      where: { documentId }
    });

    console.log(`✅ Deleted embeddings for document: ${documentId}`);
  } catch (error) {
    console.error('❌ Error deleting embeddings from database:', error);
    throw new Error('Failed to delete embeddings from database');
  }
}

/**
 * Get chunks by document ID
 */
export async function getChunksByDocumentId(documentId: string): Promise<any[]> {
  try {
    const chunks = await prisma.chunk.findMany({
      where: { documentId },
      select: {
        id: true,
        text: true,
        document: {
          select: {
            name: true
          }
        }
      }
    });

    return chunks;
  } catch (error) {
    console.error('❌ Error fetching chunks:', error);
    throw new Error('Failed to fetch chunks');
  }
}

/**
 * Get user's documents
 */
export async function getUserDocuments(userId: string): Promise<any[]> {
  try {
    const documents = await prisma.document.findMany({
      where: { userId },
      include: {
        _count: {
          select: { chunks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  } catch (error) {
    console.error('❌ Error fetching user documents:', error);
    throw new Error('Failed to fetch user documents');
  }
}

/**
 * Create new document record
 */
export async function createDocument(userId: string, name: string): Promise<any> {
  try {
    const document = await prisma.document.create({
      data: { userId, name }
    });

    return document;
  } catch (error) {
    console.error('❌ Error creating document:', error);
    throw new Error('Failed to create document');
  }
}

/**
 * Create new chat record
 */
export async function createChatRecord(
  userId: string,
  query: string,
  answer: string
): Promise<any> {
  try {
    const chat = await prisma.chat.create({
      data: { userId, query, answer }
    });

    return chat;
  } catch (error) {
    console.error('❌ Error creating chat record:', error);
    throw new Error('Failed to create chat record');
  }
}

/**
 * Get user's chat history
 */
export async function getChatHistory(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return chats;
  } catch (error) {
    console.error('❌ Error fetching chat history:', error);
    throw new Error('Failed to fetch chat history');
  }
}
