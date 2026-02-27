'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import ChatConversationItem from './ChatConversationItem';
import ChatCharacterPicker from './ChatCharacterPicker';

interface ChatSidebarProps {
  activeId?: string;
}

export default function ChatSidebar({ activeId }: ChatSidebarProps) {
  const { conversations, setConversations } = useChatStore();
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [setConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(lower) ||
      c.character?.name?.toLowerCase().includes(lower)
    );
  });

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setShowPicker(true)}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            {search ? 'No conversations match your search.' : 'No conversations yet. Start a new chat!'}
          </div>
        ) : (
          <div className="px-2 py-1">
            {filtered.map((conversation) => (
              <ChatConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Character Picker Modal */}
      {showPicker && (
        <ChatCharacterPicker onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
