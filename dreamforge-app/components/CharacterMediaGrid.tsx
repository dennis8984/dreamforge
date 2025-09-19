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
  isPaidUser?: boolean;
}

export default function CharacterMediaGrid({ items, isPaidUser = false }: Props) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const handleOpen = (item: MediaItem) => {
    if (item.visibility === 'members' && !isPaidUser) {
      setShowPaywall(true);
      return;
    }
    setPreview(item);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleOpen(m)}
            className="relative group rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50 hover:scale-[1.01] transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt="media" className="w-full aspect-square object-cover" />
            {m.visibility === 'members' && (
              <span className="absolute top-2 left-2 px-2 py-1 rounded bg-amber-600/20 text-amber-300 text-xs">Members</span>
            )}
          </button>
        ))}
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


