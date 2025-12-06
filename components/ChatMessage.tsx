/**
 * Chat Message Component
 * 
 * Displays individual messages in the chat interface
 */

import React from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ url: string; title: string }>;
  prompt?: string; // The prompt sent to the model
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showPrompt, setShowPrompt] = React.useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-3xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="text-sm font-semibold mb-2">Sources:</div>
            <ul className="space-y-1">
              {message.sources.map((source, index) => (
                <li key={index} className="text-sm">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline hover:no-underline ${
                      isUser ? 'text-blue-100' : 'text-blue-600'
                    }`}
                  >
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message.prompt && !isUser && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="text-xs text-gray-500 hover:text-gray-700 mb-2"
            >
              {showPrompt ? '▼ Hide' : '▶ Show'} prompt sent to model
            </button>
            {showPrompt && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap break-words border border-gray-200">
                <div className="text-gray-600 mb-1 font-sans font-semibold">Prompt ({message.prompt.length} chars, ~{Math.round(message.prompt.length / 3)} tokens):</div>
                {message.prompt}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

