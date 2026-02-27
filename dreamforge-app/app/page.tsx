'use client';

import { useState, useEffect } from 'react';
import SecretsLayout from '@/components/SecretsLayout';
import SecretsBanner from '@/components/SecretsBanner';
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
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState('Female');
  const [styleFilter, setStyleFilter] = useState('Realistic');
  const [sortFilter, setSortFilter] = useState('New');

  useEffect(() => {
    checkAuth();
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
        if (session?.user) fetchUserInfo(session.user.id);
      });
      return () => authListener.subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [genderFilter, styleFilter, sortFilter]);

  const checkAuth = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session?.user) await fetchUserInfo(session.user.id);
  };

  const fetchUserInfo = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('users').select('subscription_tier').eq('id', userId).single();
      if (data) setUserTier(data.subscription_tier || 'free');
    } catch {
      // ignore
    }
  };

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '24' });
      if (genderFilter !== 'All') params.set('tag', genderFilter.toLowerCase());
      const res = await fetch(`/api/characters?${params}`);
      const data = await res.json();
      let items = (data.items || []) as Character[];
      if (styleFilter === 'Realistic') {
        items = items.filter((c) => (c as { style?: string }).style === 'realistic' || !(c as { style?: string }).style);
      }
      if (sortFilter === 'New') {
        items = items.sort((a, b) => ((b.is_new ? 1 : 0) - (a.is_new ? 1 : 0)));
      }
      setCharacters(items);
    } catch (e) {
      console.error(e);
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const featured = characters.filter((c) => c.is_featured).slice(0, 8);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
      <div className="min-h-screen">
        <SecretsBanner />

        <section className="px-6 py-10 max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-1">
              Featured <span className="underline decoration-purple-500 underline-offset-4">Companions</span>
            </h2>
            <p className="text-gray-400">Meet some of our most popular companions.</p>
          </div>

          {/* Filter bar - Secrets.ai style */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-gray-700">
              <span className="text-gray-400">♀</span>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-transparent text-white border-none outline-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-gray-700">
              <span className="text-gray-400">👤</span>
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value)}
                className="bg-transparent text-white border-none outline-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Realistic">Realistic</option>
                <option value="Anime">Anime</option>
                <option value="Fantasy">Fantasy</option>
              </select>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 border border-gray-700">
              <span className="text-gray-400">✦</span>
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
                className="bg-transparent text-white border-none outline-none cursor-pointer"
              >
                <option value="New">New</option>
                <option value="Popular">Popular</option>
                <option value="Trending">Trending</option>
              </select>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-600/80 text-white rounded">NEW</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <a
              href="/characters"
              className="ml-auto px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
            >
              View all
            </a>
          </div>

          {/* Companion cards grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-gray-800/50 animate-pulse" />
              ))}
            </div>
          ) : featured.length > 0 ? (
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {characters.slice(0, 8).map((c) => (
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
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">No companions yet. Seed characters from the admin panel.</p>
              <a href="/admin" className="text-purple-400 hover:text-purple-300">
                Go to Admin →
              </a>
            </div>
          )}
        </section>
      </div>
    </SecretsLayout>
  );
}
