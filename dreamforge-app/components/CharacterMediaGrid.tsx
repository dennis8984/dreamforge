'use client';

import { useState } from 'react';
import PaywallModal from './PaywallModal';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  is_hd: boolean;
  visibility: 'public' | 'members';
}

interface Props {
  items: MediaItem[];
  isAuthenticated?: boolean;
  isPaidUser?: boolean;
  onAuthClick: () => void;
}

export default function CharacterMediaGrid({ items, isAuthenticated = false, isPaidUser = false, onAuthClick }: Props) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const handleOpen = (item: MediaItem) => {
    if (!isAuthenticated) {
      onAuthClick();
      return;
    }
    if (item.visibility === 'members' && !isPaidUser) {
      setShowPaywall(true);
      return;
    }
    setPreview(item);
  };

  const displayedItems = isAuthenticated && !isPaidUser ? items.slice(0, 5) : items;
  const isLimited = isAuthenticated && !isPaidUser && items.length > 5;
  const blurClass = !isAuthenticated ? 'blur-md' : '';

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedItems.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleOpen(m)}
            className="relative group rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50 hover:scale-[1.01] transition"
          >
            {m.type === 'video' ? (
              <>
                <video src={m.url} className={`w-full aspect-square object-cover ${blurClass}`} muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="media" className={`w-full aspect-square object-cover ${blurClass}`} />
            )}
            {m.visibility === 'members' && (
              <span className="absolute top-2 left-2 px-2 py-1 rounded bg-amber-600/20 text-amber-300 text-xs">Members</span>
            )}
          </button>
        ))}
        {isLimited && (
           <div 
             className="relative group rounded-lg overflow-hidden border border-dashed border-gray-700 bg-gray-900/50 flex flex-col items-center justify-center text-center p-4 cursor-pointer"
             onClick={() => setShowPaywall(true)}
            >
             <div className="text-2xl mb-2">✨</div>
             <div className="font-semibold text-white">Unlock {items.length - 5} More</div>
             <p className="text-sm text-gray-400">Upgrade to a paid plan to see all content.</p>
           </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center p-6 z-50" onClick={() => setPreview(null)}>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt="preview" className="w-full rounded-lg" />
            <div className="mt-3 flex justify-end">
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded bg-gray-800 text-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} model={{ id: 'paywall', name: 'Members-Only Content' }} />
      )}
    </div>
  );
}


