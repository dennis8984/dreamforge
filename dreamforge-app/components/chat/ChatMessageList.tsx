'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/chat';
import ChatMessageBubble from './ChatMessageBubble';
import ChatTypingIndicator from './ChatTypingIndicator';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  characterName?: string;
  characterAvatar?: string;
}

export default function ChatMessageList({
  messages,
  isTyping,
  characterName,
  characterAvatar,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
    >
      {/* Top spacer */}
      <div className="pt-4" />

      {messages.length === 0 && !isTyping && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">Start the conversation by sending a message</p>
        </div>
      )}

      {messages
        .filter((m) => !m.is_hidden && m.role !== 'system')
        .map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            characterName={message.role !== 'user' ? characterName : undefined}
            characterAvatar={message.role !== 'user' ? characterAvatar : undefined}
          />
        ))}

      {isTyping && (
        <ChatTypingIndicator characterName={characterName} />
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} className="pb-2" />
    </div>
  );
}
