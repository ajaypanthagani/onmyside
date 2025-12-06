/**
 * In-Browser LLM Service
 * 
 * Uses Transformers.js to run a small language model entirely in the browser.
 * Supports WebGPU/WebAssembly for efficient inference.
 */

import { pipeline, env } from '@xenova/transformers';
import type { Text2TextGenerationPipeline } from '@xenova/transformers';

// Configure Transformers.js to use remote CDN (skip local file check)
// Set localModelPath to empty string to skip local file checks
if (typeof window !== 'undefined') {
  env.localModelPath = '';
}

// Model configuration - using a small, quantized model suitable for browser
// Switched to smaller model for better stability
const MODEL_NAME = 'Xenova/LaMini-Flan-T5-248M'; // Smaller, more stable
// Alternative models you can try:
// - 'Xenova/LaMini-Flan-T5-248M' (smaller, faster, more stable)
// - 'Xenova/LaMini-Flan-T5-783M' (better quality, but has tensor issues)
// - 'Xenova/Qwen2.5-0.5B-Instruct' (instruction-tuned)

let generator: Text2TextGenerationPipeline | null = null;

/**
 * Initialize the LLM pipeline
 * This loads the model into memory (first call may take time)
 */
export async function initializeLLM(): Promise<void> {
  if (generator) {
    return; // Already initialized
  }

  try {
    console.log('Loading LLM model... This may take a moment on first load.');
    console.log('Downloading from Hugging Face CDN...');
    
    generator = await pipeline(
      'text2text-generation',
      MODEL_NAME,
      {
        quantized: true, // Use quantized model for smaller size
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            console.log(`Downloading: ${progress.file} (${Math.round(progress.progress * 100)}%)`);
          }
        },
      }
    );
    console.log('LLM model loaded successfully!');
  } catch (error) {
    console.error('Error loading LLM model:', error);
    throw new Error(`Failed to initialize LLM: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`);
  }
}

/**
 * Generate a response from the LLM given a prompt and context
 * 
 * @param userQuery - The user's question
 * @param contextChunks - Array of context chunks with metadata
 * @returns Generated response text and the prompt used
 */
