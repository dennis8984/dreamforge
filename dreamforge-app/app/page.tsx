'use client';

import { useState, useEffect } from 'react';
import AIGallery from '@/components/AIGallery';
import GenerationPanel from '@/components/GenerationPanel';
import Header from '@/components/Header';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [selectedModel, setSelectedModel] = useState<{
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
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      fetchUserInfo();
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/user/usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserTier(data.current_tier);
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
          onModelSelect={setSelectedModel}
        />
      </div>
    </main>
  );
}
