'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FeedTimeline from '@/components/feed/FeedTimeline';

export default function FeedPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUserId = localStorage.getItem('supabase_user_id');
    const storedTier = localStorage.getItem('user_tier');

    if (token) {
      setIsAuthenticated(true);
      setUserId(storedUserId);
      if (storedTier) setUserTier(storedTier);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Social Feed</h1>
          <p className="text-gray-400">
            Stay updated with the latest posts from your favorite characters.
          </p>
        </div>

        {/* Feed timeline */}
        <FeedTimeline
          isAuthenticated={isAuthenticated}
          userId={userId}
        />
      </div>
    </main>
  );
}
