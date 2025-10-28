import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/types/admin';

interface AdminAuthState {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (admin: AdminUser, token: string) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,

      setAuth: (admin, token) => {
        set({
          admin,
          token,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
        });
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
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
