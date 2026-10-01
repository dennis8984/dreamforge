'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

const CHIPS = ['All', 'Private', '21–29', '30+', 'Blonde', 'Brunette', 'Redhead'];
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
  const search = useSearchParams();
  const castParam = search.get('cast');
  const cast = castParam === 'Anime' || castParam === 'Guys' ? castParam : 'Girls';
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
      <div className="px-3 md:px-5 py-4">
        <div className="relative overflow-hidden rounded-[18px] h-[220px] sm:h-[320px] lg:h-[420px] mb-5 bg-gradient-to-r from-[#3a1028] via-[#1a1230] to-[#102033]">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-3xl sm:text-5xl font-semibold mb-2">{SLIDES[slide].title}</p>
            <p className="text-sm text-white/80 mb-5 max-w-md">{SLIDES[slide].body}</p>
            <Link href={SLIDES[slide].href} className="px-6 py-2.5 rounded-full bg-[#f5c518] text-black text-sm font-semibold">
              Join Now
            </Link>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-1 rounded-full ${i === slide ? 'w-8 bg-white' : 'w-6 bg-white/40'}`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-xl mb-3">
          Explore <span className="text-[#ff4d8d]">Featured Characters</span>
        </h2>

        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          <label className="flex items-center gap-2 px-4 h-10 rounded-full bg-[#1c1c1f] shrink-0 w-44">
            <span className="sr-only">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
            />
          </label>
          {CHIPS.map((item) =>
            item === 'Private' ? (
              <Link
                key={item}
                href="/private"
                className="shrink-0 px-4 h-10 rounded-full text-sm border border-transparent bg-[#1c1c1f] text-gray-200 inline-flex items-center"
              >
                Private Content
              </Link>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setChip(item)}
                className={`shrink-0 px-4 h-10 rounded-full text-sm border ${
                  chip === item ? 'border-[#ff4d8d] text-white' : 'border-transparent bg-[#1c1c1f] text-gray-200'
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-[18px] bg-[#1c1c1f] animate-pulse" />
              ))
            : tiles(visible)}
        </div>

        {!loading && visible.length === 0 && (
          <p className="text-sm text-gray-500 py-6">No characters in this filter yet. Cards use DreamForge portraits when they exist.</p>
        )}
      </div>
    </SecretsLayout>
  );
}

function tiles(characters: Character[]) {
  const nodes = [
    <Link
      key="shorts"
      href="/shorts"
      className="relative aspect-[3/4] rounded-[18px] overflow-hidden bg-[#2a1038] border border-[#c084fc] flex items-end justify-center pb-4"
    >
      <span className="px-5 py-2 rounded-full bg-[#ff4d8d] text-sm font-medium">Watch</span>
    </Link>,
    <Link
      key="private"
      href="/pricing"
      className="relative aspect-[3/4] rounded-[18px] overflow-hidden bg-[#241018] border border-[#ff4d8d] flex items-end justify-center pb-4"
    >
      <span className="px-5 py-2 rounded-full bg-[#ff4d8d] text-sm font-medium">Unlock</span>
    </Link>,
  ];
  const portraits = characters.map((character) => <Portrait key={character.id} character={character} />);
  const first = portraits.slice(0, 2);
  const rest = portraits.slice(2);
  return [...first, nodes[0], ...rest.slice(0, 4), nodes[1], ...rest.slice(4)];
}

function Portrait({ character }: { character: Character }) {
  const n = ageNumber(character.age);
  return (
    <Link href={`/character/${character.slug}`} className="relative aspect-[3/4] rounded-[18px] overflow-hidden bg-[#1c1c1f] block">
      {character.avatar_url ? (
        <img src={character.avatar_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-b from-[#2a2438] to-[#121216]" />
      )}
      {character.is_new && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-[#ff4d8d] px-1.5 py-0.5 rounded">NEW</span>
      )}
      <span className="absolute inset-x-0 bottom-0 px-3 py-3 bg-gradient-to-t from-black/80 to-transparent text-[15px] font-medium">
        {character.name}
        {n !== null ? <span className="ml-1.5 font-normal text-white/80">{n}</span> : null}
      </span>
    </Link>
  );
}
