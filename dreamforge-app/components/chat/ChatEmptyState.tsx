'use client';

import { useState } from 'react';
import ChatCharacterPicker from './ChatCharacterPicker';

interface ChatEmptyStateProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function ChatEmptyState({ onToggleSidebar, sidebarOpen }: ChatEmptyStateProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Minimal top bar with sidebar toggle */}
      <div className="flex items-center px-4 py-3 border-b border-gray-700">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Empty state content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Start a Conversation
          </h2>
          <p className="text-gray-400 mb-8">
            Choose a character to chat with. Each character has a unique personality,
            memories, and conversation style.
          </p>

          <button
            onClick={() => setShowPicker(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Pick a Character
          </button>
        </div>
      </div>

      {/* Character Picker Modal */}
      {showPicker && (
        <ChatCharacterPicker onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
