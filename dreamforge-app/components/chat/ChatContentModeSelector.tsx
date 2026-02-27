'use client';

import { useState, useRef, useEffect } from 'react';
import type { ContentMode } from '@/types/chat';
import { CONTENT_MODES, canAccessMode } from '@/lib/content-modes';

interface ChatContentModeSelectorProps {
  value: ContentMode;
  onChange: (mode: ContentMode) => void;
  userTier?: string;
}

export default function ChatContentModeSelector({
  value,
  onChange,
  userTier = 'free',
}: ChatContentModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMode = CONTENT_MODES[value];
  const modes = Object.values(CONTENT_MODES);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-700
          bg-gray-800 hover:bg-gray-750 transition-colors text-sm
          ${currentMode.color}
        `}
      >
        <span className={`w-2 h-2 rounded-full ${currentMode.bgColor.replace('/10', '')}`} />
        <span className="font-medium">{currentMode.label}</span>
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl shadow-black/30 overflow-hidden z-50">
          {modes.map((mode) => {
            const accessible = canAccessMode(mode.id, userTier);
            return (
              <button
                key={mode.id}
                onClick={() => {
                  if (accessible) {
                    onChange(mode.id);
                    setOpen(false);
                  }
                }}
                disabled={!accessible}
                className={`
                  w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
                  ${accessible
                    ? 'hover:bg-gray-700/60 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                  }
                  ${mode.id === value ? 'bg-gray-700/40' : ''}
                `}
                title={!accessible ? `Upgrade to ${mode.requiredTier} to unlock` : undefined}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${mode.bgColor.replace('/10', '')}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${mode.color}`}>{mode.label}</span>
                    <span className="text-xs text-gray-500">({mode.id})</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
                </div>
                {!accessible && (
                  <span className="text-xs bg-yellow-600/20 text-yellow-500 px-2 py-0.5 rounded-full flex-shrink-0">
                    Upgrade
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
