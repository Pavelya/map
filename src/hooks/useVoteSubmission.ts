'use client';

import { useState, useCallback } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { latLngToCell } from 'h3-js';
import { getBrowserLocation, isGeolocationSupported } from '@/lib/geo/browser-geo';
import { getErrorMessage, createVoteError } from '@/lib/vote-errors';
import type { VoteSubmissionData, VoteResponse } from '@/types/api';

interface VoteData {
  matchId: string;
  teamChoice: 'team_a' | 'team_b';
  consentPreciseGeo: boolean;
  captchaToken?: string | undefined;
}

interface UseVoteSubmissionReturn {
  submitVote: (data: VoteData) => Promise<VoteResponse>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for handling vote submission with geolocation and fingerprinting
 */
export function useVoteSubmission(): UseVoteSubmissionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get browser fingerprint for fraud detection
   */
  const getFingerprint = useCallback(async (): Promise<string> => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId;
    } catch (error) {
      console.error('Failed to get fingerprint:', error);
      // Return a fallback fingerprint based on user agent
      return `fallback_${navigator.userAgent.length}_${Date.now()}`;
    }
  }, []);

  /**
   * Get user location based on consent
   */
  const getLocation = useCallback(async (consentPreciseGeo: boolean) => {
    const h3Resolution = consentPreciseGeo ? 7 : 5;

    // If consent given and geolocation supported, get browser location
    if (consentPreciseGeo && isGeolocationSupported()) {
      try {
        const coords = await getBrowserLocation({
          useCache: true,
          timeout: 10000,
          enableHighAccuracy: true,
        });

        const h3Index = latLngToCell(
          coords.latitude,
          coords.longitude,
          h3Resolution
        );

        return {
          h3Index,
          h3Resolution,
          source: 'browser_geo' as const,
          consentPreciseGeo: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      } catch (geoError: any) {
        console.warn('Browser geolocation failed, will use IP fallback:', geoError);
        // Fall through to IP-based location
      }
    }

    // Fallback: server will use IP-based location
    // Return minimal location data, server will fill in the rest
    return {
      h3Index: '', // Server will populate
      h3Resolution,
      source: 'ip' as const,
      consentPreciseGeo: false,
    };
  }, []);

  /**
   * Submit vote to the API
   */
  const submitVote = useCallback(
    async (data: VoteData): Promise<VoteResponse> => {
      setLoading(true);
      setError(null);

      try {
        // 1. Get fingerprint
        const fingerprint = await getFingerprint();

        // 2. Get location based on consent
        const location = await getLocation(data.consentPreciseGeo);

        // 3. Prepare submission data
        const submissionData: VoteSubmissionData = {
          matchId: data.matchId,
          teamChoice: data.teamChoice,
          fingerprint,
          location: {
            h3Index: location.h3Index,
            h3Resolution: location.h3Resolution,
            source: location.source,
            consentPreciseGeo: location.consentPreciseGeo,
            ...(location.latitude && { latitude: location.latitude }),
            ...(location.longitude && { longitude: location.longitude }),
          },
          ...(data.captchaToken && { captchaToken: data.captchaToken }),
          userAgent: navigator.userAgent,
        };

        // 4. Submit to API
        const response = await fetch('/api/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
        });

        // 5. Handle response
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Network error',
            code: 'NETWORK_ERROR',
          }));

          throw createVoteError(
            errorData.code || 'UNKNOWN_ERROR',
            errorData
          );
        }

        const result: VoteResponse = await response.json();

        if (!result.success) {
          throw createVoteError('UNKNOWN_ERROR', result);
        }

        return result;
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getFingerprint, getLocation]
  );

  return {
    submitVote,
    loading,
    error,
  };
}
