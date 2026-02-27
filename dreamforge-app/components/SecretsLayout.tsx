'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthModal from './AuthModal';

interface SecretsLayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  userTier: string;
}

const NAV_ITEMS = [
  { href: '/admin/character', label: 'Create', icon: '⊕' },
  { href: '/characters', label: 'Explore', icon: '◉' },
  { href: '/chat', label: 'Chat', icon: '◉' },
  { href: '/gallery', label: 'Generate', icon: '✦' },
  { href: '/characters', label: 'Custom', icon: '⚙' },
  { href: '/feed', label: 'Scenarios', icon: '▤', badge: 'NEW' },
  { href: '/characters', label: 'Personas', icon: '◐' },
];

export default function SecretsLayout({ children, isAuthenticated, setIsAuthenticated, userTier }: SecretsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white flex">
      {/* Left Sidebar - Secrets.ai style */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } bg-[#16161a] border-r border-gray-800/80 flex flex-col transition-all duration-300 shrink-0`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" style={{ fontFamily: 'var(--font-cursive), cursive' }} className="text-xl font-semibold text-white tracking-wide">
            DreamForge
          </Link>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors group"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded bg-gray-800/80 text-sm group-hover:bg-purple-600/30">
                {item.icon}
              </span>
              {sidebarOpen && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-600/80 text-white rounded">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}

          <div className="pt-4">
            <Link
              href="/pricing"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              <span className="w-8 h-8 flex items-center justify-center">👑</span>
              {sidebarOpen && <span>Upgrade</span>}
            </Link>
          </div>
        </nav>

        <div className="p-2 border-t border-gray-800/50 space-y-1">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => openAuth('login')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white"
              >
                <span className="w-8 h-8 flex items-center justify-center text-lg">👤</span>
                {sidebarOpen && <span>Login</span>}
              </button>
              <button
                onClick={() => openAuth('register')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white"
              >
                <span className="w-8 h-8 flex items-center justify-center text-lg">👤+</span>
                {sidebarOpen && <span>Sign Up</span>}
              </button>
            </>
          ) : (
            <Link
              href="/gallery"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-600/30">✓</span>
              {sidebarOpen && <span>{userTier === 'premium' ? 'Premium' : userTier === 'ultimate' ? 'Ultimate' : 'Account'}</span>}
            </Link>
          )}
          <Link
            href="https://discord.gg/dreamforge"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white"
          >
            <span className="w-8 h-8 flex items-center justify-center">💬</span>
            {sidebarOpen && <span>Discord</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

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
