'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '@/stores/admin-auth';
import type { Match } from '@/types/admin';
import { MatchSchema } from '@/lib/validations/match';

type MatchFormData = z.infer<typeof MatchSchema>;

interface MatchFormModalProps {
  open: boolean;
  onClose: () => void;
  match?: Match | null;
  onSuccess: () => void;
}

export function MatchFormModal({ open, onClose, match, onSuccess }: MatchFormModalProps) {
  const { token } = useAdminAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [teamALogoFile, setTeamALogoFile] = useState<File | null>(null);
  const [teamBLogoFile, setTeamBLogoFile] = useState<File | null>(null);
  const [teamALogoPreview, setTeamALogoPreview] = useState<string>('');
  const [teamBLogoPreview, setTeamBLogoPreview] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<MatchFormData>({
    resolver: zodResolver(MatchSchema) as any,
    defaultValues: {
      status: 'draft',
      allowPreciseGeo: false,
      requireCaptcha: true,
      maxVotesPerUser: 1,
    },
  });

  useEffect(() => {
    if (match) {
      // Populate form with match data
      setValue('title', match.title);
      setValue('description', match.description || '');
      setValue('teamAName', match.team_a_name);
      setValue('teamAColor', match.team_a_color);
      setValue('teamALogoUrl', match.team_a_logo_url);
      setValue('teamBName', match.team_b_name);
      setValue('teamBColor', match.team_b_color);
      setValue('teamBLogoUrl', match.team_b_logo_url);
      setValue('startTime', match.start_time.slice(0, 16)); // Format for datetime-local
      setValue('endTime', match.end_time.slice(0, 16));
      setValue('status', match.status);
      setValue('allowPreciseGeo', match.allow_precise_geo);
      setValue('requireCaptcha', match.require_captcha);
      setValue('maxVotesPerUser', match.max_votes_per_user);

      if (match.team_a_logo_url) setTeamALogoPreview(match.team_a_logo_url);
      if (match.team_b_logo_url) setTeamBLogoPreview(match.team_b_logo_url);
    } else {
      reset();
      setTeamALogoPreview('');
      setTeamBLogoPreview('');
    }
  }, [match, reset, setValue]);

  const handleTeamALogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeamALogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamALogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTeamBLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeamBLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamBLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }

    const result = await response.json();
    return result.data.url;
  };

  const onSubmit = async (data: MatchFormData) => {
    if (!token) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Upload logos if new files selected
      let teamALogoUrl = data.teamALogoUrl;
      let teamBLogoUrl = data.teamBLogoUrl;

      if (teamALogoFile) {
        teamALogoUrl = await uploadLogo(teamALogoFile);
      }
      if (teamBLogoFile) {
        teamBLogoUrl = await uploadLogo(teamBLogoFile);
      }

      const payload = {
        ...data,
        teamALogoUrl,
        teamBLogoUrl,
      };

      const url = match ? `/api/admin/matches/${match.id}` : '/api/admin/matches';
      const method = match ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to save match');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving match:', error);
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-bold">
              {match ? 'Edit Match' : 'Create Match'}
            </Dialog.Title>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Match Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Match Details</h3>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Coffee vs Tea 2025"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Team A */}
            <div className="space-y-4 p-4 border border-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold">Team A</h3>

              <div>
                <label htmlFor="teamAName" className="block text-sm font-medium mb-2">
                  Team Name *
                </label>
                <input
                  id="teamAName"
                  type="text"
                  {...register('teamAName')}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Coffee"
                />
                {errors.teamAName && (
                  <p className="mt-1 text-sm text-red-400">{errors.teamAName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="teamAColor" className="block text-sm font-medium mb-2">
                  Team Color *
                </label>
                <input
                  id="teamAColor"
                  type="color"
                  {...register('teamAColor')}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
                {errors.teamAColor && (
                  <p className="mt-1 text-sm text-red-400">{errors.teamAColor.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="teamALogo" className="block text-sm font-medium mb-2">
                  Team Logo
                </label>
                {teamALogoPreview && (
                  <div className="mb-2">
                    <img
                      src={teamALogoPreview}
                      alt="Team A Logo Preview"
                      className="w-24 h-24 object-contain bg-gray-800 rounded-lg"
                    />
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                  <Upload size={18} />
                  <span>Upload Logo</span>
                  <input
                    id="teamALogo"
                    type="file"
                    accept="image/*"
                    onChange={handleTeamALogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Team B */}
            <div className="space-y-4 p-4 border border-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold">Team B</h3>

              <div>
                <label htmlFor="teamBName" className="block text-sm font-medium mb-2">
                  Team Name *
                </label>
                <input
                  id="teamBName"
                  type="text"
                  {...register('teamBName')}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Tea"
                />
                {errors.teamBName && (
                  <p className="mt-1 text-sm text-red-400">{errors.teamBName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="teamBColor" className="block text-sm font-medium mb-2">
                  Team Color *
                </label>
                <input
                  id="teamBColor"
                  type="color"
                  {...register('teamBColor')}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
                {errors.teamBColor && (
                  <p className="mt-1 text-sm text-red-400">{errors.teamBColor.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="teamBLogo" className="block text-sm font-medium mb-2">
                  Team Logo
                </label>
                {teamBLogoPreview && (
                  <div className="mb-2">
                    <img
                      src={teamBLogoPreview}
                      alt="Team B Logo Preview"
                      className="w-24 h-24 object-contain bg-gray-800 rounded-lg"
                    />
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                  <Upload size={18} />
                  <span>Upload Logo</span>
                  <input
                    id="teamBLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleTeamBLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium mb-2">
                  Start Time *
                </label>
                <input
                  id="startTime"
                  type="datetime-local"
                  {...register('startTime')}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-400">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium mb-2">
                  End Time *
                </label>
                <input
                  id="endTime"
                  type="datetime-local"
                  {...register('endTime')}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-400">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Settings</h3>

              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-2">
                  Status *
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-400">{errors.status.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="maxVotesPerUser" className="block text-sm font-medium mb-2">
                  Max Votes Per User *
                </label>
                <input
                  id="maxVotesPerUser"
                  type="number"
                  {...register('maxVotesPerUser', { valueAsNumber: true })}
                  min={1}
                  max={10}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.maxVotesPerUser && (
                  <p className="mt-1 text-sm text-red-400">{errors.maxVotesPerUser.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('allowPreciseGeo')}
                    className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Allow Precise Geolocation</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('requireCaptcha')}
                    className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Require CAPTCHA</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : match ? 'Update Match' : 'Create Match'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
