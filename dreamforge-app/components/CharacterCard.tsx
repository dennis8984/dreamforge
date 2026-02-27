'use client';

import Link from 'next/link';

interface CharacterCardProps {
  slug: string;
  name: string;
  avatar_url?: string;
  created_by?: string;
  category?: string;
  personality_traits?: string[];
  fan_count?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  romantic: 'bg-pink-500/20 text-pink-300',
  friend: 'bg-blue-500/20 text-blue-300',
  mentor: 'bg-amber-500/20 text-amber-300',
  fantasy: 'bg-purple-500/20 text-purple-300',
  sci_fi: 'bg-cyan-500/20 text-cyan-300',
  adventure: 'bg-green-500/20 text-green-300',
};

export default function CharacterCard({ slug, name, avatar_url, created_by, category, personality_traits, fan_count }: CharacterCardProps) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-blue-900/30 transition-all">
      <Link href={`/character/${slug}`} className="block relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar_url || 'https://picsum.photos/seed/' + slug + '/640/480'}
          alt={name}
          className="w-full h-48 object-cover"
        />
        {category && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[category] || 'bg-gray-500/20 text-gray-300'}`}>
            {category}
          </span>
        )}
        {fan_count !== undefined && fan_count > 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs">
            {fan_count.toLocaleString()} fans
          </span>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-white font-semibold leading-tight">{name}</div>
            {created_by && <div className="text-gray-400 text-xs">Created by {created_by}</div>}
          </div>
        </div>
        {personality_traits && personality_traits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {personality_traits.slice(0, 3).map((trait) => (
              <span key={trait} className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-xs">{trait}</span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Link
            href={`/chat?character=${slug}`}
            className="flex-1 text-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm"
          >
            Chat
          </Link>
          <Link
            href={`/character/${slug}`}
            className="flex-1 text-center px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 text-sm"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
