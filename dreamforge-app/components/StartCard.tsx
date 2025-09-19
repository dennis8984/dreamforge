'use client';

import React from 'react';

interface StartCardProps {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export default function StartCard({ title, subtitle, onClick, icon }: StartCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-56 rounded-xl bg-gray-900/80 border border-gray-700 hover:border-blue-500 hover:shadow-blue-500/20 hover:shadow-xl transition-all flex flex-col items-center justify-center text-center p-6"
    >
      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        {icon || (
          <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        )}
      </div>
      <div className="text-white text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-gray-400 text-sm mt-2 max-w-xs">{subtitle}</div>}
    </button>
  );
}


