'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '@/stores/admin-auth';
import type { FraudEvent } from '@/types/admin';
import { format } from 'date-fns';

interface FraudDetailModalProps {
  open: boolean;
  onClose: () => void;
  event: FraudEvent | null;
  onSuccess: () => void;
}

export function FraudDetailModal({ open, onClose, event, onSuccess }: FraudDetailModalProps) {
  const { token } = useAdminAuth();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!event) return null;

  const handleReview = async () => {
    if (!token) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/admin/fraud/${event.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to review fraud event');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error reviewing fraud event:', error);
      setErrorMessage('Failed to mark event as reviewed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityColors = {
    low: 'text-yellow-300',
    medium: 'text-orange-300',
    high: 'text-red-300',
    critical: 'text-purple-300',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-bold">Fraud Event Details</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-white">
              <X size={24} />
            </Dialog.Close>
          </div>

          {errorMessage && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-900 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Event Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event ID</label>
                <p className="font-mono text-sm">{event.id}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Detected At</label>
                <p className="text-sm">{format(new Date(event.detected_at), 'PPpp')}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Severity</label>
                <p className={`text-sm font-medium capitalize ${severityColors[event.severity]}`}>
                  {event.severity}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    event.reviewed ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {event.reviewed ? (
                    <>
                      <CheckCircle size={12} />
                      Reviewed
                    </>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
            </div>

            {/* Match & Fingerprint */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Match ID</label>
                <p className="font-mono text-sm">{event.match_id}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Fingerprint Hash</label>
                <p className="font-mono text-sm truncate" title={event.fingerprint_hash}>
                  {event.fingerprint_hash}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason</label>
              <p className="text-sm bg-gray-950 p-3 rounded-lg">{event.reason}</p>
            </div>

            {/* Metadata */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Metadata</label>
              <pre className="text-xs bg-gray-950 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>

            {/* Review Info */}
            {event.reviewed && (
              <div className="border-t border-gray-800 pt-4">
                <h3 className="font-semibold mb-3">Review Information</h3>
                <div className="space-y-2">
                  {event.reviewed_at && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Reviewed At</label>
                      <p className="text-sm">{format(new Date(event.reviewed_at), 'PPpp')}</p>
                    </div>
                  )}
                  {event.reviewed_by && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Reviewed By</label>
                      <p className="text-sm">{event.reviewed_by}</p>
                    </div>
                  )}
                  {event.notes && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Notes</label>
                      <p className="text-sm bg-gray-950 p-3 rounded-lg">{event.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Input (if not reviewed) */}
            {!event.reviewed && (
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-2">
                  Review Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this fraud event..."
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Close
            </button>
            {!event.reviewed && (
              <button
                onClick={handleReview}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                {isSubmitting ? 'Marking as Reviewed...' : 'Mark as Reviewed'}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
