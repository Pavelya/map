'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdminAuth } from '@/stores/admin-auth';
import { LayoutDashboard, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAdminAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Redirect to matches if already authenticated
    if (isAuthenticated) {
      router.replace('/admin/matches');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setErrorMessage('Too many login attempts. Please try again later.');
        } else {
          setErrorMessage(result.error || 'Login failed');
        }
        return;
      }

      if (result.success && result.data) {
        // Store auth data
        setAuth(result.data.admin, result.data.token);

        // Redirect to matches page
        router.replace('/admin/matches');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <LayoutDashboard size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
            <p className="text-gray-400">Sign in to access the dashboard</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-900 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                {...register('username')}
                className={`
                  w-full px-4 py-3 bg-gray-950 border rounded-lg text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  placeholder:text-gray-500
                  ${errors.username ? 'border-red-500' : 'border-gray-700'}
                `}
                placeholder="Enter your username"
                disabled={isSubmitting}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`
                  w-full px-4 py-3 bg-gray-950 border rounded-lg text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  placeholder:text-gray-500
                  ${errors.password ? 'border-red-500' : 'border-gray-700'}
                `}
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Need admin access? Contact your system administrator.
        </p>
      </div>
    </div>
  );
}
