'use client';

import Link from 'next/link';

interface SecretsCompanionCardProps {
  slug: string;
  name: string;
  avatar_url?: string;
  avatar_gif_url?: string;
  location?: string;
  age?: string;
  is_new?: boolean;
  like_count?: number;
  message_count?: number;
  category?: string;
}

export default function SecretsCompanionCard({
  slug,
  name,
  avatar_url,
  avatar_gif_url,
  location,
  age,
  is_new,
  like_count = 0,
  message_count = 0,
  category,
}: SecretsCompanionCardProps) {
  return (
    <div className="group bg-gray-900/70 border border-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-purple-900/20 transition-all hover:border-purple-500/50">
      <Link href={`/character/${slug}`} className="block relative">
        <div className="relative aspect-[3/4] overflow-hidden">
          {avatar_gif_url ? (
            <img
              src={avatar_gif_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={avatar_url || `https://picsum.photos/seed/${slug}/640/480`}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {is_new && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded">
              NEW
            </span>
          )}
          {category && (
            <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-black/50 text-gray-300 rounded">
              {category}
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-white">{name}</span>
            <span className="text-xs text-emerald-400 font-medium">• Online</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            {location && <span>@{location}</span>}
            {age && <span>{age} years old</span>}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {like_count > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-pink-400">♥</span> {like_count >= 1000 ? `${(like_count / 1000).toFixed(1)}K` : like_count}
              </span>
            )}
            {message_count > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-gray-400">💬</span>{' '}
                {message_count >= 1000000
                  ? `${(message_count / 1000000).toFixed(1)}M`
                  : message_count >= 1000
                    ? `${(message_count / 1000).toFixed(1)}K`
                    : message_count}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 flex gap-2">
        <Link
          href={`/chat?character=${slug}`}
          className="flex-1 text-center py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          Chat
        </Link>
        <Link
          href={`/character/${slug}`}
          className="flex-1 text-center py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}
