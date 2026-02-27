'use client';

import type { RateLimitStatus } from '@/types/chat';

interface ChatRateLimitBannerProps {
  rateLimit: RateLimitStatus;
}

export default function ChatRateLimitBanner({ rateLimit }: ChatRateLimitBannerProps) {
  const { remaining, limit } = rateLimit;

  // Don't show for unlimited tiers
  if (limit === -1) return null;

  // Determine severity
  const isExhausted = remaining <= 0;
  const isWarning = remaining > 0 && remaining <= 5;

  if (!isExhausted && !isWarning) return null;

  const resetsAt = rateLimit.resetsAt
    ? new Date(rateLimit.resetsAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'midnight';

  return (
    <div
      className={`
        px-4 py-2 border-b flex items-center gap-2 text-sm
        ${isExhausted
          ? 'bg-red-900/30 border-red-800/50 text-red-400'
          : 'bg-yellow-900/30 border-yellow-800/50 text-yellow-400'
        }
      `}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isExhausted ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        )}
      </svg>
      <span>
        {isExhausted
          ? `You've reached your daily message limit (${limit}). Resets at ${resetsAt}.`
          : `${remaining} message${remaining !== 1 ? 's' : ''} remaining today. Resets at ${resetsAt}.`}
      </span>
      <a
        href="/pricing"
        className={`
          ml-auto text-xs font-medium px-3 py-1 rounded-full transition-colors
          ${isExhausted
            ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300'
            : 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300'
          }
        `}
      >
        Upgrade
      </a>
    </div>
  );
}
