'use client';

import { useState, useEffect } from 'react';
import AIGallery from '@/components/AIGallery';
import GenerationPanel from '@/components/GenerationPanel';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [selectedModel] = useState<{
    id: string;
    name: string;
    description?: string;
    category?: string;
    tier?: string;
    sample_image?: string;
    style?: string;
    thumbnail_url?: string;
    is_premium?: boolean;
    is_featured?: boolean;
    view_count?: number;
    like_count?: number;
  } | null>(null);

  useEffect(() => {
    checkAuth();

    // Subscribe to auth changes if Supabase is configured
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
        if (session?.user) {
          fetchUserInfo(session.user.id);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const checkAuth = async () => {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session?.user) {
      await fetchUserInfo(session.user.id);
    }
  };

  const fetchUserInfo = async (userId: string) => {
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (data) {
        setUserTier(data.subscription_tier || 'free');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            DreamForge AI Art Platform
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Generate stunning AI artwork with cutting-edge models
          </p>
        </div>

        {isAuthenticated && (
          <GenerationPanel
            selectedModel={selectedModel}
            userTier={userTier}
            onGenerate={(result) => console.log('Generated:', result)}
          />
        )}

        <AIGallery
          userTier={userTier}
        />
      </div>
    </main>
  );
}
