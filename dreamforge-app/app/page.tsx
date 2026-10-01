'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SecretsLayout from '@/components/SecretsLayout';
import { supabase } from '@/lib/supabase';

interface Character {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string;
  age?: string;
  is_new?: boolean;
  category?: string;
  tags?: string[];
  style?: string;
  gender?: string;
}

const CASTS = ['Girls', 'Anime', 'Guys'] as const;
const CHIPS = ['All', 'New', '21–29', '30+', 'Blonde', 'Brunette', 'Redhead'];
const SLIDES = [
  {
    title: 'A still, then a five-second clip',
    body: 'Make her portrait first. The clip is a short animation of that still.',
    href: '/characters',
    cta: 'Create',
  },
  {
    title: 'Premium',
    body: 'Unlimited text, images, video, and live action.',
    href: '/pricing',
    cta: 'See plans',
  },
  {
    title: 'Shorts',
    body: 'Original series, five seconds each.',
    href: '/shorts',
    cta: 'Watch',
  },
];

function ageNumber(age?: string): number | null {
  if (!age) return null;
  const n = parseInt(age, 10);
  return Number.isNaN(n) ? null : n;
}

function isAtLeast21(character: Character): boolean {
  const n = ageNumber(character.age);
  return n === null || n >= 21;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<(typeof CASTS)[number]>('Girls');
  const [chip, setChip] = useState('All');
  const [query, setQuery] = useState('');
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const loadSession = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session?.user) {
        const { data } = await supabase.from('users').select('subscription_tier').eq('id', session.user.id).single();
        if (data) setUserTier(data.subscription_tier || 'free');
      }
    };
    loadSession();
    if (!supabase) return;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/characters?page=1&pageSize=48');
        const data = await res.json();
        setCharacters((data.items || []) as Character[]);
      } catch {
        setCharacters([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = useMemo(() => {
    return characters.filter(isAtLeast21).filter((c) => {
      const style = (c.style || '').toLowerCase();
      const gender = (c.gender || '').toLowerCase();
      const blob = `${c.name} ${c.category || ''} ${(c.tags || []).join(' ')} ${style}`.toLowerCase();
      const anime = style === 'anime' || blob.includes('anime');
      const guy = gender === 'male' || gender === 'guy';
      if (cast === 'Anime' && !anime) return false;
      if (cast === 'Guys' && !guy) return false;
      if (cast === 'Girls' && (anime || guy)) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      const n = ageNumber(c.age);
      if (chip === 'New') return !!c.is_new;
      if (chip === '21–29') return n !== null && n >= 21 && n <= 29;
      if (chip === '30+') return n !== null && n >= 30;
      if (chip === 'Blonde' || chip === 'Brunette' || chip === 'Redhead') return blob.includes(chip.toLowerCase());
      return true;
    });
  }, [characters, cast, chip, query]);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
      <div className="px-4 md:px-8 py-5 max-w-6xl mx-auto">
        <div className="flex gap-2 mb-4">
          {CASTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCast(item)}
              className={`px-3 py-1 text-sm border-b-2 ${
                cast === item ? 'border-[#ff4d8d] text-white' : 'border-transparent text-gray-500'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-[#1a1020] min-h-[180px] mb-6">
          <div className="p-6 md:p-8 max-w-md">
            <h1 className="text-2xl font-semibold mb-2">{SLIDES[slide].title}</h1>
            <p className="text-sm text-gray-300 mb-4">{SLIDES[slide].body}</p>
            <Link href={SLIDES[slide].href} className="inline-block px-4 py-2 rounded-full bg-[#ff4d8d] text-sm font-medium">
              {SLIDES[slide].cta}
            </Link>
          </div>
          <div className="absolute bottom-3 left-6 flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full ${i === slide ? 'w-5 bg-[#ff4d8d]' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg">
            Explore <span className="text-[#ff4d8d]">characters</span>
          </h2>
        </div>

        <label className="flex items-center gap-2 px-3 h-10 rounded-full bg-[#1c1c1f] mb-3">
          <span className="sr-only">Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setChip(item)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${
                chip === item ? 'bg-white text-black' : 'bg-[#1c1c1f] text-gray-300'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-[#1c1c1f] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Link href="/shorts" className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#241028] flex items-end p-3">
              <span className="text-sm font-semibold">Shorts</span>
            </Link>
            {visible.map((c) => (
              <Portrait key={c.id} character={c} />
            ))}
            <Link href="/private" className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1c1c1f] flex items-end p-3">
              <span className="text-sm">Private</span>
            </Link>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <p className="text-sm text-gray-500 py-8">No characters in this filter.</p>
        )}
      </div>
    </SecretsLayout>
  );
}

function Portrait({ character }: { character: Character }) {
  const n = ageNumber(character.age);
  return (
    <Link href={`/character/${character.slug}`} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#1c1c1f] block">
      {character.avatar_url ? (
        <img src={character.avatar_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {character.is_new && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-[#ff4d8d] px-1.5 py-0.5 rounded">NEW</span>
      )}
      <span className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-sm font-medium">
        {character.name}
        {n !== null ? <span className="ml-1 font-normal text-white/80">{n}</span> : null}
      </span>
    </Link>
  );
}
