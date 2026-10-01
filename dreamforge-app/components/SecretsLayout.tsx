'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import AuthModal from './AuthModal';
import SiteFooter from './SiteFooter';

interface SecretsLayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  userTier: string;
}

const RAIL = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/feed', label: 'Discover', icon: DiscoverIcon },
  { href: '/shorts', label: 'Shorts', icon: ShortsIcon },
  { href: '/chat', label: 'Chat', icon: ChatIcon },
  { href: '/gallery', label: 'Collection', icon: CollectionIcon },
  { href: '/characters', label: 'Create Character', icon: CreateIcon },
  { href: '/characters', label: 'My AI', icon: HeartIcon },
  { href: '/private', label: 'Private Content', icon: LockIcon },
  { href: '/pricing', label: 'Premium', icon: GemIcon },
];

const MOBILE = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/private', label: 'Private', icon: LockIcon },
  { href: '/characters', label: 'Create', icon: CreateIcon },
  { href: '/chat', label: 'Chat', icon: ChatIcon },
  { href: '/pricing', label: 'Premium', icon: GemIcon },
];

const CASTS = ['Girls', 'Anime', 'Guys'] as const;

function CastLinks({ cast }: { cast: string }) {
  return (
    <nav className="hidden sm:flex items-center gap-5 ml-6">
      {CASTS.map((item) => (
        <Link
          key={item}
          href={`/?cast=${item}`}
          className={`flex items-center justify-center h-16 min-w-[93px] px-2 text-[13px] font-semibold leading-[19.5px] ${
            cast === item ? 'text-[#f97187]' : 'text-white'
          }`}
        >
          {item}
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

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setMenuOpen(false);
  };

  const active = (href: string, label: string) => {
    if (label === 'My AI') return false;
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <header className="sticky top-0 z-30 flex items-center gap-4 h-16 px-4 bg-[#121214] border-b border-white/5">
        <button
          type="button"
          className="p-2 text-gray-200 md:hidden"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </button>
        <Link href="/" className="text-[22px] font-semibold tracking-tight shrink-0">
          dream<span className="text-[#ff4d8d]">forge</span>
        </Link>
        <Suspense fallback={<CastLinks cast="Girls" />}>
          <CastSwitch />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="h-[34px] px-[13px] rounded-full text-[13px] font-semibold leading-[18px] bg-[#ee5876] text-white"
              >
                Create Free Account
              </button>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="h-[34px] px-[13px] rounded-full text-[13px] font-semibold leading-[18px] border border-white/20 text-white"
              >
                Login
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
              const on = active(item.href, item.label);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 h-10 px-3 rounded-[10px] text-[12px] font-medium leading-4 ${
                    on ? 'bg-[#303030] text-white' : 'text-[#d1d1d1] hover:bg-white/5'
                  }`}
                >
                  <Icon />
                  {item.label}
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
          const on = active(item.href, item.label);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] ${on ? 'text-[#ff4d8d]' : 'text-gray-400'}`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button type="button" className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="w-64 bg-[#141416] h-full p-4 flex flex-col gap-1 order-first">
            {RAIL.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5"
              >
                {item.label}
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
