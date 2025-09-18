'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  model_name: string;
  created_at: string;
  likes: number;
  views: number;
}

export default function GalleryPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState('free');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }

    // Load mock gallery images
    loadGalleryImages();
  }, [filter]);

  const loadGalleryImages = () => {
    // Mock data for gallery
    const mockImages: GeneratedImage[] = [
      {
        id: '1',
        prompt: 'A majestic dragon soaring through clouds at sunset',
        image_url: 'https://picsum.photos/400/400?random=1',
        model_name: 'DreamForge XL',
        created_at: '2024-01-15',
        likes: 234,
        views: 1520
      },
      {
        id: '2',
        prompt: 'Cyberpunk city with neon lights and flying cars',
        image_url: 'https://picsum.photos/400/400?random=2',
        model_name: 'Anime Pro',
        created_at: '2024-01-14',
        likes: 189,
        views: 982
      },
      {
        id: '3',
        prompt: 'Ancient forest with mystical glowing mushrooms',
        image_url: 'https://picsum.photos/400/400?random=3',
        model_name: 'Fantasy Master',
        created_at: '2024-01-13',
        likes: 412,
        views: 2341
      },
      {
        id: '4',
        prompt: 'Portrait of a futuristic warrior with energy armor',
        image_url: 'https://picsum.photos/400/400?random=4',
        model_name: 'Realistic Vision',
        created_at: '2024-01-12',
        likes: 567,
        views: 3210
      },
      {
        id: '5',
        prompt: 'Underwater palace made of coral and pearls',
        image_url: 'https://picsum.photos/400/400?random=5',
        model_name: 'DreamForge XL',
        created_at: '2024-01-11',
        likes: 321,
        views: 1876
      },
      {
        id: '6',
        prompt: 'Space station orbiting a purple planet',
        image_url: 'https://picsum.photos/400/400?random=6',
        model_name: 'Sci-Fi Generator',
        created_at: '2024-01-10',
        likes: 445,
        views: 2654
      }
    ];

    setImages(mockImages);
  };

  const filters = ['all', 'trending', 'newest', 'most-liked'];

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
            Community Gallery
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Explore amazing AI-generated artwork from our community
          </p>
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mb-8 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.image_url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                  {image.model_name}
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                  {image.prompt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {image.likes}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {image.views}
                    </span>
                  </div>
                  <span>{new Date(image.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}