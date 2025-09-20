'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  model_name: string;
  created_at: string;
  likes: number;
  views: number;
  is_nsfw: boolean;
  character_id?: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro' | 'premium';
  is_member: boolean;
}

export default function GalleryPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const router = useRouter();
  // const supabase = createClientComponentClient();

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  useEffect(() => {
    if (userProfile !== null) {
      loadGalleryImages();
    }
  }, [filter, userProfile]);

  const checkAuthAndLoadProfile = async () => {
    try {
      // For now, check localStorage for auth token
      const token = localStorage.getItem('access_token');
      if (token) {
        setIsAuthenticated(true);
        // Default to free tier for now
        setUserProfile({
          id: 'demo-user',
          email: 'user@example.com',
          subscription_tier: 'free',
          is_member: false
        });
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryImages = async () => {
    setLoading(true);
    try {
      // For production deployment without Supabase, return sample data
      // This will be replaced when Supabase is properly configured
      const sampleImages: GeneratedImage[] = [
        {
          id: '1',
          prompt: 'Professional adult model portrait',
          image_url: '/api/placeholder/400/400',
          model_name: 'DreamForge XL',
          created_at: new Date().toISOString(),
          likes: 234,
          views: 1520,
          is_nsfw: true,
          user_id: 'user1'
        },
        {
          id: '2',
          prompt: 'Artistic nude photography',
          image_url: '/api/placeholder/400/400',
          model_name: 'NSFW Pro',
          created_at: new Date().toISOString(),
          likes: 189,
          views: 982,
          is_nsfw: true,
          user_id: 'user2'
        }
      ];

      setImages(sampleImages);
    } catch (error) {
      console.error('Error loading gallery:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: GeneratedImage) => {
    // Check if image is NSFW and user is not a member
    if (image.is_nsfw && (!userProfile || !userProfile.is_member)) {
      setShowPaywall(true);
      return;
    }

    // Navigate to image detail page
    router.push(`/gallery/${image.id}`);
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  const filters = ['all', 'trending', 'newest', 'most-liked'];

  // Blur style for NSFW content for non-members
  const getNSFWStyle = (image: GeneratedImage) => {
    if (image.is_nsfw && (!userProfile || !userProfile.is_member)) {
      return 'blur-xl';
    }
    return '';
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userProfile?.subscription_tier || 'free'}
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

        {/* Paywall Modal */}
        {showPaywall && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Premium Content
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This content is exclusive to our members. Upgrade your account to unlock full access to all NSFW galleries and character profiles.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => setShowPaywall(false)}
                  className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No images found. Be the first to create!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                onClick={() => handleImageClick(image)}
                className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer relative"
              >
                <div className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className={`w-full h-full object-cover ${getNSFWStyle(image)}`}
                  />

                  {/* NSFW Badge for non-members */}
                  {image.is_nsfw && (!userProfile || !userProfile.is_member) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="text-white font-semibold">Members Only</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    {image.model_name}
                  </div>

                  {/* NSFW indicator */}
                  {image.is_nsfw && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-600/80 text-white text-xs rounded font-semibold">
                      NSFW
                    </div>
                  )}
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
        )}
      </div>
    </main>
  );
}