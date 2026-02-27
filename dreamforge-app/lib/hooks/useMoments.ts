'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useCallback } from 'react';
import { MOMENTS_COSTS } from '@/lib/moments-config';

export function useMoments() {
  const { momentsBalance, adjustMoments, setMomentsBalance } = useAuthStore();

  const canAfford = useCallback((cost: keyof typeof MOMENTS_COSTS) => {
    return momentsBalance >= MOMENTS_COSTS[cost];
  }, [momentsBalance]);

  const refreshBalance = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch('/api/moments/balance', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMomentsBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to refresh moments balance:', error);
    }
  }, [setMomentsBalance]);

  return {
    balance: momentsBalance,
    canAfford,
    adjustMoments,
    refreshBalance,
    costs: MOMENTS_COSTS,
  };
}
