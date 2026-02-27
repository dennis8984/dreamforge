'use client';

import Link from 'next/link';

interface ConversationData {
  id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  content_mode: string;
  character?: {
    name: string;
    avatar_url?: string;
  };
}

interface ChatConversationItemProps {
  conversation: ConversationData;
  isActive: boolean;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatConversationItem({ conversation, isActive }: ChatConversationItemProps) {
  const { id, title, last_message_at, character } = conversation;

  return (
    <Link
      href={`/chat/${id}`}
      className={`
        flex items-center gap-3 px-3 py-3 rounded-lg mb-0.5 transition-colors cursor-pointer
        ${isActive
          ? 'bg-gray-700/70 border border-gray-600'
          : 'hover:bg-gray-800/70 border border-transparent'
        }
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {character?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatar_url}
            alt={character.name || 'Character'}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {(character?.name || 'C')[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">
            {character?.name || 'Unknown Character'}
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {formatTimestamp(last_message_at)}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {title || 'New conversation'}
        </p>
      </div>
    </Link>
  );
}
