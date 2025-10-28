'use client';

import React from 'react';
import { MapPin, Info } from 'lucide-react';

interface LocationConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | undefined;
}

export function LocationConsent({ checked, onChange, error }: LocationConsentProps) {
  return (
    <div className="space-y-3">
      {/* Checkbox with label */}
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5">
          <input
            id="location-consent"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
            aria-describedby="location-consent-description location-consent-impact"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="location-consent"
            className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-gray-500" aria-hidden="true" />
            Share precise location
          </label>
        </div>
      </div>

      {/* Explanation */}
      <div
        id="location-consent-description"
        className="ml-7 space-y-2 text-sm text-gray-600"
      >
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-700 mb-1">Why we need location:</p>
            <p>
              Your location helps us display votes on the interactive map and show regional
              voting patterns. We use privacy-preserving H3 spatial indexing to protect your
              exact location.
            </p>
          </div>
        </div>

        <div className="ml-6">
          <p className="font-medium text-gray-700 mb-1">What we collect:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <strong>With consent:</strong> Browser geolocation (latitude/longitude) converted
              to H3 cell
            </li>
            <li>
              <strong>Without consent:</strong> Country-level location from IP address only
            </li>
          </ul>
        </div>

        <div
          id="location-consent-impact"
          className={`ml-6 p-3 rounded-lg ${
            checked ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
          }`}
        >
          <p className="text-sm">
            {checked ? (
              <>
                <span className="font-semibold text-green-800">Precise location enabled:</span>
                <span className="text-green-700">
                  {' '}
                  Your vote will appear on the map at your approximate location (H3 cell).
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-800">Country-level only:</span>
                <span className="text-amber-700">
                  {' '}
                  Your vote will be aggregated at the country level based on your IP address.
                </span>
              </>
            )}
          </p>
        </div>

        <p className="ml-6 text-xs text-gray-500">
          Read our{' '}
          <a
            href="/privacy"
            className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>{' '}
          to learn how we protect your data.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="ml-7 text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
