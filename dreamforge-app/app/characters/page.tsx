'use client';

import { useEffect, useState } from 'react';
import SecretsLayout from '@/components/SecretsLayout';
import SecretsCompanionCard from '@/components/SecretsCompanionCard';
import { supabase } from '@/lib/supabase';

interface Character {
  id: string;
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
  const [userTier, setUserTier] = useState('free');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } else if (localStorage.getItem('access_token')) {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
    load(1, search, activeCategory);
  }, []);

  const load = async (p = page, s = search, category = activeCategory) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (s) params.set('search', s);
    if (category && category !== 'all') params.set('category', category);
    try {
      const res = await fetch(`/api/characters?${params.toString()}`);
      const data = await res.json();
      setCharacters(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch {
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    load(1, search, cat);
  };

  const featured = characters.filter((c) => c.is_featured);
  const trending = characters.filter((c) => c.is_trending);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Featured Companions</h1>
            <p className="text-gray-400">Meet some of our most popular companions.</p>
          </div>

          {/* Filters - Secrets.ai style */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 w-full">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(1, search, activeCategory)}
                placeholder="Search characters..."
                className="px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-200 w-full sm:w-64 placeholder-gray-500"
              />
              <button
                onClick={() => load(1, search, activeCategory)}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 font-medium"
              >
                Search
              </button>
            </div>
          </div>

          {featured.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">★</span> Featured
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {featured.map((c) => (
                  <SecretsCompanionCard
                    key={c.id}
                    slug={c.slug}
                    name={c.name}
                    avatar_url={c.avatar_url}
                    avatar_gif_url={c.avatar_gif_url}
                    location={c.location}
                    age={c.age}
                    is_new={c.is_new}
                    like_count={c.like_count}
                    message_count={c.message_count}
                    category={c.category}
                  />
                ))}
              </div>
            </section>
          )}

          {trending.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-orange-400">🔥</span> Trending
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {trending.map((c) => (
                  <SecretsCompanionCard
                    key={c.id}
                    slug={c.slug}
                    name={c.name}
                    avatar_url={c.avatar_url}
                    avatar_gif_url={c.avatar_gif_url}
                    location={c.location}
                    age={c.age}
                    is_new={c.is_new}
                    like_count={c.like_count}
                    message_count={c.message_count}
                    category={c.category}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold text-white mb-4">All Companions</h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-gray-800/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {characters.map((c) => (
                  <SecretsCompanionCard
                    key={c.id}
                    slug={c.slug}
                    name={c.name}
                    avatar_url={c.avatar_url}
                    avatar_gif_url={c.avatar_gif_url}
                    location={c.location}
                    age={c.age}
                    is_new={c.is_new}
                    like_count={c.like_count}
                    message_count={c.message_count}
                    category={c.category}
                  />
                ))}
              </div>
            )}
            {!loading && characters.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No characters found. Try a different search or category.
              </div>
            )}
            <div className="flex items-center justify-between mt-6 text-gray-300">
              <div>
                Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                  className="px-3 py-1.5 rounded bg-gray-800 disabled:opacity-50 hover:bg-gray-700"
                >
                  Prev
                </button>
                <button
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => load(page + 1)}
                  className="px-3 py-1.5 rounded bg-gray-800 disabled:opacity-50 hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SecretsLayout>
  );
}