export async function generateResponse(
  userQuery: string,
  contextChunks: Array<{ content: string; source: { url: string; title: string } }>
): Promise<{ answer: string; prompt: string }> {
  if (!generator) {
    await initializeLLM();
  }

  if (!generator) {
    throw new Error('LLM not initialized');
  }

  // Helper function to actually generate with the prompt
  async function generateResponseWithPrompt(finalPrompt: string, chunks: Array<{ content: string; source: { url: string; title: string } }>): Promise<{ answer: string; prompt: string }> {
    // Final length check before sending to model - be VERY strict
    const promptTokens = finalPrompt.length / 3.0;
    if (promptTokens > 250) {
      console.error(`Prompt too long: ${Math.round(promptTokens)} tokens. Hard truncating to 250 token limit (750 chars).`);
      // Hard truncate to 750 chars (250 tokens * 3) - very conservative
      const hardLimit = 750;
      finalPrompt = finalPrompt.substring(0, hardLimit);
    }

    // Clean the prompt - remove any problematic characters
    finalPrompt = finalPrompt.trim().replace(/\s+/g, ' ');

    console.log(`Generating with prompt: ${finalPrompt.length} chars, ~${Math.round(finalPrompt.length / 3.0)} tokens`);

    try {
      // Use minimal, safe parameters - greedy decoding instead of sampling
      const result = await generator!(finalPrompt, {
        max_new_tokens: 64, // Very small to avoid memory issues
        num_beams: 1, // Greedy decoding (no beam search)
        do_sample: false, // Disable sampling to avoid tensor issues
      });

      console.log('LLM generation result:', result);

      // Extract the generated text
      // Text2TextGenerationPipeline returns an array or single object with 'generated_text' property
      let response = '';
      
      if (Array.isArray(result)) {
        // If array, get first element
        const firstResult = result[0];
        if (firstResult && typeof firstResult === 'object') {
          response = (firstResult as any).generated_text || '';
        } else if (typeof firstResult === 'string') {
          response = firstResult;
        }
      } else if (result && typeof result === 'object') {
        // If object, check for generated_text property
        response = (result as any).generated_text || '';
      } else if (typeof result === 'string') {
        response = result;
      }

      if (!response || response.trim().length === 0) {
        console.error('Empty or invalid response from LLM. Result:', result);
        throw new Error('LLM generated an empty response. The model may not be fully loaded or the prompt may be too long.');
      }
      
      return { answer: response.trim(), prompt: finalPrompt };
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If it's the offset error, this is a model/library bug
      // Provide a graceful fallback response
      if (errorMessage.includes('offset is out of bounds') || errorMessage.includes('RangeError')) {
        console.error('Tensor error - this appears to be a model/library issue.');
        console.error('The T5 model may have compatibility issues with transformers.js.');
        
        // Return a helpful message with the context we have
        const contextSummary = chunks.length > 0
          ? `Based on the search results, here's what I found:\n\n${chunks.slice(0, 2).map((chunk, idx) => 
              `${idx + 1}. ${chunk.source.title}: ${chunk.content.substring(0, 200)}...`
            ).join('\n\n')}`
          : '';
        
        const fallbackAnswer = `I encountered a technical issue with the AI model. ${contextSummary ? contextSummary : 'Please try rephrasing your question or refresh the page.'}\n\n(Technical note: The in-browser T5 model is experiencing tensor errors. Consider using a server-side API for more reliable results.)`;
        return { answer: fallbackAnswer, prompt: finalPrompt };
      }
      
      throw new Error(`Failed to generate response: ${errorMessage}. Please try again.`);
    }
  }

  // T5 models have a strict 512 token input limit
  // Be EXTREMELY conservative: T5 tokenizer is very aggressive with special chars and whitespace
  // Use a very conservative ratio: 1 token ≈ 3 characters for safety
  const MAX_INPUT_TOKENS = 250; // Even lower - 250 tokens max (~750 chars)
  const TOKEN_CHAR_RATIO = 3.0; // Very conservative estimate
  const MAX_INPUT_CHARS = MAX_INPUT_TOKENS * TOKEN_CHAR_RATIO; // ~750 characters max

  // Use only 1 chunk to minimize issues
  const maxChunksToUse = Math.min(contextChunks.length, 1);
  const limitedChunks = contextChunks.slice(0, maxChunksToUse);

  // Very simple prompt format
  const questionPart = userQuery.substring(0, 200); // Limit question length too
  const instructionText = `Q: ${questionPart}\nA: `;
  const instructionLength = instructionText.length;
  const availableForContext = MAX_INPUT_CHARS - instructionLength - 20; // 20 char safety buffer

  // Build context from first chunk only, very aggressively truncated
  let contextText = '';
  if (limitedChunks.length > 0 && availableForContext > 50) {
    const chunk = limitedChunks[0];
    let chunkContent = chunk.content.trim();
    if (chunkContent.length > availableForContext) {
      chunkContent = chunkContent.substring(0, availableForContext - 10) + '...';
    }
    contextText = chunkContent;
  }

  // Build simplified prompt
  const prompt = contextText 
    ? `${instructionText}Context: ${contextText}`
    : `${instructionText}`;

  // Final check
  const estimatedTokens = prompt.length / TOKEN_CHAR_RATIO;
  console.log(`Final prompt: ${prompt.length} chars, estimated ${Math.round(estimatedTokens)} tokens`);
  
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.warn(`Prompt still too long. Using question only.`);
    const questionOnlyPrompt = `Q: ${questionPart}\nA: `;
    const result = await generateResponseWithPrompt(questionOnlyPrompt, contextChunks);
    return result;
  }

  return await generateResponseWithPrompt(prompt, contextChunks);
}

/**
 * Check if the LLM is initialized
 */
export function isLLMInitialized(): boolean {
  return generator !== null;
}

