'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthModal from './AuthModal';

export default function AuthHandler() {
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      setShowAuthModal(true);
    }
  }, [searchParams]);

  const handleSuccess = () => {
    const redirectPath = localStorage.getItem('postAuthRedirect');
    localStorage.removeItem('postAuthRedirect');
    setShowAuthModal(false);
    if (redirectPath) {
      window.location.href = redirectPath;
    }
  };

  if (!showAuthModal) {
    return null;
  }

  return (
    <AuthModal
      mode="login"
      onClose={() => setShowAuthModal(false)}
      onSuccess={handleSuccess}
    />
  );
}
