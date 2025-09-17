'use client';

import Image from 'next/image';

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

interface ModelCardProps {
  model: Model;
  userTier: string;
  onClick: () => void;
}

export default function ModelCard({ model, userTier, onClick }: ModelCardProps) {
  const isLocked = model.is_premium && userTier === 'free';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative aspect-square">
        {model.thumbnail_url ? (
          <img
            src={model.thumbnail_url}
            alt={model.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-600"></div>
        )}

        {model.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
              FEATURED
            </span>
          </div>
        )}

        {isLocked && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-white text-center">
              <svg
                className="w-8 h-8 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="font-semibold">Premium Model</p>
              <button className="mt-2 px-4 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
                Upgrade to View
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{model.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{model.description}</p>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {model.view_count}
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {model.like_count}
            </span>
          </div>
          {model.is_premium && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded">
              PRO
            </span>
          )}
        </div>
      </div>
    </div>
  );
}