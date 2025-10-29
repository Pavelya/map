'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/stores/admin-auth';
import type { Match, FraudEvent } from '@/types/admin';
import { DataTable } from '@/components/Admin/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  StopCircle,
  Download,
  TrendingUp,
  Users,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MatchFormModal } from '@/components/Admin/MatchFormModal';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAdminAuth();
  const matchId = params['id'] as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [fraudEvents, setFraudEvents] = useState<FraudEvent[]>([]);
  const [votesOverTime, setVotesOverTime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchMatchDetails = async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Fetch match details
      const matchResponse = await fetch(`/api/admin/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!matchResponse.ok) {
        throw new Error('Failed to fetch match');
      }

      const matchResult = await matchResponse.json();
      if (matchResult.success && matchResult.data) {
        setMatch(matchResult.data);
      }

      // Fetch recent votes (TODO: implement this API endpoint if needed)

      // Fetch fraud events for this match
      const fraudResponse = await fetch(`/api/admin/fraud?matchId=${matchId}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fraudResponse.ok) {
        const fraudResult = await fraudResponse.json();
        if (fraudResult.success && fraudResult.data) {
          setFraudEvents(fraudResult.data.events || []);
        }
      }

      // Generate sample votes over time data (in production, fetch from API)
      setVotesOverTime([
        { time: '00:00', teamA: 120, teamB: 95 },
        { time: '04:00', teamA: 180, teamB: 145 },
        { time: '08:00', teamA: 250, teamB: 210 },
        { time: '12:00', teamA: 340, teamB: 290 },
        { time: '16:00', teamA: 420, teamB: 380 },
        { time: '20:00', teamA: 500, teamB: 450 },
      ]);
    } catch (error) {
      console.error('Error fetching match details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId, token]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete match');
      }

      router.push('/admin/matches');
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Failed to delete match');
    }
  };

  const handleActivate = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to activate match');
      }

      fetchMatchDetails();
    } catch (error) {
      console.error('Error activating match:', error);
      alert('Failed to activate match');
    }
  };

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this match?')) return;
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to end match');
      }

      fetchMatchDetails();
    } catch (error) {
      console.error('Error ending match:', error);
      alert('Failed to end match');
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    alert('CSV export will be implemented');
  };

  const fraudColumns: ColumnDef<FraudEvent>[] = [
    {
      accessorKey: 'detected_at',
      header: 'Time',
      cell: ({ row }) => (
        <div className="text-sm">{format(new Date(row.original.detected_at), 'MMM d, HH:mm')}</div>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => <div className="text-sm">{row.original.reason}</div>,
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const severity = row.original.severity;
        const colors = {
          low: 'bg-yellow-900 text-yellow-300',
          medium: 'bg-orange-900 text-orange-300',
          high: 'bg-red-900 text-red-300',
          critical: 'bg-purple-900 text-purple-300',
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[severity]}`}>
            {severity}
          </span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Match not found</p>
        <button
          onClick={() => router.push('/admin/matches')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  const totalVotes = (match.total_votes_a || 0) + (match.total_votes_b || 0);
  const teamAPercentage = totalVotes > 0 ? ((match.total_votes_a || 0) / totalVotes) * 100 : 0;
  const teamBPercentage = totalVotes > 0 ? ((match.total_votes_b || 0) / totalVotes) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/matches')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{match.title}</h1>
            {match.description && <p className="text-gray-400 mt-1">{match.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit size={20} />
          </button>
          {match.status === 'draft' && (
            <button
              onClick={handleActivate}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Play size={18} />
              Activate
            </button>
          )}
          {match.status === 'active' && (
            <button
              onClick={handleEnd}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <StopCircle size={18} />
              End Match
            </button>
          )}
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-500" size={24} />
            <span className="text-gray-400 text-sm">Total Votes</span>
          </div>
          <p className="text-3xl font-bold">{totalVotes.toLocaleString()}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-500" size={24} />
            <span className="text-gray-400 text-sm">{match.team_a_name}</span>
          </div>
          <p className="text-3xl font-bold">{(match.total_votes_a || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{teamAPercentage.toFixed(1)}%</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-red-500" size={24} />
            <span className="text-gray-400 text-sm">{match.team_b_name}</span>
          </div>
          <p className="text-3xl font-bold">{(match.total_votes_b || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{teamBPercentage.toFixed(1)}%</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-purple-500" size={24} />
            <span className="text-gray-400 text-sm">Status</span>
          </div>
          <p className="text-2xl font-bold capitalize">{match.status}</p>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(match.start_time), 'MMM d, HH:mm')}
          </p>
        </div>
      </div>

      {/* Votes Over Time Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Votes Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={votesOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="teamA"
              stroke={match.team_a_color}
              strokeWidth={2}
              name={match.team_a_name}
            />
            <Line
              type="monotone"
              dataKey="teamB"
              stroke={match.team_b_color}
              strokeWidth={2}
              name={match.team_b_name}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Fraud Events */}
      {fraudEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Fraud Events</h2>
          <DataTable columns={fraudColumns} data={fraudEvents} emptyMessage="No fraud events" />
        </div>
      )}

      {/* Edit Modal */}
      <MatchFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        match={match}
        onSuccess={fetchMatchDetails}
      />
    </div>
  );
}
