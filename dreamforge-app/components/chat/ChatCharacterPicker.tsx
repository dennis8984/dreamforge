'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chat-store';

interface PickerCharacter {
  id: string;
  slug: string;
  name: string;
  description?: string;
  avatar_url?: string;
  tags?: string[];
}

interface ChatCharacterPickerProps {
  onClose: () => void;
}

export default function ChatCharacterPicker({ onClose }: ChatCharacterPickerProps) {
  const router = useRouter();
  const { addConversation } = useChatStore();
  const [characters, setCharacters] = useState<PickerCharacter[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ pageSize: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/characters?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch characters');
      const data = await res.json();
      setCharacters(data.items || []);
    } catch (err) {
      console.error('Error fetching characters:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleSelect = async (character: PickerCharacter) => {
    try {
      setCreating(character.id);
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          title: `Chat with ${character.name}`,
          content_mode: 'S1E',
        }),
      });

      if (!res.ok) throw new Error('Failed to create conversation');
      const data = await res.json();
      const conversation = data.conversation;

      // Add to store
      addConversation({
        ...conversation,
        character: {
          name: character.name,
          avatar_url: character.avatar_url,
        },
      });

      onClose();
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Choose a Character</h2>
            <p className="text-sm text-gray-400">Select a character to start chatting with</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-800">
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
              placeholder="Search characters..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Character grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {search ? 'No characters match your search.' : 'No characters available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelect(character)}
                  disabled={creating === character.id}
                  className="group flex flex-col items-center p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-blue-500/50 hover:bg-gray-800/80 transition-all text-center disabled:opacity-50"
                >
                  {/* Avatar */}
                  {character.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={character.avatar_url}
                      alt={character.name}
                      className="w-16 h-16 rounded-full object-cover mb-3 ring-2 ring-gray-700 group-hover:ring-blue-500/50 transition-all"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-3 ring-2 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                      <span className="text-white font-bold text-xl">
                        {character.name[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <h3 className="text-sm font-semibold text-white truncate w-full">
                    {character.name}
                  </h3>
                  {character.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {character.description}
                    </p>
                  )}

                  {/* Tags */}
                  {character.tags && character.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {character.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Loading indicator */}
                  {creating === character.id && (
                    <div className="mt-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
