/**
 * Loading Indicator Component
 * 
 * Shows processing status during query processing
 */

import React from 'react';

export interface ProcessingStatus {
  stage: 'searching' | 'fetching' | 'processing' | 'ranking' | 'generating' | 'complete';
  message: string;
}

interface LoadingIndicatorProps {
  status: ProcessingStatus;
}

export default function LoadingIndicator({ status }: LoadingIndicatorProps) {
  const getStageIcon = () => {
    switch (status.stage) {
      case 'searching':
        return '🔍';
      case 'fetching':
        return '📥';
      case 'processing':
        return '⚙️';
      case 'ranking':
        return '📊';
      case 'generating':
        return '✨';
      default:
        return '⏳';
    }
  };

  return (
    <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="animate-spin text-2xl">{getStageIcon()}</div>
      <div>
        <div className="font-medium text-blue-900">{status.message}</div>
        <div className="text-sm text-blue-700">
          {status.stage === 'searching' && 'Finding relevant web pages...'}
          {status.stage === 'fetching' && 'Downloading content...'}
          {status.stage === 'processing' && 'Extracting and organizing information...'}
          {status.stage === 'ranking' && 'Selecting most relevant content...'}
          {status.stage === 'generating' && 'AI is thinking...'}
        </div>
      </div>
    </div>
  );
}

