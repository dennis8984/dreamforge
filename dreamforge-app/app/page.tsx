'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SecretsLayout from '@/components/SecretsLayout';
import HomeStory from '@/components/HomeStory';
import { ProfileModal } from '@/components/ProfileViews';
import { LAYOUT_CAST, viewForRow, type ProfileView } from '@/lib/layout-cast';
import { useI18n, type MessageKey } from '@/lib/i18n';
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
  clip?: string;
}

const CHIPS = ['All', 'Caucasian', 'Latina', 'Asian', '21–24', 'Blonde', 'Brunette', 'Redhead'] as const;

const CHIP_KEY: Record<(typeof CHIPS)[number], MessageKey> = {
  All: 'home.all',
  Caucasian: 'chip.caucasian',
  Latina: 'chip.latina',
  Asian: 'chip.asian',
  '21–24': 'chip.young',
  Blonde: 'chip.blonde',
  Brunette: 'chip.brunette',
  Redhead: 'chip.redhead',
};

const ROW_KEYS = ['row.featured', 'row.new', 'row.evening', 'row.studio', 'row.city', 'row.private'] as const;

const HEROES: Array<{
  image: string;
  href: string;
  cta: MessageKey;
  kicker?: MessageKey;
  name?: string;
  nameKey?: MessageKey;
  gold?: boolean;
  live?: boolean;
}> = [
  { image: '/heroes/offer.jpg', kicker: 'hero.offer', cta: 'hero.join', href: '/pricing', gold: true },
  { image: '/heroes/lila.jpg', name: 'Lila', cta: 'hero.play', href: '/character/lila?view=chat', live: true },
  { image: '/heroes/cleo.jpg', name: 'Cleo', cta: 'hero.play', href: '/character/cleo?view=chat', live: true },
  { image: '/heroes/series.jpg', kicker: 'hero.episodes', cta: 'hero.watch', href: '/shorts' },
  { image: '/heroes/create.jpg', nameKey: 'hero.turn', cta: 'hero.create', href: '/characters' },
];

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0e10]" />}>
      <HomeContent />
    </Suspense>
  );
}

function ageNumber(age?: string): number | null {
  if (!age) return null;
  const n = parseInt(age, 10);
  return Number.isNaN(n) ? null : n;
}

function isAtLeast21(character: Character): boolean {
  const n = ageNumber(character.age);
  return n === null || n >= 21;
}

