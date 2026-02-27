'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ContentMode } from '@/types/chat';
import ChatContentModeSelector from './ChatContentModeSelector';

interface ChatInputProps {
  onSend: (content: string, contentMode?: ContentMode) => void;
  disabled?: boolean;
  isSending?: boolean;
  currentMode?: ContentMode;
  userTier?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  isSending = false,
  currentMode = 'S1E',
  userTier = 'free',
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [contentMode, setContentMode] = useState<ContentMode>(currentMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled || isSending) return;
    onSend(trimmed, contentMode);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, contentMode, disabled, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-900 p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Content Mode Selector */}
        <ChatContentModeSelector
          value={contentMode}
          onChange={setContentMode}
          userTier={userTier}
        />

        {/* Input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            disabled={disabled || isSending}
            rows={1}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled || isSending}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center mt-2">
        Press Enter to send, Shift+Enter for a new line
      </p>
    </div>
  );
}
