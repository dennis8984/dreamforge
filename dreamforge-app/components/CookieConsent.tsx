'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  const { t } = useI18n();
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-800 border-t border-gray-700">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-300">
          {t('cookie.body')}
        </p>
        <div className="flex gap-3">
          <button onClick={decline} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            {t('cookie.decline')}
          </button>
          <button onClick={accept} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
