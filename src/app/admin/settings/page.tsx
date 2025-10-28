'use client';

import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Settings as SettingsIcon, Users, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage system configuration and preferences</p>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="general" className="space-y-6">
        <Tabs.List className="flex gap-2 border-b border-gray-800">
          <Tabs.Trigger
            value="general"
            className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SettingsIcon size={18} />
              General
            </div>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="users"
            className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Admin Users
            </div>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="security"
            className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield size={18} />
              Security
            </div>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="notifications"
            className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell size={18} />
              Notifications
            </div>
          </Tabs.Trigger>
        </Tabs.List>

        {/* General Tab */}
        <Tabs.Content value="general" className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="siteName" className="block text-sm font-medium mb-2">
                  Site Name
                </label>
                <input
                  id="siteName"
                  type="text"
                  defaultValue="Team Vote Map"
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium mb-2">
                  Timezone
                </label>
                <select
                  id="timezone"
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York</option>
                  <option value="America/Los_Angeles">America/Los Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="maintenance"
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                />
                <label htmlFor="maintenance" className="text-sm">
                  Enable Maintenance Mode
                </label>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Admin Users Tab */}
        <Tabs.Content value="users" className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Admin Users</h2>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                Add Admin User
              </button>
            </div>
            <div className="text-gray-400 text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-gray-600" />
              <p>Admin user management will be available soon.</p>
              <p className="text-sm mt-2">
                Use the <code className="px-2 py-1 bg-gray-950 rounded">pnpm create-admin</code> script
                to create new admin users for now.
              </p>
            </div>
          </div>
        </Tabs.Content>

        {/* Security Tab */}
        <Tabs.Content value="security" className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="sessionTimeout" className="block text-sm font-medium mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  id="sessionTimeout"
                  type="number"
                  defaultValue="60"
                  min="15"
                  max="1440"
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Require 2FA for admin login</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Enable rate limiting</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Log all admin actions</span>
                </label>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Notifications Tab */}
        <Tabs.Content value="notifications" className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Notification Settings</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="emailNotifications" className="block text-sm font-medium mb-2">
                  Email Notifications
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">New fraud events (critical only)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Daily statistics summary</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">System alerts and warnings</span>
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="notificationEmail" className="block text-sm font-medium mb-2">
                  Notification Email
                </label>
                <input
                  id="notificationEmail"
                  type="email"
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
