'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import type { ContentMode, ChatMessage, RateLimitStatus, SendMessageResponse } from '@/types/chat';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import ChatEmptyState from './ChatEmptyState';
import ChatRateLimitBanner from './ChatRateLimitBanner';

interface ChatWindowProps {
  conversationId?: string;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

interface ConversationMeta {
  id: string;
  character_id: string;
  content_mode: ContentMode;
  is_group: boolean;
  character?: {
    name: string;
    avatar_url?: string;
  };
  participants?: Array<{
    character_id: string;
    character?: { name: string; avatar_url?: string };
  }>;
}

export default function ChatWindow({
  conversationId,
  onToggleSidebar,
  sidebarOpen,
}: ChatWindowProps) {
  const {
    messages,
    isTyping,
    isSending,
    setMessages,
    addMessage,
    setTyping,
    setSending,
    setActiveConversation,
  } = useChatStore();

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState('free');

  // Fetch user tier
  useEffect(() => {
    const fetchTier = async () => {
      try {
        const res = await fetch('/api/membership');
        if (res.ok) {
          const data = await res.json();
          setUserTier(data.tier || 'free');
        }
      } catch {
        // Default to free
      }
    };
    fetchTier();
  }, []);

  // Fetch conversation data
  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      setActiveConversation(conversationId);

      // Fetch conversation metadata
      const metaRes = await fetch(`/api/chat/conversations/${conversationId}`);
      if (!metaRes.ok) throw new Error('Failed to load conversation');
      const metaData = await metaRes.json();
      setMeta(metaData.conversation || metaData);

      // Fetch messages
      const msgsRes = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      if (!msgsRes.ok) throw new Error('Failed to load messages');
      const msgsData = await msgsRes.json();
      setMessages(conversationId, msgsData.messages || []);

      // Fetch rate limit status
      const rlRes = await fetch('/api/chat/rate-limit');
      if (rlRes.ok) {
        const rlData = await rlRes.json();
        setRateLimit(rlData);
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId, setActiveConversation, setMessages]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Send message handler
  const handleSend = useCallback(async (content: string, contentMode?: ContentMode) => {
    if (!conversationId || !meta) return;

    try {
      setSending(true);
      setTyping(false);
      setError(null);

      // Optimistically add user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        content_mode: contentMode || meta.content_mode || 'S1E',
        sequence_number: (messages[conversationId]?.length || 0) + 1,
        token_count: 0,
        metadata: {},
        is_hidden: false,
        created_at: new Date().toISOString(),
      };
      addMessage(conversationId, tempUserMsg);

      // Show typing indicator
      setTyping(true);

      // Send to API
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          content_mode: contentMode || meta.content_mode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      const data: SendMessageResponse = await res.json();

      // Replace temp message with real user message and add assistant response
      const currentMsgs = useChatStore.getState().messages[conversationId] || [];
      const updatedMsgs = currentMsgs
        .filter((m) => m.id !== tempUserMsg.id)
        .concat([data.userMessage, data.assistantMessage]);
      setMessages(conversationId, updatedMsgs);

      // Update rate limit
      if (data.rateLimit) {
        setRateLimit(data.rateLimit);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');

      // Remove optimistic message on error
      const currentMsgs = useChatStore.getState().messages[conversationId] || [];
      setMessages(
        conversationId,
        currentMsgs.filter((m) => !m.id.startsWith('temp-'))
      );
    } finally {
      setSending(false);
      setTyping(false);
    }
  }, [conversationId, meta, messages, addMessage, setMessages, setSending, setTyping]);

  // No active conversation
  if (!conversationId) {
    return <ChatEmptyState onToggleSidebar={onToggleSidebar} sidebarOpen={sidebarOpen} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        <div className="flex items-center px-4 py-3 border-b border-gray-700">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  const conversationMessages = messages[conversationId] || [];
  const isRateLimited = rateLimit && rateLimit.limit !== -1 && rateLimit.remaining <= 0;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <ChatHeader
        characterName={meta?.character?.name}
        characterAvatar={meta?.character?.avatar_url}
        characterId={meta?.character_id}
        conversationId={conversationId}
        contentMode={meta?.content_mode}
        isGroup={meta?.is_group}
        participantCount={meta?.participants?.length || 1}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      {/* Rate limit banner */}
      {rateLimit && rateLimit.limit !== -1 && (
        <ChatRateLimitBanner rateLimit={rateLimit} />
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800/50">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </p>
        </div>
      )}

      {/* Messages */}
      <ChatMessageList
        messages={conversationMessages}
        isTyping={isTyping}
        characterName={meta?.character?.name}
        characterAvatar={meta?.character?.avatar_url}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={!!isRateLimited}
        isSending={isSending}
        currentMode={meta?.content_mode || 'S1E'}
        userTier={userTier}
      />
    </div>
  );
}
