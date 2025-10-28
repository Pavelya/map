'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { TeamSelector, type Team } from './TeamSelector';
import { LocationConsent } from './LocationConsent';
import { CaptchaField } from './CaptchaField';
import { VoteSuccessModal } from './VoteSuccessModal';
import { useVoteSubmission } from '@/hooks/useVoteSubmission';
import { useToast } from '../Toast/ToastProvider';

// Validation schema
const voteFormSchema = z.object({
  teamChoice: z.enum(['team_a', 'team_b'], {
    required_error: 'Please select a team',
  }),
  consentPreciseGeo: z.boolean(),
  captchaToken: z.string().optional(),
});

type VoteFormData = z.infer<typeof voteFormSchema>;

interface VoteFormProps {
  matchId: string;
  teams: [Team, Team];
  requireCaptcha: boolean;
  onSuccess?: () => void;
}

export function VoteForm({
  matchId,
  teams,
  requireCaptcha,
  onSuccess,
}: VoteFormProps) {
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    teamName: string;
    teamColor: string;
    currentStats: {
      teamACount: number;
      teamBCount: number;
      totalVotes: number;
    };
  } | null>(null);

  const { submitVote, loading, error: submissionError } = useVoteSubmission();
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<VoteFormData>({
    resolver: zodResolver(voteFormSchema),
    defaultValues: {
      consentPreciseGeo: false,
      captchaToken: undefined,
    },
  });

  const selectedTeam = watch('teamChoice');

  // Get hCaptcha site key from environment
  const hCaptchaSiteKey = process.env['NEXT_PUBLIC_HCAPTCHA_SITE_KEY'] || '';

  /**
   * Handle form submission
   */
  const onSubmit = async (data: VoteFormData) => {
    try {
      // Validate captcha if required
      if (requireCaptcha && !captchaToken) {
        toast.error('Captcha verification required', 'Please complete the captcha to continue.');
        return;
      }

      // Submit vote
      const result = await submitVote({
        matchId,
        teamChoice: data.teamChoice,
        consentPreciseGeo: data.consentPreciseGeo,
        captchaToken: requireCaptcha ? captchaToken : undefined,
      });

      // Get selected team details for success modal
      const selectedTeamData = teams.find((t) => t.id === data.teamChoice);

      if (selectedTeamData) {
        setSuccessData({
          teamName: selectedTeamData.name,
          teamColor: selectedTeamData.color,
          currentStats: result.currentStats,
        });
        setShowSuccessModal(true);
      }

      // Show success toast
      toast.success('Vote submitted!', 'Thank you for participating.');

      // Reset form
      reset();
      setCaptchaToken(undefined);

      // Call onSuccess callback if provided
      onSuccess?.();
    } catch (err: any) {
      // Error is already set in the hook, show toast
      const errorMessage =
        err?.message || submissionError || 'Failed to submit vote';
      toast.error('Vote submission failed', errorMessage);
    }
  };

  /**
   * Handle captcha verification
   */
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  /**
   * Handle captcha expiration
   */
  const handleCaptchaExpire = () => {
    setCaptchaToken(undefined);
    toast.info('Captcha expired', 'Please verify again.');
  };

  /**
   * Handle captcha error
   */
  const handleCaptchaError = (_error: string) => {
    setCaptchaToken(undefined);
    toast.error('Captcha error', 'Failed to load captcha. Please refresh the page.');
  };

  /**
   * Close success modal
   */
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Team Selection */}
        <Controller
          name="teamChoice"
          control={control}
          render={({ field }) => (
            <TeamSelector
              teams={teams}
              selectedTeam={field.value}
              onSelectTeam={field.onChange}
              error={errors.teamChoice?.message}
            />
          )}
        />

        {/* Location Consent */}
        <Controller
          name="consentPreciseGeo"
          control={control}
          render={({ field }) => (
            <LocationConsent
              checked={field.value}
              onChange={field.onChange}
              error={errors.consentPreciseGeo?.message}
            />
          )}
        />

        {/* Captcha (if required) */}
        {requireCaptcha && (
          <CaptchaField
            siteKey={hCaptchaSiteKey}
            onVerify={handleCaptchaVerify}
            onExpire={handleCaptchaExpire}
            onError={handleCaptchaError}
            error={!captchaToken && submissionError ? 'Captcha verification required' : undefined}
          />
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (requireCaptcha && !captchaToken)}
          className={`
            w-full py-4 px-6 rounded-lg font-semibold text-lg
            transition-all duration-200
            focus:outline-none focus:ring-4 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              selectedTeam
                ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }
          `}
          aria-label="Submit vote"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              Submitting...
            </span>
          ) : (
            'Submit Vote'
          )}
        </button>

        {/* Error Display */}
        {submissionError && !loading && (
          <div
            className="p-4 rounded-lg bg-red-50 border border-red-200"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-red-800 font-medium">
              {submissionError}
            </p>
          </div>
        )}

        {/* Form Instructions */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            By submitting, you agree to our{' '}
            <a
              href="/terms"
              className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </form>

      {/* Success Modal */}
      {successData && (
        <VoteSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          teamName={successData.teamName}
          teamColor={successData.teamColor}
          currentStats={successData.currentStats}
          autoCloseDelay={5000} // Auto-close after 5 seconds
        />
      )}
    </>
  );
}
