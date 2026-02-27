'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatLayout from '@/components/chat/ChatLayout';
import { supabase } from '@/lib/supabase';

export default function ChatPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');

  useEffect(() => {
    checkAuth();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
        if (session?.user) {
          fetchUserTier(session.user.id);
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
      await fetchUserTier(session.user.id);
    }
  };

  const fetchUserTier = async (userId: string) => {
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
      console.error('Error fetching user tier:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
      />
      <ChatLayout />
    </main>
  );
}
