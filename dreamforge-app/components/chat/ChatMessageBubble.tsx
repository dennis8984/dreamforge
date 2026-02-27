'use client';

import { useState } from 'react';
import type { ChatMessage } from '@/types/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  characterName?: string;
  characterAvatar?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ChatMessageBubble({ message, characterName, characterAvatar }: ChatMessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === 'user';
  const isNarrator = message.role === 'narrator';

  if (isNarrator) {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="bg-gray-800/50 rounded-lg px-4 py-2 max-w-lg text-center">
          <p className="text-sm text-gray-400 italic">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex px-4 py-1 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <div className={`flex items-end gap-2 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar (assistant only) */}
        {!isUser && (
          <div className="flex-shrink-0 mb-1">
            {characterAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={characterAvatar}
                alt={characterName || 'Character'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-xs">
                  {(characterName || 'C')[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className="flex flex-col gap-0.5">
          {/* Character name for assistant messages */}
          {!isUser && characterName && (
            <span className="text-xs text-gray-500 ml-1">{characterName}</span>
          )}

          <div
            className={`
              rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap
              ${isUser
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }
            `}
          >
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>

          {/* Timestamp on hover */}
          <div
            className={`
              text-xs text-gray-500 transition-opacity duration-200
              ${showTimestamp ? 'opacity-100' : 'opacity-0'}
              ${isUser ? 'text-right mr-1' : 'text-left ml-1'}
            `}
          >
            {formatTime(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
