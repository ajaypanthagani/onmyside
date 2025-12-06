/**
 * Chat Interface Component
 * 
 * Main chat UI with message history and input
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage, { Message } from './ChatMessage';
import LoadingIndicator, { ProcessingStatus } from './LoadingIndicator';
import { processQuery, AssistantResponse } from '@/lib/assistant';
import { initializeLLM } from '@/lib/llm';
import { initializeEmbeddings } from '@/lib/embeddings';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize models on mount
  useEffect(() => {
    async function initialize() {
      try {
        setIsInitializing(true);
        setInitError(null);
        
        // Add timeout to detect if models are stuck loading
        const timeout = setTimeout(() => {
          console.warn('Model loading is taking longer than expected...');
        }, 60000); // Warn after 60 seconds (models can be large)
        
        // Initialize embedding model first (smaller, faster)
        console.log('Step 1/2: Loading embedding model...');
        await initializeEmbeddings();
        console.log('Embedding model loaded!');
        
        // Then initialize LLM (larger, takes longer)
        console.log('Step 2/2: Loading LLM model (this may take a few minutes on first load)...');
        await initializeLLM();
        console.log('LLM model loaded!');
        
        clearTimeout(timeout);
        setIsInitializing(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setInitError(`Failed to initialize AI models: ${error instanceof Error ? error.message : 'Unknown error'}. Please refresh the page.`);
        setIsInitializing(false);
      }
    }

    initialize();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading || isInitializing) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStatus({
      stage: 'searching',
      message: 'Starting...',
    });

    try {
      const response: AssistantResponse = await processQuery(
        userMessage.content,
        (status) => setStatus(status),
        true // Use semantic ranking
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        prompt: response.prompt,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStatus(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🤖</div>
          <div className="text-xl font-semibold">Loading AI models...</div>
          <div className="text-sm text-gray-600 mt-2">
            This may take a minute on first load. Models are being downloaded and initialized.
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl font-semibold text-red-600 mb-2">Initialization Error</div>
          <div className="text-gray-700">{initError}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">OnMySide</h1>
        <p className="text-sm text-gray-600 mt-1">
          AI assistant that runs entirely in your browser with web search capabilities
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="text-center mt-12 text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <div className="text-xl font-semibold mb-2">Start a conversation</div>
            <div className="text-sm">Ask me anything and I&apos;ll search the web for answers!</div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && status && (
          <div className="mb-4">
            <LoadingIndicator status={status} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isInitializing}
          />
          <button
            type="submit"
            disabled={isLoading || isInitializing || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

