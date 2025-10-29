'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/stores/admin-auth';

// Force dynamic rendering to prevent SSR issues with Zustand persist
export const dynamic = 'force-dynamic';

export default function AdminIndexPage() {
  const router = useRouter();
  const { hasHydrated } = useAdminAuth();

  useEffect(() => {
    // Wait for hydration before redirecting
    if (!hasHydrated) return;

    // Redirect to matches page as the default admin view
    router.replace('/admin/matches');
  }, [router, hasHydrated]);

  // Return null while redirecting
  return null;
}