function HomeContent() {
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
  const [modal, setModal] = useState<Character | null>(null);
  const rows = useRef<Array<HTMLDivElement | null>>([]);
  const { t } = useI18n();

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
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % HEROES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/characters?page=1&pageSize=48');
        const data = await res.json();
        if (alive) setCharacters((data.items || []) as Character[]);
      } catch {
        if (alive) setCharacters([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const roster = [
    ...LAYOUT_CAST,
    ...characters.filter((character) => !LAYOUT_CAST.some((item) => item.slug === character.slug)),
  ];

  const visible = useMemo(() => {
    return roster.filter(isAtLeast21).filter((c) => {
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
      if (chip === '21–24') return n !== null && n >= 21 && n <= 24;
      if (chip === 'Caucasian' || chip === 'Latina' || chip === 'Asian') return blob.includes(chip.toLowerCase());
      if (chip === 'Blonde' || chip === 'Brunette' || chip === 'Redhead') return blob.includes(chip.toLowerCase());
      return true;
    });
  }, [roster, cast, chip, query]);

  useEffect(() => {
    rows.current.forEach((row) => {
      if (row) row.scrollLeft = 0;
    });
  }, [chip, query, cast]);

  useEffect(() => {
    document.body.style.overflow = modal ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modal]);

  const show = (index: number) => setSlide((index + HEROES.length) % HEROES.length);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier}>
      <div className="pb-4">
        <section className="relative isolate -mt-4 md:-mt-6 md:-mb-[164px]">
          <div className="relative mx-auto h-[190px] w-full overflow-hidden bg-[#0d0a0f] md:h-[560px] md:max-w-[1336px]">
            {HEROES.map((hero, index) => (
              <div
                key={hero.href + hero.cta}
                className={`absolute inset-0 z-0 transition-opacity duration-700 ${index === slide ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
              >
                <img src={hero.image} alt="" className="absolute inset-0 size-full object-cover object-[center_top]" />
                <Link href={hero.href} className="absolute inset-0">
                  <span className="absolute inset-y-0 left-6 z-10 flex max-w-[70%] flex-col items-start justify-center pb-8 text-left md:left-[72px] md:max-w-[420px] md:pb-[132px]">
                    {hero.name || hero.nameKey ? (
                      <span
                        className="mb-2 block max-w-[348px] font-[family-name:var(--font-script)] text-[64px] leading-[0.85] text-white md:mb-[22px] md:text-[120px]"
                        style={{ textShadow: '0 0 18px #ff4d8d, 0 0 42px rgba(255,45,120,0.85), 0 2px 8px rgba(0,0,0,0.65)' }}
                      >
                        {hero.name || (hero.nameKey ? t(hero.nameKey) : '')}
                      </span>
                    ) : null}
                    {hero.kicker ? (
                      <span
                        className={`mb-2 block text-white md:mb-[22px] ${hero.gold ? 'text-[40px] font-black leading-none md:text-[72px]' : 'max-w-[360px] text-[22px] font-semibold leading-7 md:text-[32px]'}`}
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
                      >
                        {t(hero.kicker)}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex h-[34px] min-w-[84px] items-center justify-center rounded-full border px-6 text-[13px] md:h-[46px] md:px-9 md:text-[15px] ${
                        hero.gold
                          ? 'border-[#ffe38c] bg-[#FBC931] font-bold text-[#071018] md:text-[22px]'
                          : 'border-white/30 bg-[#F53B70] font-semibold text-white'
                      }`}
                    >
                      {t(hero.cta)}
                    </span>
                  </span>
                </Link>
                {hero.live ? <LiveBadge /> : null}
              </div>
            ))}
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => show(slide - 1)}
              className="absolute inset-y-0 left-0 z-20 hidden w-[50px] items-center justify-center pb-[164px] text-white md:flex"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => show(slide + 1)}
              className="absolute inset-y-0 right-0 z-20 hidden w-[50px] items-center justify-center pb-[164px] text-white md:flex"
            >
              <Chevron dir="right" />
            </button>
            <div className="absolute bottom-[11px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 md:bottom-[210px]">
              {HEROES.map((hero, index) => (
                <button
                  key={hero.cta + index}
                  type="button"
                  aria-label={`Banner ${index + 1}`}
                  onClick={() => show(index)}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span className={`block h-1 w-[15px] rounded-sm ${index === slide ? 'bg-white' : 'bg-white/30'}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-[1336px] px-3 md:px-7">
          <h1 className="pointer-events-auto mb-4 flex items-center text-[22px] font-semibold leading-6">
            <span className="text-[#f97187]">{t('home.explore')}</span>
            <span className="ml-1.5">{t('home.featuredWords')}</span>
            <Chevron dir="right" className="ml-1 h-4 w-4 text-white/80" />
          </h1>

          <div className="pointer-events-auto mb-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <label className="flex h-10 w-[170px] shrink-0 items-center gap-2 rounded-full bg-[#252525] px-5">
              <SearchIcon />
              <span className="sr-only">{t('home.search')}</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('home.search')}
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-white/70"
              />
            </label>
            <Chip active={chip === 'All'} onClick={() => setChip('All')}>{t('home.all')}</Chip>
            <Link
              href="/private"
              className="inline-flex h-10 shrink-0 items-center gap-3 rounded-full border-2 border-[#282828] bg-[#252525] px-5 text-[15px] font-medium text-white"
            >
              <HeartIcon />
              {t('home.private')}
            </Link>
            {CHIPS.filter((item) => item !== 'All').map((item) => (
              <Chip key={item} active={chip === item} onClick={() => setChip(item)}>
                {t(CHIP_KEY[item])}
              </Chip>
            ))}
          </div>

          {ROW_KEYS.map((rowKey, rowIndex) => {
            const title = t(rowKey);
            return (
            <section key={title} className="pointer-events-auto mb-[18px]">
              {rowIndex > 0 ? (
                <h2 className="mb-3 text-[20px] font-semibold leading-6">{title}</h2>
              ) : null}
              <div className="group/row relative">
              <button
                type="button"
                aria-label={`Scroll ${title} back`}
                onClick={() => rows.current[rowIndex]?.scrollBy({ left: -780, behavior: 'smooth' })}
                className="absolute left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/80 opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${title} forward`}
                onClick={() => rows.current[rowIndex]?.scrollBy({ left: 780, behavior: 'smooth' })}
                className="absolute right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/80 opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
              >
                <Chevron dir="right" />
              </button>
              <div
                ref={(node) => {
                  rows.current[rowIndex] = node;
                }}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-[300px] w-[180px] shrink-0 rounded-[18px] bg-[#1c1c1f] animate-pulse" />
                    ))
                  : shelf(visible, rowIndex).map((item) => {
                      if (item.kind === 'shorts') return <ShortsTile key={`${title}-shorts`} />;
                      if (item.kind === 'private') return <PrivateTile key={`${title}-private`} />;
                      return (
                        <Portrait
                          key={`${rowKey}-${item.character.id}`}
                          character={item.character}
                          view={viewForRow(rowIndex)}
                          onOpen={() => setModal(item.character)}
                        />
                      );
                    })}
              </div>
              </div>
            </section>
            );
          })}

          {!loading && visible.length === 0 && (
            <p className="py-6 text-sm text-gray-500">{t('home.empty')}</p>
          )}
          <div className="pointer-events-auto">
            <HomeStory />
          </div>
        </div>
      </div>
      {modal ? <ProfileModal character={modal} onClose={() => setModal(null)} /> : null}
    </SecretsLayout>
  );
}

