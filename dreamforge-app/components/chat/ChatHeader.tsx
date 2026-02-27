'use client';

import { useState } from 'react';
import { CONTENT_MODES } from '@/lib/content-modes';
import type { ContentMode } from '@/types/chat';
import ChatMemoryPanel from './ChatMemoryPanel';
import ChatGroupManager from './ChatGroupManager';

interface ChatHeaderProps {
  characterName?: string;
  characterAvatar?: string;
  characterId?: string;
  conversationId?: string;
  contentMode?: ContentMode;
  isGroup?: boolean;
  participantCount?: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function ChatHeader({
  characterName,
  characterAvatar,
  characterId,
  conversationId,
  contentMode = 'S1E',
  isGroup = false,
  participantCount = 1,
  sidebarOpen,
  onToggleSidebar,
}: ChatHeaderProps) {
  const [showMemory, setShowMemory] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const mode = CONTENT_MODES[contentMode];

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
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

          {/* Character info */}
          <div className="flex items-center gap-3">
            {characterAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={characterAvatar}
                alt={characterName || 'Character'}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : characterName ? (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {characterName[0].toUpperCase()}
                </span>
              </div>
            ) : null}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  {characterName || 'Chat'}
                </h2>
                {isGroup && (
                  <span className="text-xs text-gray-500">
                    ({participantCount} participants)
                  </span>
                )}
              </div>
              {/* Content mode badge */}
              <span className={`inline-flex items-center gap-1 text-xs ${mode.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mode.bgColor.replace('/10', '')}`} />
                {mode.label} mode
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Memory panel toggle */}
          {characterId && (
            <button
              onClick={() => setShowMemory(!showMemory)}
              className={`
                p-2 rounded-lg transition-colors
                ${showMemory ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
              `}
              title="Memories"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          )}

          {/* Group manager toggle */}
          {conversationId && (
            <button
              onClick={() => setShowGroup(!showGroup)}
              className={`
                p-2 rounded-lg transition-colors
                ${showGroup ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
              `}
              title="Group Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Slide-out Memory Panel */}
      {showMemory && characterId && (
        <ChatMemoryPanel
          characterId={characterId}
          onClose={() => setShowMemory(false)}
        />
      )}

      {/* Slide-out Group Manager */}
      {showGroup && conversationId && (
        <ChatGroupManager
          conversationId={conversationId}
          onClose={() => setShowGroup(false)}
        />
      )}
    </>
  );
}
