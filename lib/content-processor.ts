/**
 * Content Processing Service
 * 
 * Processes search result snippets for LLM consumption.
 * Uses snippets directly from Google search results (no page fetching).
 */

export interface ProcessedChunk {
  content: string;
  source: {
    url: string;
    title: string;
  };
  chunkIndex: number;
  tokenEstimate: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Process search results into chunks using snippets only
 * 
 * @param searchResults - Array of search results to process
 * @param maxChunksPerSource - Maximum chunks to extract per source (usually 1 for snippets)
 * @param chunkSize - Target tokens per chunk (not used for snippets, but kept for API compatibility)
 * @returns Array of processed chunks with metadata
 */
export async function processSearchResults(
  searchResults: SearchResult[],
  maxChunksPerSource: number = 3,
  chunkSize: number = 800
): Promise<ProcessedChunk[]> {
  const allChunks: ProcessedChunk[] = [];

  // Convert each search result snippet into a chunk
  searchResults.forEach((result, index) => {
    // Clean and normalize the snippet
    const cleanSnippet = result.snippet
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (cleanSnippet.length > 0) {
      allChunks.push({
        content: cleanSnippet,
        source: {
          url: result.url,
          title: result.title,
        },
        chunkIndex: 0,
        tokenEstimate: estimateTokens(cleanSnippet),
      });
    }
  });

  return allChunks;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Rank chunks by relevance to query using simple keyword matching
 * (Can be enhanced with embeddings for semantic similarity)
 */
export function rankChunksByRelevance(
  chunks: ProcessedChunk[],
  query: string
): ProcessedChunk[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  return chunks
    .map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      const score = queryTerms.reduce((sum, term) => {
        const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
        return sum + matches;
      }, 0);
      
      return { ...chunk, relevanceScore: score };
    })
    .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
    .slice(0, 5) // Top 5 most relevant chunks
    .map(({ relevanceScore, ...chunk }) => chunk); // Remove score from output
}
