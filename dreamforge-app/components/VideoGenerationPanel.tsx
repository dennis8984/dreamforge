'use client';

import { useState, useRef, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import { MOMENTS_COSTS } from '@/lib/moments-config';

interface VideoGenerationPanelProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

type Duration = 5;
type JobStatus = 'idle' | 'submitting' | 'queued' | 'processing' | 'completed' | 'failed';

export default function VideoGenerationPanel({ onVideoGenerated }: VideoGenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [duration] = useState<Duration>(5);
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('sb-access-token');
    if (raw) return raw;
    // Try to find the token from supabase storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '');
          return parsed?.access_token || null;
        } catch {
          continue;
        }
      }
    }
    return null;
  };

  const pollForCompletion = useCallback(async (jobId: string) => {
    const token = getToken();
    const maxAttempts = 120; // 10 minutes at 5s intervals
    let attempts = 0;

    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setJobStatus('failed');
        setError('Video generation timed out. Please try again.');
        return;
      }

      try {
        const res = await fetch(`/api/video/status?jobId=${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('Failed to check status');
        }

        const data = await res.json();

        if (data.status === 'completed' && data.videoUrl) {
          setJobStatus('completed');
          setVideoUrl(data.videoUrl);
          onVideoGenerated?.(data.videoUrl);
          return;
        } else if (data.status === 'failed') {
          setJobStatus('failed');
          setError(data.error || 'Video generation failed');
          return;
        } else {
          setJobStatus(data.status === 'queued' ? 'queued' : 'processing');
          pollingRef.current = setTimeout(poll, 5000);
        }
      } catch {
        setJobStatus('failed');
        setError('Lost connection while checking video status');
      }
    };

    poll();
  }, [onVideoGenerated]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !sourceImageUrl.trim()) return;

    setError(null);
    setVideoUrl(null);
    setJobStatus('submitting');

    try {
      const token = getToken();
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceImageUrl: sourceImageUrl.trim(),
          durationSeconds: duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      setJobStatus('queued');
      pollForCompletion(data.jobId);
    } catch (err) {
      setJobStatus('failed');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleReset = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    setJobStatus('idle');
    setVideoUrl(null);
    setError(null);
    setPrompt('');
    setSourceImageUrl('');
  };

  const isGenerating = ['submitting', 'queued', 'processing'].includes(jobStatus);

  const statusMessages: Record<string, string> = {
    submitting: 'Submitting job...',
    queued: 'In queue, waiting to start...',
    processing: 'Generating your video...',
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Video Generation</h3>
        <span className="text-sm text-purple-400 font-medium">
          Cost: {MOMENTS_COSTS.VIDEO_GENERATION} moments
        </span>
      </div>

      {/* Completed video */}
      {jobStatus === 'completed' && videoUrl && (
        <div className="mb-4">
          <VideoPlayer src={videoUrl} className="w-full aspect-video rounded-lg" />
          <button
            onClick={handleReset}
            className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Generate Another
          </button>
        </div>
      )}

      {/* Error display */}
      {jobStatus === 'failed' && error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={handleReset}
            className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Generation in progress */}
      {isGenerating && (
        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300 text-sm">{statusMessages[jobStatus]}</p>
          </div>
          <div className="mt-3 w-full bg-gray-600 rounded-full h-1.5">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000 animate-pulse"
              style={{
                width: jobStatus === 'submitting' ? '10%' : jobStatus === 'queued' ? '30%' : '70%',
              }}
            />
          </div>
        </div>
      )}

      {/* Form (show when idle or failed) */}
      {(jobStatus === 'idle' || jobStatus === 'failed') && (
        <>
          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 transition-colors"
            rows={3}
          />

          <label className="block mt-3 text-sm text-gray-400">
            Still
            <input
              type="url"
              value={sourceImageUrl}
              onChange={(e) => setSourceImageUrl(e.target.value)}
              placeholder="https://example.com/still.jpg"
              className="mt-2 w-full p-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-[#ff4d8d] transition-colors"
            />
          </label>
          <p className="mt-3 text-sm text-gray-400">Clip length: {duration} seconds</p>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || !sourceImageUrl.trim() || isGenerating}
            className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Generate Video ({MOMENTS_COSTS.VIDEO_GENERATION} moments)
          </button>
        </>
      )}
    </div>
  );
}
