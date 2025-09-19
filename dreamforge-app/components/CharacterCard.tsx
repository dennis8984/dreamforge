'use client';

import Link from 'next/link';

interface CharacterCardProps {
  slug: string;
  name: string;
  avatar_url?: string;
  created_by?: string;
}

export default function CharacterCard({ slug, name, avatar_url, created_by }: CharacterCardProps) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-blue-900/30 transition-all">
      <Link href={`/character/${slug}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar_url || 'https://picsum.photos/seed/' + slug + '/640/480'}
          alt={name}
          className="w-full h-48 object-cover"
        />
      </Link>
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="text-white font-semibold leading-tight">{name}</div>
          {created_by && <div className="text-gray-400 text-xs">Created by {created_by}</div>}
        </div>
        <Link
          href={`/admin/character?create=${slug}`}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm"
        >
          Create
        </Link>
      </div>
    </div>
  );
}


