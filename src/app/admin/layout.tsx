'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/stores/admin-auth';
import {
  LayoutDashboard,
  Trophy,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Matches', href: '/admin/matches', icon: Trophy },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Fraud', href: '/admin/fraud', icon: ShieldAlert },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, isAuthenticated, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated (except on login page)
    if (!isAuthenticated && !pathname.includes('/admin/login')) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, pathname, router]);

  // Don't render layout for login page
  if (pathname.includes('/admin/login')) {
    return <>{children}</>;
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-800
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <Link href="/admin/matches" className="flex items-center gap-2">
              <LayoutDashboard className="text-blue-500" size={24} />
              <span className="font-bold text-xl">Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                {admin?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{admin?.username}</p>
                <p className="text-xs text-gray-400 truncate">{admin?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-gray-900 border-b border-gray-800 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-xl">Admin Dashboard</span>
        </header>

        {/* Page content */}
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
