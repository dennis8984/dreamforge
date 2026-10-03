'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import AuthModal from './AuthModal';
import SiteFooter from './SiteFooter';
import { LanguageMenu, useI18n, type MessageKey } from '@/lib/i18n';

interface SecretsLayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  userTier: string;
}

const RAIL: Array<{ href: string; key: MessageKey; icon: typeof HomeIcon }> = [
  { href: '/', key: 'nav.home', icon: HomeIcon },
  { href: '/feed', key: 'nav.discover', icon: DiscoverIcon },
  { href: '/shorts', key: 'nav.shorts', icon: ShortsIcon },
  { href: '/chat', key: 'nav.chat', icon: ChatIcon },
  { href: '/gallery', key: 'nav.collection', icon: CollectionIcon },
  { href: '/characters', key: 'nav.create', icon: CreateIcon },
  { href: '/characters', key: 'nav.myAi', icon: HeartIcon },
  { href: '/private', key: 'nav.private', icon: LockIcon },
  { href: '/pricing', key: 'nav.premium', icon: GemIcon },
];

const MOBILE: Array<{ href: string; key: MessageKey; icon: typeof HomeIcon }> = [
  { href: '/', key: 'nav.home', icon: HomeIcon },
  { href: '/private', key: 'nav.privateShort', icon: LockIcon },
  { href: '/characters', key: 'nav.createShort', icon: CreateIcon },
  { href: '/chat', key: 'nav.chat', icon: ChatIcon },
  { href: '/pricing', key: 'nav.premium', icon: GemIcon },
];

const CASTS: Array<{ id: string; key: MessageKey }> = [
  { id: 'Girls', key: 'cast.girls' },
  { id: 'Anime', key: 'cast.anime' },
  { id: 'Guys', key: 'cast.guys' },
];

function CastLinks({ cast }: { cast: string }) {
  const { t } = useI18n();
  return (
    <nav className="ml-2 hidden items-center gap-2 sm:flex md:ml-6 md:gap-5">
      {CASTS.map((item) => (
        <Link
          key={item.id}
          href={`/?cast=${item.id}`}
          className={`flex h-16 min-w-[64px] items-center justify-center px-1 text-[13px] font-semibold leading-[19.5px] md:min-w-[93px] md:px-2 ${
            cast === item.id ? 'text-[#f97187]' : 'text-white'
          }`}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}

function CastSwitch() {
  const search = useSearchParams();
  return <CastLinks cast={search.get('cast') || 'Girls'} />;
}

export default function SecretsLayout({ children, isAuthenticated, setIsAuthenticated, userTier }: SecretsLayoutProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { t } = useI18n();

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    const open = () => openAuth('register');
    window.addEventListener('df-open-register', open);
    return () => window.removeEventListener('df-open-register', open);
  }, []);

  const active = (href: string, key: MessageKey) => {
    if (key === 'nav.myAi') return false;
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/5 bg-[#121214] px-3 md:gap-4 md:px-4">
        <button
          type="button"
          className="p-2 text-gray-200 md:hidden"
          aria-label={t('auth.menu')}
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </button>
        <Link href="/" className="shrink-0 text-[18px] font-semibold tracking-tight sm:text-[22px]">
          dream<span className="text-[#ff4d8d]">forge</span>
        </Link>
        <Suspense fallback={<CastLinks cast="Girls" />}>
          <CastSwitch />
        </Suspense>
        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          <LanguageMenu />
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="h-[34px] whitespace-nowrap rounded-full bg-[#ee5876] px-3 text-[13px] font-semibold leading-[18px] text-white"
              >
                <span className="lg:hidden">{t('auth.join')}</span>
                <span className="hidden lg:inline">{t('auth.create')}</span>
              </button>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="h-[34px] whitespace-nowrap rounded-full border border-white/20 px-3 text-[13px] font-semibold leading-[18px] text-white"
              >
                {t('auth.login')}
              </button>
            </>
          ) : (
            <span className="text-xs uppercase tracking-wide text-gray-400">{userTier}</span>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-[220px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] flex-col px-3 py-4 bg-[#121214]">
          <nav className="flex flex-col gap-1">
            {RAIL.map((item) => {
              const Icon = item.icon;
              const on = active(item.href, item.key);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex h-10 items-center gap-2 rounded-[10px] px-3 text-[12px] font-medium leading-4 ${
                    on ? 'bg-[#303030] text-white' : 'text-[#d1d1d1] hover:bg-white/5'
                  }`}
                >
                  <Icon />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 pb-20 md:pb-6">{children}</main>
      </div>

      <SiteFooter />

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 bg-[#141416] border-t border-white/5">
        {MOBILE.map((item) => {
          const Icon = item.icon;
          const on = active(item.href, item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-1 py-2 text-[10px] leading-3 ${on ? 'text-[#ff4d8d]' : 'text-gray-400'}`}
            >
              <Icon />
              <span className="max-w-full truncate">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button type="button" className="flex-1 bg-black/60" aria-label={t('auth.close')} onClick={() => setMenuOpen(false)} />
          <div className="order-first flex h-full w-64 flex-col gap-1 bg-[#141416] p-4">
            {RAIL.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-gray-200 hover:bg-white/5"
              >
                {t(item.key)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setIsAuthenticated(true);
            setShowAuthModal(false);
          }}
        />
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}
function DiscoverIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="m14.5 9.5-1.2 4.8-4.8 1.2 1.2-4.8 4.8-1.2z" />
    </svg>
  );
}
function ShortsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="M10 9.5v5l4.5-2.5L10 9.5z" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18.5 4 21V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H6z" />
    </svg>
  );
}
function CollectionIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="M4 15l4-3 3 2 3-4 6 5" />
    </svg>
  );
}
function CreateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeWidth={1.8} d="M15 4l2 2-9 9H6v-2l9-9z" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="10" width="12" height="9" rx="2" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
    </svg>
  );
}
function GemIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinejoin="round" strokeWidth={1.8} d="M7 4h10l4 6-9 10L3 10l4-6z" />
    </svg>
  );
}
