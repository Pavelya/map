'use client';

import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, X, Users, TrendingUp } from 'lucide-react';

interface VoteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamColor: string;
  currentStats: {
    teamACount: number;
    teamBCount: number;
    totalVotes: number;
  };
  autoCloseDelay?: number; // in milliseconds, optional
}

export function VoteSuccessModal({
  isOpen,
  onClose,
  teamName,
  teamColor,
  currentStats,
  autoCloseDelay,
}: VoteSuccessModalProps) {
  // Auto-close after delay if specified
  useEffect(() => {
    if (isOpen && autoCloseDelay) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, autoCloseDelay, onClose]);

  const calculatePercentage = (count: number) => {
    if (currentStats.totalVotes === 0) return 0;
    return Math.round((count / currentStats.totalVotes) * 100);
  };

  const teamAPercentage = calculatePercentage(currentStats.teamACount);
  const teamBPercentage = calculatePercentage(currentStats.teamBCount);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-fadeIn" />

        {/* Content */}
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl focus:outline-none data-[state=open]:animate-contentShow"
          aria-describedby="vote-success-description"
        >
          {/* Close button */}
          <Dialog.Close
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </Dialog.Close>

          {/* Success icon and message */}
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center animate-scaleIn"
              style={{ backgroundColor: `${teamColor}20` }}
            >
              <CheckCircle2
                className="w-10 h-10"
                style={{ color: teamColor }}
                aria-hidden="true"
              />
            </div>

            <div>
              <Dialog.Title className="text-2xl font-bold text-gray-900 mb-2">
                Vote Submitted!
              </Dialog.Title>
              <Dialog.Description
                id="vote-success-description"
                className="text-gray-600"
              >
                Your vote for{' '}
                <span className="font-semibold" style={{ color: teamColor }}>
                  {teamName}
                </span>{' '}
                has been recorded.
              </Dialog.Description>
            </div>
          </div>

          {/* Current stats */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              Current Results
            </div>

            <div className="space-y-3">
              {/* Team A */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Team A</span>
                  <span className="font-semibold text-gray-900">
                    {teamAPercentage}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${teamAPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={teamAPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Team A has ${teamAPercentage}% of votes`}
                  />
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Team B</span>
                  <span className="font-semibold text-gray-900">
                    {teamBPercentage}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${teamBPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={teamBPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Team B has ${teamBPercentage}% of votes`}
                  />
                </div>
              </div>

              {/* Total votes */}
              <div className="flex items-center justify-center gap-2 pt-2 text-sm text-gray-600">
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>
                  <strong className="text-gray-900">
                    {currentStats.totalVotes.toLocaleString()}
                  </strong>{' '}
                  total votes
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors focus:outline-none focus:ring-4 focus:ring-offset-2"
            style={{
              backgroundColor: teamColor,
              '--tw-ring-color': `${teamColor}40`,
            } as React.CSSProperties}
          >
            Continue
          </button>

          {autoCloseDelay && (
            <p className="mt-3 text-xs text-center text-gray-500">
              This message will close automatically
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