type ShelfItem =
  | { kind: 'card'; character: Character }
  | { kind: 'shorts' }
  | { kind: 'private' };

function shelf(list: Character[], rowIndex: number): ShelfItem[] {
  const items: ShelfItem[] = list.map((character) => ({ kind: 'card', character }));
  if (rowIndex === 0) items.splice(Math.min(2, items.length), 0, { kind: 'shorts' });
  if (rowIndex === 1) items.splice(Math.min(3, items.length), 0, { kind: 'private' });
  return items;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border-2 px-5 text-[15px] font-medium ${
        active
          ? 'border-[#e75275] bg-[linear-gradient(162.57deg,#1a1a1a_6.61%,#2a1e21_88.06%)] text-white'
          : 'border-[#282828] bg-[#252525] text-white'
      }`}
    >
      {children}
    </button>
  );
}

function LiveBadge() {
  const { t } = useI18n();
  return (
    <span
      className="pointer-events-none absolute right-[8%] top-[16%] z-10 hidden -rotate-6 text-center font-[family-name:var(--font-script)] text-[42px] leading-[0.85] text-[#ffd0dc] md:block md:text-[58px]"
      style={{ textShadow: '0 0 10px #ff4d8d, 0 0 22px rgba(255,70,130,0.9), 0 3px 8px rgba(0,0,0,0.55)' }}
    >
      {t('hero.live')}
      <span className="block">{t('hero.action')}</span>
    </span>
  );
}

function Portrait({
  character,
  view,
  onOpen,
}: {
  character: Character;
  view: ProfileView;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const [live, setLive] = useState(false);
  const n = ageNumber(character.age);
  const className = 'relative block h-[300px] w-[180px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-[#1c1c1f] text-left';
  const face = (
    <>
      {character.avatar_url ? (
        <img
          src={character.avatar_url}
          alt=""
          className={`absolute inset-0 size-full object-cover object-center ${live && character.clip ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : null}
      {character.clip ? (
        <img
          src={character.clip}
          alt=""
          className={`absolute inset-0 size-full object-cover object-center ${live ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
      {character.is_new ? (
        <span className="absolute left-0 top-0 z-20 flex h-[25px] items-center gap-1 rounded-br-xl bg-[#f53b70] py-0.5 pl-1.5 pr-1.5 text-[11px] font-bold leading-[11px] tracking-wide text-white">
          <SparkIcon />
          {t('badge.new')}
        </span>
      ) : null}
      <span className="pointer-events-none absolute right-[9px] top-[9px] z-20 flex flex-col items-end gap-[7px]">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/25 bg-black/60">
          <PhotoIcon />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/25 bg-black/60">
          <FilmIcon />
        </span>
      </span>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[48%] bg-[linear-gradient(to_top,rgba(8,6,10,0.78),transparent)]" />
      <span className="absolute inset-x-0 bottom-0 z-20 flex items-baseline gap-[5px] p-3">
        <span className="min-w-0 truncate text-[18px] font-bold leading-6 text-white">{character.name}</span>
        {n !== null ? <span className="shrink-0 text-[15px] font-bold leading-6 text-[#cbb6bf]">{n}</span> : null}
      </span>
    </>
  );
  if (view === 'modal') {
    return (
      <button type="button" onClick={onOpen} onMouseEnter={() => setLive(true)} onMouseLeave={() => setLive(false)} className={className}>
        {face}
      </button>
    );
  }
  return (
    <Link
      href={`/character/${character.slug}?view=${view}`}
      onMouseEnter={() => setLive(true)}
      onMouseLeave={() => setLive(false)}
      className={className}
    >
      {face}
    </Link>
  );
}

function ShortsTile() {
  const { t } = useI18n();
  return (
    <Link href="/shorts" className="relative block h-[300px] w-[180px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-[#140816]">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(80,180,255,0.35),transparent_42%),radial-gradient(circle_at_50%_18%,rgba(255,50,130,0.45),transparent_40%)]" />
      <span className="absolute left-1/2 top-7 -translate-x-1/2 text-center text-[28px] font-semibold uppercase leading-none tracking-wide text-white [text-shadow:0_0_12px_#39c6ff,0_0_18px_#ff3d88]">
        {t('tile.shorts')}
      </span>
      <FilmStrip />
      <span className="absolute bottom-4 left-1/2 inline-flex h-9 -translate-x-1/2 items-center rounded-full bg-[#F53B70] px-6 text-[14px] font-semibold text-white">
        {t('tile.watch')}
      </span>
    </Link>
  );
}

function PrivateTile() {
  const { t } = useI18n();
  return (
    <Link href="/private" className="relative block h-[300px] w-[180px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-[#120810]">
      <img src="/models/model-16.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,60,130,0.28),rgba(0,0,0,0.45))]" />
      <span
        className="absolute inset-x-3 top-1/2 -translate-y-1/2 text-center font-[family-name:var(--font-script)] text-[40px] leading-[0.9] text-[#ffd0e0]"
        style={{ textShadow: '0 0 12px #ff4d8d, 0 0 24px rgba(255,60,130,0.85)' }}
      >
        {t('tile.private')}
      </span>
    </Link>
  );
}

function FilmStrip() {
  return (
    <svg viewBox="0 0 140 90" className="absolute left-1/2 top-[92px] w-[132px] -translate-x-1/2" aria-hidden="true">
      <rect x="8" y="18" width="124" height="54" rx="6" fill="#1b1024" stroke="#7ee0ff" strokeWidth="2" />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={16 + i * 20} y="26" width="14" height="38" rx="2" fill="#3a2448" />
      ))}
      <rect x="4" y="8" width="10" height="8" rx="1" fill="#ff4d8d" />
      <rect x="126" y="8" width="10" height="8" rx="1" fill="#ff4d8d" />
      <rect x="4" y="74" width="10" height="8" rx="1" fill="#39c6ff" />
      <rect x="126" y="74" width="10" height="8" rx="1" fill="#39c6ff" />
    </svg>
  );
}

function Chevron({ dir, className = 'h-6 w-6' }: { dir: 'left' | 'right'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {dir === 'left' ? <path d="M15 5 8 12l7 7" /> : <path d="m9 5 7 7-7 7" />}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 16 14" className="h-3.5 w-4" aria-hidden="true">
      <path d="M8 0 9.2 5.2 14 6.2 9.2 7.4 8 14 6.8 7.4 2 6.2 6.8 5.2Z" fill="white" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4" />
    </svg>
  );
}
