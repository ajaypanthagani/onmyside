/**
 * In-Browser Embeddings Service
 * 
 * Generates embeddings for semantic similarity search.
 * Uses a small embedding model that runs entirely in the browser.
 */

import { pipeline, env } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

// Configure Transformers.js to use remote CDN (skip local file check)
// Set localModelPath to empty string to skip local file checks
if (typeof window !== 'undefined') {
  env.localModelPath = '';
}

// Using a small, efficient embedding model
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
// Alternative: 'Xenova/bge-small-en-v1.5' (better quality, larger)

let embedder: FeatureExtractionPipeline | null = null;

/**
 * Initialize the embedding model
 */
export async function initializeEmbeddings(): Promise<void> {
  if (embedder) {
    return;
  }

  try {
    console.log('Loading embedding model...');
    embedder = await pipeline(
      'feature-extraction',
      MODEL_NAME,
      {
        quantized: true,
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            console.log(`Downloading: ${progress.file} (${Math.round(progress.progress * 100)}%)`);
          }
        },
      }
    );
    console.log('Embedding model loaded!');
  } catch (error) {
    console.error('Error loading embedding model:', error);
    throw new Error(`Failed to initialize embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding for a text
 * 
 * @param text - Text to embed
 * @returns Embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    await initializeEmbeddings();
  }

  if (!embedder) {
    throw new Error('Embedder not initialized');
  }

  try {
    const result = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract the embedding vector
    const embedding = Array.isArray(result) 
      ? Array.from(result[0]?.data || [])
      : Array.from(result?.data || []);

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Rank chunks by semantic similarity to query using embeddings
 * 
 * @param chunks - Chunks to rank
 * @param query - Query text
 * @returns Ranked chunks (most similar first)
 */
export async function rankChunksSemantically(
  chunks: Array<{ content: string; source: { url: string; title: string } }>,
  query: string
): Promise<Array<{ content: string; source: { url: string; title: string } }>> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Generate embeddings for all chunks and calculate similarities
    const chunkScores = await Promise.all(
      chunks.map(async (chunk) => {
        const chunkEmbedding = await generateEmbedding(chunk.content);
        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        return { chunk, similarity };
      })
    );

    // Sort by similarity (highest first) and return top chunks
    return chunkScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Top 5 most relevant
      .map(({ chunk }) => chunk);
  } catch (error) {
    console.error('Error in semantic ranking:', error);
    // Fallback to original order if embedding fails
    return chunks.slice(0, 5);
  }
}

