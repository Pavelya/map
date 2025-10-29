import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AdminUser } from '@/types/admin';

// Safe storage that works with SSR
const storage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

interface AdminAuthState {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  tokenExpiry: number | null;
  setHasHydrated: (state: boolean) => void;
  setAuth: (admin: AdminUser, token: string) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      tokenExpiry: null,

      setHasHydrated: (state) => {
        set({ hasHydrated: state });
      },

      setAuth: (admin, token) => {
        // Decode token to get expiry time
        let tokenExpiry = null;
        try {
          const parts = token.split('.');
          if (parts.length === 3 && parts[1]) {
            const payload = JSON.parse(atob(parts[1]));
            tokenExpiry = payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
          }
        } catch (error) {
          console.error('Failed to decode token:', error);
        }

        set({
          admin,
          token,
          tokenExpiry,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        set({
          admin: null,
          token: null,
          tokenExpiry: null,
          isAuthenticated: false,
        });
      },

      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        // Consider token expired if it expires in less than 5 minutes
        return Date.now() >= tokenExpiry - 5 * 60 * 1000;
      },

      refreshToken: async () => {
        try {
          const response = await fetch('/api/admin/auth/refresh', {
            method: 'POST',
            credentials: 'include', // Include cookies
          });

          if (!response.ok) {
            throw new Error('Failed to refresh token');
          }

          const result = await response.json();

          if (result.accessToken) {
            const { admin } = get();
            if (admin) {
              get().setAuth(admin, result.accessToken);
              return true;
            }
          }

          return false;
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Clear auth if refresh fails
          get().clearAuth();
          return false;
        }
      },

      logout: async () => {
        const { token } = get();

        // Call logout API if token exists
        if (token) {
          try {
            await fetch('/api/admin/auth/logout', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }

        // Clear auth state
        get().clearAuth();
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        tokenExpiry: state.tokenExpiry,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Check if token is expired on rehydration (only on client)
        if (typeof window !== 'undefined' && state?.isTokenExpired()) {
          state?.refreshToken();
        }
      },
    }
  )
);
