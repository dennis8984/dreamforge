import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  tier: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  tier: string;
  momentsBalance: number;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setTier: (tier: string) => void;
  setMomentsBalance: (balance: number) => void;
  adjustMoments: (amount: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  tier: 'free',
  momentsBalance: 0,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, tier: user?.tier || 'free', isLoading: false }),
  setTier: (tier) => set({ tier }),
  setMomentsBalance: (balance) => set({ momentsBalance: balance }),
  adjustMoments: (amount) => set((state) => ({ momentsBalance: state.momentsBalance + amount })),
  logout: () => set({ user: null, isAuthenticated: false, tier: 'free', momentsBalance: 0 }),
}));
