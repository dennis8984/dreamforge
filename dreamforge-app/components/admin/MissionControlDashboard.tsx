'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HealthStatus } from '@/types/openclaw';

interface ConfigStatus {
  hooksConfigured: boolean;
  browserlessConfigured: boolean;
  hooksUrl: string;
  controlUiUrl: string;
  hasGatewayToken: boolean;
}

export default function MissionControlDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);
  const [wakeResult, setWakeResult] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/openclaw/health?admin=true', {
        headers: { 'x-admin-key': 'dreamforge_admin_2024' },
      });
      const data = await res.json();
      setHealth(data.health);
      setConfig(data.config);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth({
        online: false,
        lastChecked: new Date().toISOString(),
        hooksUrl: 'Error',
        error: 'Failed to reach health endpoint',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleWake = async () => {
    setWaking(true);
    setWakeResult(null);
    try {
      const res = await fetch('/api/admin/openclaw/hooks/wake?admin=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'dreamforge_admin_2024',
        },
        body: JSON.stringify({ text: 'wake', mode: 'normal' }),
      });
      const data = await res.json();
      setWakeResult(data.success ? 'System awakened successfully' : `Failed: ${data.error}`);
      if (data.success) {
        setTimeout(checkHealth, 2000);
      }
    } catch {
      setWakeResult('Failed to send wake signal');
    } finally {
      setWaking(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Connection Status */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bot Status</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              health?.online
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-1.5 ${health?.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {health?.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {health?.online ? 'Connected' : 'Disconnected'}
          </div>
          {health?.latency && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Latency: {health.latency}ms
            </p>
          )}
          {health?.error && (
            <p className="text-sm text-red-500 mt-1">{health.error}</p>
          )}
        </div>

        {/* Hooks Configuration */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Hooks API</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              config?.hooksConfigured
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {config?.hooksConfigured ? 'Configured' : 'Not Set'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
            {config?.hooksUrl || 'Not configured'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gateway Token: {config?.hasGatewayToken ? 'Set' : 'Not set'}
          </p>
        </div>

        {/* Browserless Status */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Browserless</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              config?.browserlessConfigured
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {config?.browserlessConfigured ? 'Ready' : 'Not Set'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Control UI proxy for remote access
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
            {config?.controlUiUrl || 'URL not set'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleWake}
            disabled={waking}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {waking ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Waking...
              </span>
            ) : 'Wake System'}
          </button>

          <button
            onClick={checkHealth}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh Status
          </button>
        </div>

        {wakeResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            wakeResult.includes('success')
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {wakeResult}
          </div>
        )}
      </div>

      {/* Last Checked */}
      {health?.lastChecked && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Last checked: {new Date(health.lastChecked).toLocaleString()}
        </p>
      )}
    </div>
  );
}
