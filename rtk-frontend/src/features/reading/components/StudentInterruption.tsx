/**
 * Student Interruption Component
 *
 * Provides the UI for students to:
 * - Ask questions during reading
 * - View LLM responses
 * - Resume reading when ready
 */

import React, { useState } from 'react';
import type { InterruptionState } from '../websocket/types';

interface StudentInterruptionProps {
  interruption: InterruptionState;
  isConnected: boolean;
  onAskQuestion: (question: string) => Promise<void>;
  onResume: (understood?: boolean, helpful?: boolean) => void;
  onRepeat: (fromWordIndex: number) => void;
  className?: string;
}

export function StudentInterruption({
  interruption,
  isConnected,
  onAskQuestion,
  onResume,
  onRepeat,
  className = '',
}: StudentInterruptionProps): React.JSX.Element {
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAskQuestion = async (): Promise<void> => {
    if (!questionInput.trim() || isAsking) return;

    setIsAsking(true);
    try {
      await onAskQuestion(questionInput);
      setQuestionInput('');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send question:', error);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  // If no interruption is active, show the question button
  if (!interruption.isActive) {
    return (
      <div className={`student-interruption ${className}`}>
        <button
          onClick={() => setQuestionInput('?')}
          disabled={!isConnected}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     transition-colors font-medium shadow-lg"
          title={!isConnected ? 'Connecting to server...' : 'Ask a question'}
        >
          🤚 I have a question!
        </button>

        {questionInput && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
            <textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAskQuestion}
                disabled={!questionInput.trim() || isAsking}
                className="px-4 py-2 bg-blue-600 text-white rounded-md
                         hover:bg-blue-700 disabled:bg-gray-400
                         disabled:cursor-not-allowed transition-colors"
              >
                {isAsking ? 'Sending...' : 'Send Question'}
              </button>
              <button
                onClick={() => setQuestionInput('')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md
                         hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show interruption interface
  return (
    <div className={`student-interruption active ${className}`}>
      <div className="p-6 bg-white rounded-lg shadow-xl border border-gray-200">
        {/* Question Display */}
        {interruption.question && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Your Question:</h3>
            <p className="text-lg text-gray-800">{interruption.question}</p>
          </div>
        )}

        {/* Processing State */}
        {interruption.isProcessing && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Thinking about your question...</p>
            </div>
          </div>
        )}

        {/* Response Display */}
        {interruption.response && !interruption.isProcessing && (
          <div className="space-y-4">
            <div className="prose max-w-none">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {interruption.response.responseText}
                </p>
              </div>

              {/* Structured Data Display */}
              {interruption.response.structuredData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  {interruption.response.structuredData.definition && (
                    <div className="mb-3">
                      <span className="font-semibold">Definition: </span>
                      <span>{interruption.response.structuredData.definition}</span>
                    </div>
                  )}

                  {interruption.response.structuredData.examples && (
                    <div>
                      <p className="font-semibold mb-1">Examples:</p>
                      <ul className="list-disc list-inside">
                        {interruption.response.structuredData.examples.map((example, i) => (
                          <li key={i} className="text-gray-700">{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => onResume(true, true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 transition-colors font-medium"
              >
                ✓ Got it! Continue reading
              </button>

              {interruption.pausedAtWordIndex !== undefined && (
                <button
                  onClick={() => onRepeat(Math.max(0, interruption.pausedAtWordIndex - 10))}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors font-medium"
                >
                  🔄 Repeat last sentence
                </button>
              )}

              {interruption.response.suggestions?.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (suggestion.action === 'continue') {
                      onResume(true);
                    } else if (suggestion.action === 'repeat' && interruption.pausedAtWordIndex) {
                      onRepeat(interruption.pausedAtWordIndex);
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg
                           hover:bg-gray-300 transition-colors"
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {interruption.error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-800">{interruption.error.userMessage}</p>
            <button
              onClick={() => {
                if (interruption.error?.fallbackAction === 'continue') {
                  onResume(false);
                }
              }}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md
                       hover:bg-red-700 transition-colors"
            >
              Continue Reading
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
