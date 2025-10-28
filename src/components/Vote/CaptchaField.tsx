'use client';

import React, { useRef, useEffect } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Shield } from 'lucide-react';

interface CaptchaFieldProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: (() => void) | undefined;
  onError?: ((error: string) => void) | undefined;
  error?: string | undefined;
}

export function CaptchaField({
  siteKey,
  onVerify,
  onExpire,
  onError,
  error,
}: CaptchaFieldProps) {
  const captchaRef = useRef<HCaptcha>(null);

  // Reset captcha when there's an error
  useEffect(() => {
    if (error && captchaRef.current) {
      captchaRef.current.resetCaptcha();
    }
  }, [error]);

  const handleVerify = (token: string) => {
    onVerify(token);
  };

  const handleExpire = () => {
    onExpire?.();
    // Auto-reset when expired
    if (captchaRef.current) {
      captchaRef.current.resetCaptcha();
    }
  };

  const handleError = (err: string) => {
    onError?.(err);
  };

  // Don't render if no site key
  if (!siteKey) {
    return (
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <p className="text-sm text-yellow-800">
          <strong>Development Mode:</strong> hCaptcha is not configured. Set
          NEXT_PUBLIC_HCAPTCHA_SITE_KEY environment variable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900">
        <Shield className="inline-block w-4 h-4 mr-1 text-gray-500" aria-hidden="true" />
        Security verification <span className="text-red-600" aria-label="required">*</span>
      </label>

      <div className="flex justify-center">
        <HCaptcha
          ref={captchaRef}
          sitekey={siteKey}
          onVerify={handleVerify}
          onExpire={handleExpire}
          onError={handleError}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-500 text-center">
        This site is protected by hCaptcha and its{' '}
        <a
          href="https://www.hcaptcha.com/privacy"
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>{' '}
        and{' '}
        <a
          href="https://www.hcaptcha.com/terms"
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>{' '}
        apply.
      </p>
    </div>
  );
}
