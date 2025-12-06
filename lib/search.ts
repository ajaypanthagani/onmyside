/**
 * Web Search Service
 * 
 * Uses Google Custom Search API to retrieve relevant web content.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Search the web using Google Custom Search API
 * 
 * @param query - Search query
 * @param maxResults - Maximum number of results to return
 * @returns Array of search results
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const searchEngineId = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error('Google API key and Search Engine ID must be configured. Set NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID environment variables.');
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Google Search API error: ${data.error.message}`);
    }

    return (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    }));
  } catch (error) {
    console.error('Google Search error:', error);
    throw error;
  }
}
