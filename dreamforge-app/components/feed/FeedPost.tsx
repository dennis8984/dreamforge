'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactionBar from './ReactionBar';
import FeedComments from './FeedComments';

interface Character {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string;
}

export interface FeedPostData {
  id: string;
  character_id: string;
  post_type: string;
  content: string;
  media_urls: string[];
  visibility: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  character: Character;
  user_reaction: string | null;
}

interface FeedPostProps {
  post: FeedPostData;
  onReact: (postId: string, reactionType: string) => void;
  onComment: (postId: string, content: string) => Promise<{ id: string; post_id: string; user_id: string; content: string; created_at: string } | null>;
  isAuthenticated: boolean;
}

export default function FeedPost({ post, onReact, onComment, isAuthenticated }: FeedPostProps) {
  const [showComments, setShowComments] = useState(false);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  const getMediaGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  const postTypeIcon = () => {
    switch (post.post_type) {
      case 'image':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <article className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Post header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Link href={`/character/${post.character.slug}`} className="flex-shrink-0">
          {post.character.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={post.character.avatar_url}
              alt={post.character.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {post.character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/character/${post.character.slug}`}
              className="text-white font-semibold text-sm hover:underline truncate"
            >
              {post.character.name}
            </Link>
            {postTypeIcon() && (
              <span className="text-gray-400">{postTypeIcon()}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">{formatTime(post.created_at)}</p>
        </div>

        {/* Post type badge */}
        {post.post_type !== 'status' && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300 capitalize">
            {post.post_type}
          </span>
        )}
      </div>

      {/* Post content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-200 text-sm whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>
        </div>
      )}

      {/* Media grid */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className={`grid ${getMediaGridClass(post.media_urls.length)} gap-0.5`}>
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div
              key={i}
              className={`relative ${
                post.media_urls.length === 3 && i === 0 ? 'row-span-2' : ''
              } ${post.media_urls.length === 1 ? 'max-h-[500px]' : 'aspect-square'} overflow-hidden`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Post media ${i + 1}`}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                loading="lazy"
              />
              {/* Show overlay for extra images */}
              {i === 3 && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    +{post.media_urls.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reaction bar */}
      <div className="px-4 py-2">
        <ReactionBar
          postId={post.id}
          likeCount={post.like_count}
          commentCount={post.comment_count}
          userReaction={post.user_reaction}
          onReact={onReact}
          onToggleComments={() => setShowComments(!showComments)}
        />
      </div>

      {/* Comments section */}
      <div className="px-4 pb-4">
        <FeedComments
          postId={post.id}
          commentCount={post.comment_count}
          isExpanded={showComments}
          onComment={onComment}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </article>
  );
}
