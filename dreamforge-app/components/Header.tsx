'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthModal from './AuthModal';

interface HeaderProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  userTier: string;
}

export default function Header({ isAuthenticated, setIsAuthenticated, userTier }: HeaderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">DreamForge</span>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link href="/gallery" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Gallery
              </Link>
              <Link href="/models" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Models
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                Pricing
              </Link>
              {userTier === 'admin' && (
                <Link href="/admin" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium">
                  Admin
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                    Dashboard
                  </Link>
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                      {userTier === 'premium' ? 'Premium' : userTier === 'basic' ? 'Basic' : 'Free'}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openAuth('login')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => openAuth('register')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

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
    </>
  );
}