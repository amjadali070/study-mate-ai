import pdfParse from 'pdf-parse';
import { Document as DocxDocument } from 'docx';
import fs from 'fs';

/**
 * Extract text from different file types
 */
export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    switch (mimetype) {
      case 'application/pdf':
        return await extractPdfText(buffer);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractDocxText(buffer);
      
      case 'text/plain':
        return buffer.toString('utf-8');
      
      default:
        throw new Error(`Unsupported file type: ${mimetype}`);
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Failed to extract text from document');
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX buffer
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    // For DOCX, we'll need a different approach since the 'docx' library is for creating documents
    // Let's use a simpler approach with basic XML parsing for now
    const text = buffer.toString('utf-8');
    
    // Basic extraction - in production you might want to use a proper DOCX parser
    // This is a simplified version that extracts basic text content
    const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    
    if (matches) {
      return matches
        .map(match => match.replace(/<[^>]*>/g, ''))
        .join(' ')
        .trim();
    }
    
    return '';
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Split text into chunks of approximately maxTokens
 */
export function splitTextIntoChunks(text: string, maxTokens: number = 500): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    // Rough estimation: 4 characters ≈ 1 token
    const estimatedTokens = (currentChunk + trimmedSentence).length / 4;
    
    if (estimatedTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/[^\w\s.,!?-]/g, '') // Keep only alphanumeric, whitespace, and basic punctuation
    .trim();
}

/**
 * Validate file type
 */
export function isValidFileType(mimetype: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  return allowedTypes.includes(mimetype);
}

/**
 * Get file extension from mimetype
 */
export function getFileExtension(mimetype: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };
  
  return mimeToExt[mimetype] || 'unknown';
}
