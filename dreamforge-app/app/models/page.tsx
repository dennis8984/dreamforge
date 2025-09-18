'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ModelCard from '@/components/ModelCard';

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
  nano_banana_model?: string; // Nano Banana model identifier
}

export default function ModelsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadModels = async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      } else {
        // Use mock data if API is not available
        setModels(getMockModels());
      }
    } catch {
      console.log('Using mock data for models');
      setModels(getMockModels());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);


  const getMockModels = (): Model[] => [
    {
      id: '1',
      name: 'DreamForge XL',
      description: 'High-quality general purpose model with excellent prompt adherence',
      category: 'realistic',
      thumbnail_url: 'https://picsum.photos/400/400?random=10',
      is_premium: false,
      is_featured: true,
      view_count: 15420,
      like_count: 3241,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '2',
      name: 'Anime Pro Max',
      description: 'Specialized in anime and manga art styles with vibrant colors',
      category: 'anime',
      thumbnail_url: 'https://picsum.photos/400/400?random=11',
      is_premium: true,
      is_featured: true,
      view_count: 12350,
      like_count: 2891,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '3',
      name: 'Photorealistic Vision',
      description: 'Ultra-realistic human portraits and photography',
      category: 'realistic',
      thumbnail_url: 'https://picsum.photos/400/400?random=12',
      is_premium: true,
      is_featured: false,
      view_count: 9820,
      like_count: 1876,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '4',
      name: 'Abstract Dreams',
      description: 'Surreal and abstract artistic compositions',
      category: 'abstract',
      thumbnail_url: 'https://picsum.photos/400/400?random=13',
      is_premium: false,
      is_featured: false,
      view_count: 7654,
      like_count: 1432,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '5',
      name: '3D Render Pro',
      description: 'High-quality 3D renders with realistic lighting',
      category: '3d',
      thumbnail_url: 'https://picsum.photos/400/400?random=14',
      is_premium: true,
      is_featured: true,
      view_count: 11234,
      like_count: 2156,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '6',
      name: 'Fantasy Worlds',
      description: 'Epic fantasy landscapes and creature designs',
      category: 'artistic',
      thumbnail_url: 'https://picsum.photos/400/400?random=15',
      is_premium: false,
      is_featured: false,
      view_count: 8976,
      like_count: 1678,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '7',
      name: 'Pixel Art Master',
      description: 'Retro pixel art and 8-bit style graphics',
      category: 'artistic',
      thumbnail_url: 'https://picsum.photos/400/400?random=16',
      is_premium: false,
      is_featured: false,
      view_count: 6543,
      like_count: 987,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    },
    {
      id: '8',
      name: 'Sci-Fi Generator',
      description: 'Futuristic technology and space scenes',
      category: '3d',
      thumbnail_url: 'https://picsum.photos/400/400?random=17',
      is_premium: true,
      is_featured: false,
      view_count: 9123,
      like_count: 1789,
      nano_banana_model: 'gemini-2.5-flash-image-preview'
    }
  ];

  const handleModelClick = (model: Model) => {
    // Navigate to model profile page
    window.location.href = `/model/${model.id}`;
  };

  const categories = ['all', 'realistic', 'anime', 'abstract', '3d', 'artistic'];
  const filteredModels = filter === 'all'
    ? models
    : models.filter(m => m.category === filter);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Model Library
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose from our collection of cutting-edge AI models powered by Nano Banana
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex space-x-2 mb-8 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Models Grid */}
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
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                userTier={userTier}
                onClick={() => handleModelClick(model)}
              />
            ))}
          </div>
        )}

        {/* Model Stats */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Powered by Nano Banana SDK
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{models.length}</div>
              <div className="text-gray-600 dark:text-gray-400">Available Models</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {models.filter(m => m.is_premium).length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Premium Models</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                Gemini 2.5
              </div>
              <div className="text-gray-600 dark:text-gray-400">AI Engine</div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}