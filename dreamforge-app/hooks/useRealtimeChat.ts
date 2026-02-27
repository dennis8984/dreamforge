'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { subscribeToMessages, subscribeToTyping, sendTypingIndicator, unsubscribe } from '@/lib/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeChat(conversationId: string | null, userId: string | null) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef<((message: Record<string, unknown>) => void) | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    messageChannelRef.current = subscribeToMessages(conversationId, (message) => {
      onMessageRef.current?.(message);
    });

    if (userId) {
      typingChannelRef.current = subscribeToTyping(conversationId, userId, setTypingUsers);
    }

    return () => {
      unsubscribe(messageChannelRef.current);
      unsubscribe(typingChannelRef.current);
      messageChannelRef.current = null;
      typingChannelRef.current = null;
    };
  }, [conversationId, userId]);

  const setTyping = useCallback((typing: boolean) => {
    if (userId) {
      sendTypingIndicator(typingChannelRef.current, userId, typing);
    }
  }, [userId]);

  const onMessage = useCallback((handler: (message: Record<string, unknown>) => void) => {
    onMessageRef.current = handler;
  }, []);

  return { typingUsers, setTyping, onMessage };
}
