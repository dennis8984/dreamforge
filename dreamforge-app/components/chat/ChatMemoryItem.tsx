'use client';

import { useState } from 'react';
import type { UserMemory, MemoryCategory } from '@/types/chat';

interface ChatMemoryItemProps {
  memory: UserMemory;
  onDelete: () => void;
}

const CATEGORY_STYLES: Record<MemoryCategory, { label: string; color: string; bg: string }> = {
  fact: { label: 'Fact', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  preference: { label: 'Preference', color: 'text-green-400', bg: 'bg-green-500/10' },
  relationship: { label: 'Relationship', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  emotional: { label: 'Emotional', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  context: { label: 'Context', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  boundary: { label: 'Boundary', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function ChatMemoryItem({ memory, onDelete }: ChatMemoryItemProps) {
  const [confirming, setConfirming] = useState(false);

  const style = CATEGORY_STYLES[memory.category] || CATEGORY_STYLES.fact;
  const confidencePct = Math.round(memory.confidence * 100);

  const handleDelete = () => {
    if (confirming) {
      onDelete();
    } else {
      setConfirming(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 group">
      {/* Category badge and delete */}
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${style.color} ${style.bg}`}>
          {style.label}
        </span>
        <button
          onClick={handleDelete}
          className={`
            text-xs px-2 py-0.5 rounded transition-all
            ${confirming
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-gray-700'
            }
          `}
        >
          {confirming ? 'Confirm?' : 'Delete'}
        </button>
      </div>

      {/* Key-Value */}
      <div className="mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{memory.key}</p>
        <p className="text-sm text-gray-200 mt-0.5">{memory.value}</p>
      </div>

      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              confidencePct >= 80
                ? 'bg-green-500'
                : confidencePct >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{confidencePct}%</span>
      </div>
    </div>
  );
}
