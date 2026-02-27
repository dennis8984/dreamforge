'use client';

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Record<string, unknown>) => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Record<string, unknown>);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToTyping(
  conversationId: string,
  userId: string,
  onTypingChange: (users: string[]) => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typingUsers = Object.values(state)
        .flat()
        .filter((p: Record<string, unknown>) => p.typing === true)
        .map((p: Record<string, unknown>) => p.user_id as string)
        .filter((id) => id !== userId);
      onTypingChange(typingUsers);
    })
    .subscribe();

  return channel;
}

export function sendTypingIndicator(
  channel: RealtimeChannel | null,
  userId: string,
  typing: boolean
): void {
  if (!channel) return;
  channel.track({ user_id: userId, typing });
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (!channel || !supabase) return;
  supabase.removeChannel(channel);
}
