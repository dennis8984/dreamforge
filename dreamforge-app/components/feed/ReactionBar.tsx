'use client';

import { useState } from 'react';

interface ReactionBarProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  userReaction: string | null;
  onReact: (postId: string, reactionType: string) => void;
  onToggleComments: () => void;
}

const reactions = [
  { type: 'like', icon: '👍', label: 'Like' },
  { type: 'heart', icon: '❤️', label: 'Heart' },
  { type: 'fire', icon: '🔥', label: 'Fire' },
  { type: 'wow', icon: '😮', label: 'Wow' },
];

export default function ReactionBar({
  postId,
  likeCount,
  commentCount,
  userReaction,
  onReact,
  onToggleComments,
}: ReactionBarProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const activeReaction = reactions.find((r) => r.type === userReaction);

  const handleReactionClick = (reactionType: string) => {
    onReact(postId, reactionType);
    setShowReactionPicker(false);
  };

  return (
    <div className="border-t border-gray-700 pt-3">
      {/* Counts row */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-2 px-1">
        <span>
          {likeCount > 0 && (
            <>
              {activeReaction ? activeReaction.icon : '👍'} {likeCount}{' '}
              {likeCount === 1 ? 'reaction' : 'reactions'}
            </>
          )}
        </span>
        <button
          onClick={onToggleComments}
          className="hover:text-gray-200 transition-colors"
        >
          {commentCount > 0
            ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`
            : 'Comment'}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 relative">
        {/* Reaction button with hover picker */}
        <div
          className="relative flex-1"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          <button
            onClick={() => handleReactionClick(userReaction || 'like')}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors text-sm font-medium ${
              userReaction
                ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            }`}
          >
            <span className="text-base">{activeReaction ? activeReaction.icon : '👍'}</span>
            <span>{activeReaction ? activeReaction.label : 'Like'}</span>
          </button>

          {/* Reaction picker popover */}
          {showReactionPicker && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-1 bg-gray-700 rounded-full px-2 py-1.5 shadow-xl border border-gray-600 z-10">
              {reactions.map((reaction) => (
                <button
                  key={reaction.type}
                  onClick={() => handleReactionClick(reaction.type)}
                  title={reaction.label}
                  className={`text-xl hover:scale-125 transition-transform px-1.5 py-0.5 rounded-full ${
                    userReaction === reaction.type ? 'bg-gray-600' : ''
                  }`}
                >
                  {reaction.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment button */}
        <button
          onClick={onToggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>Comment</span>
        </button>

        {/* Share button */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ url: window.location.origin + '/feed?post=' + postId });
            } else {
              navigator.clipboard.writeText(window.location.origin + '/feed?post=' + postId);
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
