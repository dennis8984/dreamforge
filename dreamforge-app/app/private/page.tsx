'use client';

import { useState } from 'react';
import Link from 'next/link';
import SecretsLayout from '@/components/SecretsLayout';

export default function PrivatePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SecretsLayout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier="free">
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">Private content</h1>
        <p className="text-gray-400 mb-6">Premium unlocks the private grid. Characters here are 21+.</p>
        <Link href="/pricing" className="inline-block px-5 py-2.5 rounded-full bg-[#ff4d8d] text-sm font-medium">
          Unlock
        </Link>
      </div>
    </SecretsLayout>
  );
}
