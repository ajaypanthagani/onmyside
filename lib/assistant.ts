/**
 * AI Assistant Orchestrator
 * 
 * Coordinates the entire pipeline:
 * 1. Search web for relevant content
 * 2. Fetch and process content
 * 3. Generate embeddings and rank chunks
 * 4. Generate LLM response with context
 */

import { searchWeb, SearchResult } from './search';
import { processSearchResults, ProcessedChunk, rankChunksByRelevance } from './content-processor';
import { rankChunksSemantically } from './embeddings';
import { generateResponse } from './llm';
import {
  getCachedSearchResults,
  cacheSearchResults,
  getCachedChunks,
  cacheChunks,
} from './cache';

export interface AssistantResponse {
  answer: string;
  sources: Array<{
    url: string;
    title: string;
  }>;
  prompt?: string; // The prompt sent to the model
}

export interface ProcessingStatus {
  stage: 'searching' | 'fetching' | 'processing' | 'ranking' | 'generating' | 'complete';
  message: string;
}

/**
 * Process a user query end-to-end
 * 
 * @param query - User's question
 * @param onStatusUpdate - Callback for status updates
 * @param useSemanticRanking - Whether to use embeddings for ranking (slower but more accurate)
 * @returns Assistant response with answer and sources
 */
export async function processQuery(
  query: string,
  onStatusUpdate?: (status: ProcessingStatus) => void,
  useSemanticRanking: boolean = true
): Promise<AssistantResponse> {
  try {
    // Stage 1: Search the web
    onStatusUpdate?.({
      stage: 'searching',
      message: 'Searching the web for relevant information...',
    });

    let searchResults: SearchResult[] = [];
    const cachedResults = await getCachedSearchResults(query);
    
    if (cachedResults) {
      searchResults = cachedResults;
      console.log('Using cached search results');
    } else {
      searchResults = await searchWeb(query, 5);
      await cacheSearchResults(query, searchResults);
    }

    if (searchResults.length === 0) {
      throw new Error('No search results found. Please try a different query.');
    }

    // Stage 2: Fetch and process content
    onStatusUpdate?.({
      stage: 'fetching',
      message: `Fetching content from ${searchResults.length} sources...`,
    });

    const allChunks: ProcessedChunk[] = [];
    
    // Check cache for each URL
    for (const result of searchResults) {
      const cachedChunks = await getCachedChunks(result.url);
      if (cachedChunks) {
        allChunks.push(...cachedChunks);
        console.log(`Using cached chunks for ${result.url}`);
      }
    }

    // Process uncached results
    const uncachedResults = searchResults.filter(
      result => !allChunks.some(chunk => chunk.source.url === result.url)
    );

    if (uncachedResults.length > 0) {
      onStatusUpdate?.({
        stage: 'processing',
        message: 'Processing and chunking content...',
      });

      const newChunks = await processSearchResults(uncachedResults, 3, 800);
      
      // Cache chunks by URL
      for (const result of uncachedResults) {
        const urlChunks = newChunks.filter(chunk => chunk.source.url === result.url);
        await cacheChunks(result.url, urlChunks);
      }
      
      allChunks.push(...newChunks);
    }

    if (allChunks.length === 0) {
      throw new Error('No content could be extracted from search results.');
    }

    // Stage 3: Rank chunks by relevance
    onStatusUpdate?.({
      stage: 'ranking',
      message: 'Ranking content by relevance...',
    });

    let rankedChunks: ProcessedChunk[];
    
    if (useSemanticRanking) {
      // Use semantic similarity with embeddings
      const semanticRanked = await rankChunksSemantically(
        allChunks.map(chunk => ({
          content: chunk.content,
          source: chunk.source,
        })),
        query
      );
      
      // Map back to ProcessedChunk format
      rankedChunks = semanticRanked.map(ranked => {
        const original = allChunks.find(
          chunk => chunk.content === ranked.content && chunk.source.url === ranked.source.url
        );
        return original || {
          content: ranked.content,
          source: ranked.source,
          chunkIndex: 0,
          tokenEstimate: 0,
        };
      });
    } else {
      // Use keyword-based ranking (faster)
      rankedChunks = rankChunksByRelevance(allChunks, query);
    }

    // Limit to top chunks that fit in context window
    const maxChunks = 5;
    const selectedChunks = rankedChunks.slice(0, maxChunks);

    // Stage 4: Generate response
    onStatusUpdate?.({
      stage: 'generating',
      message: 'Generating answer...',
    });

    const { answer, prompt } = await generateResponse(
      query,
      selectedChunks.map(chunk => ({
        content: chunk.content,
        source: chunk.source,
      }))
    );

    // Extract unique sources
    const sources = Array.from(
      new Map(
        selectedChunks.map(chunk => [chunk.source.url, chunk.source])
      ).values()
    );

    onStatusUpdate?.({
      stage: 'complete',
      message: 'Complete!',
    });

    return {
      answer,
      sources,
      prompt,
    };
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
}

