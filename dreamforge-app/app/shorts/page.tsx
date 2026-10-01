'use client';

import { useState } from 'react';
import Link from 'next/link';
import SecretsLayout from '@/components/SecretsLayout';

const SERIES = [
  { title: 'Night Shift', genre: 'New', locked: false },
  { title: 'The Harbor Bar', genre: 'Romance', locked: false },
  { title: 'Glass Office', genre: 'Work', locked: true },
  { title: 'Last Train Home', genre: 'Romance', locked: true },
  { title: 'Studio Hours', genre: 'Fantasy', locked: false },
  { title: 'Sunday Kitchen', genre: 'New', locked: true },
];

const GENRES = ['All', 'New', 'Romance', 'Work', 'Fantasy'];

export default function ShortsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [genre, setGenre] = useState('All');
  const items = SERIES.filter((item) => genre === 'All' || item.genre === genre);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-1">Shorts</h1>
        <p className="text-sm text-gray-400 mb-5">Original series. Each clip is five seconds of a still.</p>
        <div className="flex gap-2 overflow-x-auto mb-5">
          {GENRES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGenre(item)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${
                genre === item ? 'bg-white text-black' : 'bg-[#1c1c1f] text-gray-300'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) =>
            item.locked ? (
              <Link key={item.title} href="/auth?redirect=/shorts" className="aspect-[3/4] rounded-2xl bg-[#1c1c1f] p-4 flex flex-col justify-end">
                <span className="text-xs text-gray-400 mb-1">{item.genre}</span>
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-[#ff4d8d] mt-2">Sign up to view</span>
              </Link>
            ) : (
              <article key={item.title} className="aspect-[3/4] rounded-2xl bg-[#241028] p-4 flex flex-col justify-end">
                <span className="text-xs text-gray-400 mb-1">{item.genre}</span>
                <span className="font-medium">{item.title}</span>
              </article>
            )
          )}
        </div>
      </div>
    </SecretsLayout>
  );
}
