import path from 'path';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
// Load env from server/.env then project root .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { VectorSearchResult } from '../types';

// Initialize Pinecone client
let pinecone: Pinecone | null = null;
let index: any = null;

export async function initializePinecone() {
  try {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is not configured');
    }

    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'rag-assist';
    index = pinecone.index(indexName);
    
    console.log('✅ Pinecone initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error);
    throw error;
  }
}

/**
 * Store embeddings in Pinecone
 */
export async function storeEmbeddings(
  embeddings: { id: string; embedding: number[]; text: string; documentId: string }[]
): Promise<void> {
  try {
    if (!index) {
      await initializePinecone();
    }

    const vectors = embeddings.map(item => ({
      id: item.id,
      values: item.embedding,
      metadata: {
        text: item.text,
        documentId: item.documentId
      }
    }));

    await index.upsert(vectors);
    console.log(`✅ Stored ${vectors.length} embeddings in Pinecone`);
  } catch (error) {
    console.error('❌ Error storing embeddings in Pinecone:', error);
    throw new Error('Failed to store embeddings');
  }
}

/**
 * Search for similar embeddings in Pinecone
 */
export async function searchSimilarEmbeddings(
  queryEmbedding: number[],
  topK: number = 5,
  userId?: string
): Promise<VectorSearchResult[]> {
  try {
    if (!index) {
      await initializePinecone();
    }

    const searchRequest: any = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false
    };

    // Add filter for userId if provided
    if (userId) {
      searchRequest.filter = {
        userId: { $eq: userId }
      };
    }

    const response = await index.query(searchRequest);

    return response.matches?.map((match: any) => ({
      id: match.id,
      text: match.metadata?.text || '',
      score: match.score || 0,
      metadata: match.metadata
    })) || [];
  } catch (error) {
    console.error('❌ Error searching embeddings in Pinecone:', error);
    throw new Error('Failed to search embeddings');
  }
}

/**
 * Delete embeddings by document ID
 */
export async function deleteEmbeddingsByDocumentId(documentId: string): Promise<void> {
  try {
    if (!index) {
      await initializePinecone();
    }

    await index.deleteMany({
      filter: {
        documentId: { $eq: documentId }
      }
    });

    console.log(`✅ Deleted embeddings for document: ${documentId}`);
  } catch (error) {
    console.error('❌ Error deleting embeddings from Pinecone:', error);
    throw new Error('Failed to delete embeddings');
  }
}

/**
 * Delete all embeddings for a user
 */
export async function deleteEmbeddingsByUserId(userId: string): Promise<void> {
  try {
    if (!index) {
      await initializePinecone();
    }

    await index.deleteMany({
      filter: {
        userId: { $eq: userId }
      }
    });

    console.log(`✅ Deleted all embeddings for user: ${userId}`);
  } catch (error) {
    console.error('❌ Error deleting user embeddings from Pinecone:', error);
    throw new Error('Failed to delete user embeddings');
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<any> {
  try {
    if (!index) {
      await initializePinecone();
    }

    const stats = await index.describeIndexStats();
    return stats;
  } catch (error) {
    console.error('❌ Error getting index stats from Pinecone:', error);
    throw new Error('Failed to get index statistics');
  }
}
