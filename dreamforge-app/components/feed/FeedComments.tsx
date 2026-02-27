'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface FeedCommentsProps {
  postId: string;
  commentCount: number;
  isExpanded: boolean;
  onComment: (postId: string, content: string) => Promise<Comment | null>;
  isAuthenticated: boolean;
}

export default function FeedComments({
  postId,
  commentCount,
  isExpanded,
  onComment,
  isAuthenticated,
}: FeedCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isExpanded && comments.length === 0 && commentCount > 0) {
      loadComments();
    }
  }, [isExpanded]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/feed/${postId}/comments?pageSize=50`, { headers });
      const data = await res.json();
      setComments(data.items || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await onComment(postId, commentText.trim());
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

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
    return date.toLocaleDateString();
  };

  if (!isExpanded) return null;

  const visibleComments = showAll ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3 && !showAll;

  return (
    <div className="border-t border-gray-700 pt-3 mt-1">
      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-3 mb-3">
          {visibleComments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-700/50 rounded-xl px-3 py-2">
                  <p className="text-xs text-gray-400 mb-0.5">
                    {comment.user_id.substring(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-200 break-words">{comment.content}</p>
                </div>
                <span className="text-xs text-gray-500 ml-3 mt-0.5 inline-block">
                  {formatTime(comment.created_at)}
                </span>
              </div>
            </div>
          ))}

          {comments.length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center py-2">
              No comments yet. Be the first to comment!
            </p>
          )}

          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors ml-11"
            >
              View all {comments.length} comments
            </button>
          )}
        </div>
      )}

      {/* Comment input */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="flex-1 flex items-center bg-gray-700/50 rounded-full overflow-hidden">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              maxLength={2000}
              className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="px-3 py-2 text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-500 text-center py-2">
          Sign in to leave a comment
        </p>
      )}
    </div>
  );
}
