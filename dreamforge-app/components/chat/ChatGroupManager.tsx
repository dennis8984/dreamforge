'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatGroupAvatarStack from './ChatGroupAvatarStack';

interface Participant {
  id: string;
  character_id: string;
  is_active: boolean;
  character?: {
    name: string;
    avatar_url?: string;
  };
}

interface SearchCharacter {
  id: string;
  name: string;
  avatar_url?: string;
}

interface ChatGroupManagerProps {
  conversationId: string;
  onClose: () => void;
}

export default function ChatGroupManager({ conversationId, onClose }: ChatGroupManagerProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchResults, setSearchResults] = useState<SearchCharacter[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/conversations/${conversationId}/participants`);
      if (!res.ok) throw new Error('Failed to fetch participants');
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Search characters to add
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search, pageSize: '10' });
        const res = await fetch(`/api/characters?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        // Filter out already-participating characters
        const participantIds = new Set(participants.map((p) => p.character_id));
        setSearchResults(
          (data.items || []).filter((c: SearchCharacter) => !participantIds.has(c.id))
        );
      } catch {
        // Ignore search errors
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, participants]);

  const handleAdd = async (character: SearchCharacter) => {
    try {
      setAdding(character.id);
      const res = await fetch(`/api/chat/conversations/${conversationId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: character.id }),
      });

      if (!res.ok) throw new Error('Failed to add participant');
      const data = await res.json();

      setParticipants((prev) => [
        ...prev,
        {
          ...data.participant,
          character: { name: character.name, avatar_url: character.avatar_url },
        },
      ]);
      setSearch('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding participant:', err);
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (participantId: string) => {
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}/participants/${participantId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to remove participant');
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    } catch (err) {
      console.error('Error removing participant:', err);
    }
  };

  const avatars = participants
    .filter((p) => p.is_active)
    .map((p) => ({
      name: p.character?.name || 'Unknown',
      avatar_url: p.character?.avatar_url,
    }));

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col shadow-xl shadow-black/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">Group Chat</h3>
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

      {/* Avatar stack preview */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
        <ChatGroupAvatarStack avatars={avatars} maxVisible={3} />
        <span className="text-sm text-gray-400">
          {participants.filter((p) => p.is_active).length} participant{participants.filter((p) => p.is_active).length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search to add */}
      <div className="px-4 py-3 border-b border-gray-800">
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
            placeholder="Search characters to add..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            {searchResults.map((character) => (
              <button
                key={character.id}
                onClick={() => handleAdd(character)}
                disabled={adding === character.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {character.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.avatar_url}
                    alt={character.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {character.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-200 flex-1 text-left">{character.name}</span>
                {adding === character.id ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current participants */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1">
          Current Participants
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {participants
              .filter((p) => p.is_active)
              .map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-gray-800/50"
                >
                  {participant.character?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={participant.character.avatar_url}
                      alt={participant.character.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {(participant.character?.name || 'C')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-gray-200 flex-1">
                    {participant.character?.name || 'Unknown'}
                  </span>
                  <button
                    onClick={() => handleRemove(participant.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all text-gray-500 hover:text-red-400"
                    title="Remove from group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
