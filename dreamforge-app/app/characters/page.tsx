'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CharacterCard from '@/components/CharacterCard';

interface Character {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string;
  category?: string;
  personality_traits?: string[];
  fan_count?: number;
  is_featured?: boolean;
  is_trending?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'friend', label: 'Friend' },
  { id: 'mentor', label: 'Mentor' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'sci_fi', label: 'Sci-Fi' },
  { id: 'adventure', label: 'Adventure' },
];

export default function CharactersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsAuthenticated(true);
    load(1, search, activeCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (p = page, s = search, category = activeCategory) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (s) params.set('search', s);
    if (category && category !== 'all') params.set('category', category);
    const res = await fetch(`/api/characters?${params.toString()}`);
    const data = await res.json();
    setCharacters(data.items || []);
    setTotal(data.total || 0);
    setPage(data.page || p);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    load(1, search, cat);
  };

  const featured = characters.filter(c => c.is_featured);
  const trending = characters.filter(c => c.is_trending);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier} />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">AI Companions</h1>
          <p className="text-gray-400">Chat, create, and connect with AI characters</p>
        </div>

        {/* Search + Categories */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1, search, activeCategory)}
              placeholder="Search characters..."
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 w-64"
            />
            <button onClick={() => load(1, search, activeCategory)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Search
            </button>
          </div>
        </div>

        {/* Featured Section */}
        {featured.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">&#9733;</span> Featured
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((c) => (
                <CharacterCard
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  avatar_url={c.avatar_url}
                  category={c.category}
                  personality_traits={c.personality_traits}
                  fan_count={c.fan_count}
                />
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        {trending.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-orange-400">&#128293;</span> Trending
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trending.map((c) => (
                <CharacterCard
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  avatar_url={c.avatar_url}
                  category={c.category}
                  personality_traits={c.personality_traits}
                  fan_count={c.fan_count}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Characters */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">All Characters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                slug={c.slug}
                name={c.name}
                avatar_url={c.avatar_url}
                category={c.category}
                personality_traits={c.personality_traits}
                fan_count={c.fan_count}
              />
            ))}
          </div>
          {characters.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No characters found. Try a different search or category.
            </div>
          )}
          <div className="flex items-center justify-between mt-6 text-gray-300">
            <div>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 rounded bg-gray-800 disabled:opacity-50">Prev</button>
              <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => load(page + 1)} className="px-3 py-1.5 rounded bg-gray-800 disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
