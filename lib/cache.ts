/**
 * Caching Service using IndexedDB
 * 
 * Caches search results, processed chunks, and embeddings
 * to improve performance and reduce redundant API calls.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  searchResults: {
    key: string;
    value: {
      query: string;
      results: any[];
      timestamp: number;
    };
  };
  chunks: {
    key: string;
    value: {
      url: string;
      chunks: any[];
      timestamp: number;
    };
  };
  embeddings: {
    key: string;
    value: {
      text: string;
      embedding: number[];
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<CacheDB> | null = null;

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize the IndexedDB database
 */
async function initDB(): Promise<IDBPDatabase<CacheDB>> {
  if (db) {
    return db;
  }

  db = await openDB<CacheDB>('onmyside-cache', 1, {
    upgrade(db) {
      // Search results store
      if (!db.objectStoreNames.contains('searchResults')) {
        db.createObjectStore('searchResults');
      }
      
      // Chunks store
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks');
      }
      
      // Embeddings store
      if (!db.objectStoreNames.contains('embeddings')) {
        db.createObjectStore('embeddings');
      }
    },
  });

  return db;
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(query: string): Promise<any[] | null> {
  try {
    const database = await initDB();
    const tx = database.transaction('searchResults', 'readonly');
    const store = tx.objectStore('searchResults');
    const cached = await store.get(query);

    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return cached.results;
    }

    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Cache search results
 */
export async function cacheSearchResults(query: string, results: any[]): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction('searchResults', 'readwrite');
    const store = tx.objectStore('searchResults');
    await store.put({
      query,
      results,
      timestamp: Date.now(),
    }, query); // Specify the key as the second parameter
  } catch (error) {
    console.error('Error caching search results:', error);
  }
}

/**
 * Get cached chunks for a URL
 */
export async function getCachedChunks(url: string): Promise<any[] | null> {
  try {
    const database = await initDB();
    const tx = database.transaction('chunks', 'readonly');
    const store = tx.objectStore('chunks');
    const cached = await store.get(url);

    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return cached.chunks;
    }

    return null;
  } catch (error) {
    console.error('Error reading cached chunks:', error);
    return null;
  }
}

/**
 * Cache chunks for a URL
 */
export async function cacheChunks(url: string, chunks: any[]): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction('chunks', 'readwrite');
    const store = tx.objectStore('chunks');
    await store.put({
      url,
      chunks,
      timestamp: Date.now(),
    }, url); // Specify the key as the second parameter
  } catch (error) {
    console.error('Error caching chunks:', error);
  }
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  try {
    const database = await initDB();
    const tx = database.transaction('embeddings', 'readonly');
    const store = tx.objectStore('embeddings');
    const cached = await store.get(text);

    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return cached.embedding;
    }

    return null;
  } catch (error) {
    console.error('Error reading cached embedding:', error);
    return null;
  }
}

/**
 * Cache embedding
 */
export async function cacheEmbedding(text: string, embedding: number[]): Promise<void> {
  try {
    const database = await initDB();
    const tx = database.transaction('embeddings', 'readwrite');
    const store = tx.objectStore('embeddings');
    await store.put({
      text,
      embedding,
      timestamp: Date.now(),
    }, text); // Specify the key as the second parameter
  } catch (error) {
    console.error('Error caching embedding:', error);
  }
}

/**
 * Clear all caches
 */
export async function clearCache(): Promise<void> {
  try {
    const database = await initDB();
    await Promise.all([
      database.clear('searchResults'),
      database.clear('chunks'),
      database.clear('embeddings'),
    ]);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

