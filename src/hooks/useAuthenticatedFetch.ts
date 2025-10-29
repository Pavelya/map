import { useAdminAuth } from '@/stores/admin-auth';
import { useCallback } from 'react';

/**
 * Hook that provides a fetch wrapper with automatic token refresh
 * @returns Authenticated fetch function
 */
export function useAuthenticatedFetch() {
  const { token, isTokenExpired, refreshToken } = useAdminAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      // Check if token needs refresh
      if (isTokenExpired()) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          throw new Error('Failed to refresh authentication token');
        }
      }

      // Get fresh token after potential refresh
      const currentToken = useAdminAuth.getState().token;

      // Add Authorization header
      const headers = new Headers(options.headers);
      if (currentToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${currentToken}`);
      }

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If we get a 401, try refreshing once more
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the request with new token
          const newToken = useAdminAuth.getState().token;
          if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
            return fetch(url, {
              ...options,
              headers,
            });
          }
        }
      }

      return response;
    },
    [token, isTokenExpired, refreshToken]
  );

  return authenticatedFetch;
}
