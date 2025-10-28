'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Trophy, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMatch, setSelectedMatch] = useState('all');

  // Sample data - in production, fetch from API
  const [overviewStats] = useState({
    totalVotes: 15420,
    totalMatches: 12,
    activeUsers: 8634,
    avgVotesPerMatch: 1285,
  });

  const [votesOverTime] = useState([
    { date: 'Mon', votes: 2400 },
    { date: 'Tue', votes: 1398 },
    { date: 'Wed', votes: 3800 },
    { date: 'Thu', votes: 3908 },
    { date: 'Fri', votes: 4800 },
    { date: 'Sat', votes: 3800 },
    { date: 'Sun', votes: 4300 },
  ]);

  const [votesByCountry] = useState([
    { country: 'US', votes: 4500 },
    { country: 'UK', votes: 3200 },
    { country: 'DE', votes: 2800 },
    { country: 'FR', votes: 2100 },
    { country: 'CA', votes: 1800 },
    { country: 'Other', votes: 1020 },
  ]);

  const [votesByHour] = useState([
    { hour: '00-04', votes: 420 },
    { hour: '04-08', votes: 680 },
    { hour: '08-12', votes: 2100 },
    { hour: '12-16', votes: 3500 },
    { hour: '16-20', votes: 4200 },
    { hour: '20-24', votes: 2520 },
  ]);

  const [teamDominance] = useState([
    { team: 'Team A', votes: 8234, color: '#3B82F6' },
    { team: 'Team B', votes: 7186, color: '#EF4444' },
  ]);

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dateRange, selectedMatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-400 mt-1">Track voting trends and user engagement</p>
        </div>

        <div className="flex items-center gap-3">
          <Select.Root value={dateRange} onValueChange={setDateRange}>
            <Select.Trigger className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors min-w-[120px]">
              <Select.Value />
              <ChevronDown size={16} />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                <Select.Viewport>
                  <Select.Item
                    value="24h"
                    className="px-4 py-2 hover:bg-gray-800 cursor-pointer outline-none"
                  >
                    <Select.ItemText>Last 24 hours</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    value="7d"
                    className="px-4 py-2 hover:bg-gray-800 cursor-pointer outline-none"
                  >
                    <Select.ItemText>Last 7 days</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    value="30d"
                    className="px-4 py-2 hover:bg-gray-800 cursor-pointer outline-none"
                  >
                    <Select.ItemText>Last 30 days</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    value="90d"
                    className="px-4 py-2 hover:bg-gray-800 cursor-pointer outline-none"
                  >
                    <Select.ItemText>Last 90 days</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Select.Root value={selectedMatch} onValueChange={setSelectedMatch}>
            <Select.Trigger className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors min-w-[140px]">
              <Select.Value />
              <ChevronDown size={16} />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                <Select.Viewport>
                  <Select.Item
                    value="all"
                    className="px-4 py-2 hover:bg-gray-800 cursor-pointer outline-none"
                  >
                    <Select.ItemText>All Matches</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-blue-500" size={24} />
            <span className="text-gray-400 text-sm">Total Votes</span>
          </div>
          <p className="text-3xl font-bold">{overviewStats.totalVotes.toLocaleString()}</p>
          <p className="text-sm text-green-500 mt-1">+12.5% from last period</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-yellow-500" size={24} />
            <span className="text-gray-400 text-sm">Total Matches</span>
          </div>
          <p className="text-3xl font-bold">{overviewStats.totalMatches}</p>
          <p className="text-sm text-green-500 mt-1">+2 from last period</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-green-500" size={24} />
            <span className="text-gray-400 text-sm">Active Users</span>
          </div>
          <p className="text-3xl font-bold">{overviewStats.activeUsers.toLocaleString()}</p>
          <p className="text-sm text-green-500 mt-1">+8.2% from last period</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-purple-500" size={24} />
            <span className="text-gray-400 text-sm">Avg Votes/Match</span>
          </div>
          <p className="text-3xl font-bold">{overviewStats.avgVotesPerMatch.toLocaleString()}</p>
          <p className="text-sm text-green-500 mt-1">+5.1% from last period</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Votes Over Time */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Votes Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={votesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Line type="monotone" dataKey="votes" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Votes by Country */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Votes by Country</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={votesByCountry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="country" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="votes" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Votes by Hour */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Votes by Hour of Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={votesByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="votes" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Dominance */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Team Dominance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={teamDominance}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="votes"
              >
                {teamDominance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
