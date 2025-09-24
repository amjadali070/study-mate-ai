import path from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Ensure environment variables are loaded regardless of working directory
// 1) Load from server/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// 2) Fallback: load from project root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { EmbeddingResponse } from '../types';

// Configurable model names with sensible defaults
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic backoff util that respects 429 responses
async function withRetries<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number }
): Promise<T> {
  const maxRetries = options?.retries ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 500;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const code = err?.code || err?.error?.code || err?.response?.data?.error?.code;
      const message: string = err?.message || err?.error?.message || 'Unknown error';

      // If it's clearly an account quota issue, do not retry
      if (code === 'insufficient_quota' || /quota/i.test(message)) {
        const e = new Error('OpenAI quota exceeded');
        (e as any).status = 429;
        (e as any).code = 'insufficient_quota';
        throw e;
      }

      // Retry on generic 429 rate limiting
      if (status === 429 && attempt < maxRetries) {
        const retryAfterHeader = err?.headers?.['retry-after'] || err?.response?.headers?.['retry-after'];
        const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : null;
        const delay = retryAfterSec && !Number.isNaN(retryAfterSec)
          ? retryAfterSec * 1000
          : baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        attempt += 1;
        continue;
      }

      // Retry on transient 5xx errors
      if (status >= 500 && status < 600 && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        attempt += 1;
        continue;
      }

      throw err;
    }
  }
}

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  try {
    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    const response = await withRetries(() =>
      openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      })
    );

    const embedding = response.data[0].embedding;
    const tokens = response.usage?.total_tokens ?? 0;

    return { embedding, tokens };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error((error as any)?.message || 'Failed to generate embedding');
  }
}

/**
 * Generate multiple embeddings for an array of texts
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
  try {
    if (!texts.length) {
      return [];
    }

    const validTexts = texts.filter(text => text.trim().length > 0);
    if (!validTexts.length) {
      return [];
    }

    const response = await withRetries(() =>
      openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: validTexts,
      })
    );

    const totalTokens = response.usage?.total_tokens ?? 0;
    const perTextTokens = validTexts.length > 0 ? Math.round(totalTokens / validTexts.length) : 0;

    return response.data.map(item => ({
      embedding: item.embedding,
      tokens: perTextTokens
    }));
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error((error as any)?.message || 'Failed to generate embeddings');
  }
}

/**
 * Generate chat completion using OpenAI
 */
export async function generateChatCompletion(
  systemPrompt: string,
  userQuery: string,
  context?: string
): Promise<string> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (context) {
      messages.push({
        role: 'user',
        content: `Context information:\n${context}\n\nQuestion: ${userQuery}`
      });
    } else {
      messages.push({ role: 'user', content: userQuery });
    }

    const response = await withRetries(() =>
      openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response generated');
    }

    return content.trim();
  } catch (error) {
    console.error('Error generating chat completion:', error);
    throw new Error((error as any)?.message || 'Failed to generate response');
  }
}

/**
 * Generate quiz questions using OpenAI
 */
export async function generateQuizQuestions(
  context: string,
  numQuestions: number = 5
): Promise<any> {
  try {
    const prompt = `Based on the following text content, create ${numQuestions} multiple-choice questions. 
Each question should have 4 options (A, B, C, D) with only one correct answer.
Include explanations for the correct answers.

Format the response as a JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation for why this answer is correct"
  }
]

Content:
${context}

Make sure the questions test understanding of key concepts from the content. Return only the JSON array, no additional text.`;

    const response = await withRetries(() =>
      openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No quiz questions generated');
    }

    try {
      return JSON.parse(content.trim());
    } catch (parseError) {
      console.error('Error parsing quiz JSON:', parseError);
      throw new Error('Failed to parse quiz questions');
    }
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error((error as any)?.message || 'Failed to generate quiz questions');
  }
}
