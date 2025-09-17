'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ModelCard from './ModelCard';
import PaywallModal from './PaywallModal';

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  is_premium: boolean;
  is_featured: boolean;
  view_count: number;
  like_count: number;
}

interface AIGalleryProps {
  userTier: string;
  onModelSelect: (model: Model) => void;
}

export default function AIGallery({ userTier, onModelSelect }: AIGalleryProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showPaywall, setShowPaywall] = useState(false);
  const [blockedModel, setBlockedModel] = useState<Model | null>(null);

  useEffect(() => {
    fetchModels();
  }, [filter]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('category', filter);

      const response = await fetch(`http://localhost:8000/api/models?${params}`);
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelClick = async (model: Model) => {
    if (model.is_premium && userTier === 'free') {
      setBlockedModel(model);
      setShowPaywall(true);
    } else {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/models/${model.id}/profile`, {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });

        const fullProfile = await response.json();

        if (fullProfile.paywall_active) {
          setBlockedModel(model);
          setShowPaywall(true);
        } else {
          onModelSelect(fullProfile);
        }
      } catch (error) {
        console.error('Error fetching model profile:', error);
      }
    }
  };

  const categories = ['all', 'realistic', 'anime', 'abstract', '3d', 'artistic'];

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Explore AI Models</h2>

        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 dark:bg-gray-700 h-64 rounded-lg"></div>
              <div className="mt-3 h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="mt-2 h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              userTier={userTier}
              onClick={() => handleModelClick(model)}
            />
          ))}
        </div>
      )}

      {showPaywall && blockedModel && (
        <PaywallModal
          model={blockedModel}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}