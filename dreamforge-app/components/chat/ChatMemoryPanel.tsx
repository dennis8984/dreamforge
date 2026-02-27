'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserMemory } from '@/types/chat';
import ChatMemoryItem from './ChatMemoryItem';

interface ChatMemoryPanelProps {
  characterId: string;
  onClose: () => void;
}

export default function ChatMemoryPanel({ characterId, onClose }: ChatMemoryPanelProps) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/chat/memories/${characterId}`);
      if (!res.ok) throw new Error('Failed to fetch memories');
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDelete = async (memoryId: string) => {
    try {
      const res = await fetch(`/api/chat/memories/${characterId}/${memoryId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete memory');
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col shadow-xl shadow-black/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">Memories</h3>
          <span className="text-xs text-gray-500">({memories.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button
              onClick={fetchMemories}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm text-gray-500">No memories yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Memories are automatically created from conversations
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {memories.map((memory) => (
              <ChatMemoryItem
                key={memory.id}
                memory={memory}
                onDelete={() => handleDelete(memory.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
