'use client';

import { useState, useCallback } from 'react';

export default function MissionControlBrowser() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [typeText, setTypeText] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const captureScreenshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (customUrl) params.set('url', customUrl);

      const res = await fetch(`/api/admin/openclaw/control-ui/screenshot?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setScreenshot(data.imageBase64);
      }
    } catch {
      setError('Failed to capture screenshot');
    } finally {
      setLoading(false);
    }
  }, [customUrl]);

  const handleInteraction = async (type: 'click' | 'type' | 'scroll', extra?: { x?: number; y?: number }) => {
    setInteracting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { type };
      if (type === 'click' && extra) {
        body.x = extra.x;
        body.y = extra.y;
      }
      if (type === 'type') {
        body.text = typeText;
        if (extra) {
          body.x = extra.x;
          body.y = extra.y;
        }
      }
      if (type === 'scroll') {
        body.scrollY = 300;
      }

      const res = await fetch('/api/admin/openclaw/control-ui/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success && data.screenshotBase64) {
        setScreenshot(data.screenshotBase64);
        if (type === 'type') setTypeText('');
      } else {
        setError(data.error || 'Interaction failed');
      }
    } catch {
      setError('Failed to perform interaction');
    } finally {
      setInteracting(false);
    }
  };

  const handleScreenshotClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    // Calculate relative position scaled to actual viewport (1280x720)
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 720);
    handleInteraction('click', { x, y });
  };

  // Auto-refresh effect
  useState(() => {
    if (autoRefresh) {
      const interval = setInterval(captureScreenshot, 5000);
      return () => clearInterval(interval);
    }
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Target URL (optional override)
          </label>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Uses OPENCLAW_CONTROL_UI_URL by default"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          onClick={captureScreenshot}
          disabled={loading}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Capturing...' : 'Capture Screenshot'}
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          Auto-refresh (5s)
        </label>
      </div>

      {/* Type Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={typeText}
          onChange={(e) => setTypeText(e.target.value)}
          placeholder="Text to type (click screenshot location first)..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typeText) handleInteraction('type');
          }}
        />
        <button
          onClick={() => handleInteraction('scroll')}
          disabled={interacting}
          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Scroll Down
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Screenshot Display */}
      <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
        {(loading || interacting) && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {loading ? 'Capturing...' : 'Interacting...'}
              </span>
            </div>
          </div>
        )}

        {screenshot ? (
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Control UI Screenshot"
            className="w-full cursor-crosshair"
            onClick={handleScreenshotClick}
            title="Click to interact with the Control UI"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <svg className="w-16 h-16 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Click &quot;Capture Screenshot&quot; to view the Control UI</p>
            <p className="text-xs text-gray-400 mt-1">Requires Browserless API key to be configured</p>
          </div>
        )}
      </div>

      {screenshot && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Click anywhere on the screenshot to interact. Use the text input above to type.
        </p>
      )}
    </div>
  );
}
