'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

const STORAGE_KEY = 'dreamforge_entry_acknowledged';

export default function EntryModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) setShow(true);
  }, []);

  const enter = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  const { t } = useI18n();
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center max-w-md w-full mx-6 text-center">
        {/* DreamForge Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <span className="text-3xl font-bold text-white tracking-tight">DF</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">DreamForge</h1>
          <p className="mt-2 text-gray-400 text-sm">{t('gate.sub')}</p>
        </div>

        <p className="text-gray-300 text-lg mb-10 leading-relaxed">{t('gate.tagline')}</p>

        {/* Enter button */}
        <button
          onClick={enter}
          className="w-full max-w-xs py-4 px-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/25"
        >
          {t('gate.enter')}
        </button>

        <Link
          href="/auth"
          onClick={enter}
          className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          {t('gate.signin')}
        </Link>
      </div>
    </div>
  );
}
