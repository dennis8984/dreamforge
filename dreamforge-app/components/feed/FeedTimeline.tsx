'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FeedPost, { FeedPostData } from './FeedPost';

interface FeedTimelineProps {
  isAuthenticated: boolean;
  userId: string | null;
}

type FilterType = 'all' | 'following' | 'images' | 'videos';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'following', label: 'Following' },
  { key: 'images', label: 'Images' },
  { key: 'videos', label: 'Videos' },
];

export default function FeedTimeline({ isAuthenticated, userId }: FeedTimelineProps) {
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('access_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const fetchPosts = useCallback(
    async (pageNum: number, filter: FilterType, append: boolean = false) => {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          pageSize: String(pageSize),
          filter,
        });
        if (userId) {
          params.set('userId', userId);
        }

        const res = await fetch(`/api/feed?${params.toString()}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        const newPosts: FeedPostData[] = data.items || [];
        const totalCount: number = data.total || 0;

        if (append) {
          setPosts((prev) => [...prev, ...newPosts]);
        } else {
          setPosts(newPosts);
        }
        setTotal(totalCount);
        setHasMore(pageNum * pageSize < totalCount);
      } catch (error) {
        console.error('Error fetching feed:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId]
  );

  // Initial load and filter changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPosts(1, activeFilter, false);
  }, [activeFilter, fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, activeFilter, true);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading, page, activeFilter, fetchPosts]);

  const handleReact = async (postId: string, reactionType: string) => {
    if (!isAuthenticated) return;

    try {
      const res = await fetch(`/api/feed/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reaction_type: reactionType }),
      });

      const data = await res.json();

      if (res.ok) {
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;

            let newLikeCount = post.like_count;
            let newReaction: string | null = post.user_reaction;

            if (data.action === 'added') {
              newLikeCount = post.like_count + 1;
              newReaction = reactionType;
            } else if (data.action === 'removed') {
              newLikeCount = Math.max(0, post.like_count - 1);
              newReaction = null;
            } else if (data.action === 'updated') {
              newReaction = reactionType;
            }

            return {
              ...post,
              like_count: newLikeCount,
              user_reaction: newReaction,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
    }
  };

  const handleComment = async (
    postId: string,
    content: string
  ): Promise<{ id: string; post_id: string; user_id: string; content: string; created_at: string } | null> => {
    if (!isAuthenticated) return null;

    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const comment = await res.json();

        // Update comment count on post
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, comment_count: post.comment_count + 1 }
              : post
          )
        );

        return comment;
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
    return null;
  };

  const handleFilterChange = (filter: FilterType) => {
    if (filter === 'following' && !isAuthenticated) return;
    setActiveFilter(filter);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-xl p-1 border border-gray-700">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            disabled={f.key === 'following' && !isAuthenticated}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeFilter === f.key
                ? 'bg-blue-600 text-white shadow-lg'
                : f.key === 'following' && !isAuthenticated
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts count */}
      {!loading && total > 0 && (
        <p className="text-xs text-gray-500 mb-4">
          {total} {total === 1 ? 'post' : 'posts'}
        </p>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-700 rounded mb-1" />
                  <div className="h-3 w-20 bg-gray-700 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-gray-700 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-700 rounded mb-4" />
              <div className="h-48 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No posts yet</h3>
          <p className="text-gray-500">
            {activeFilter === 'following'
              ? 'Follow some characters to see their posts here.'
              : 'Check back later for new content from your favorite characters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              onReact={handleReact}
              onComment={handleComment}
              isAuthenticated={isAuthenticated}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* End of feed */}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-sm text-gray-500 py-6">
              You have reached the end of the feed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
