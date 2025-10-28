'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/stores/admin-auth';
import { DataTable } from '@/components/Admin/DataTable';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import type { Match } from '@/types/admin';
import { Plus, Edit, Trash2, Play, StopCircle, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { MatchFormModal } from '@/components/Admin/MatchFormModal';

export default function MatchesPage() {
  const { token } = useAdminAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const fetchMatches = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/admin/matches?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setMatches(result.data.matches || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [pagination.pageIndex, pagination.pageSize, statusFilter, searchQuery, token]);

  const handleDelete = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete match');
      }

      fetchMatches();
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Failed to delete match');
    }
  };

  const handleActivate = async (matchId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchId}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to activate match');
      }

      fetchMatches();
    } catch (error) {
      console.error('Error activating match:', error);
      alert('Failed to activate match');
    }
  };

  const handleEnd = async (matchId: string) => {
    if (!confirm('Are you sure you want to end this match?')) return;
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchId}/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to end match');
      }

      fetchMatches();
    } catch (error) {
      console.error('Error ending match:', error);
      alert('Failed to end match');
    }
  };

  const columns: ColumnDef<Match>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.title}
          {row.original.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const statusColors = {
          draft: 'bg-gray-700 text-gray-300',
          scheduled: 'bg-blue-900 text-blue-300',
          active: 'bg-green-900 text-green-300',
          ended: 'bg-gray-800 text-gray-400',
          cancelled: 'bg-red-900 text-red-300',
        };

        return (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'start_time',
      header: 'Start Time',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.start_time), 'MMM d, yyyy HH:mm')}
        </div>
      ),
    },
    {
      accessorKey: 'end_time',
      header: 'End Time',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.end_time), 'MMM d, yyyy HH:mm')}
        </div>
      ),
    },
    {
      id: 'votes',
      header: 'Total Votes',
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {((row.original.total_votes_a || 0) + (row.original.total_votes_b || 0)).toLocaleString()}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/matches/${row.original.id}`}
            className="p-2 text-blue-400 hover:bg-gray-800 rounded transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </Link>
          <button
            onClick={() => {
              setSelectedMatch(row.original);
              setShowMatchModal(true);
            }}
            className="p-2 text-gray-400 hover:bg-gray-800 rounded transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          {row.original.status === 'draft' && (
            <button
              onClick={() => handleActivate(row.original.id)}
              className="p-2 text-green-400 hover:bg-gray-800 rounded transition-colors"
              title="Activate"
            >
              <Play size={16} />
            </button>
          )}
          {row.original.status === 'active' && (
            <button
              onClick={() => handleEnd(row.original.id)}
              className="p-2 text-orange-400 hover:bg-gray-800 rounded transition-colors"
              title="End Match"
            >
              <StopCircle size={16} />
            </button>
          )}
          <button
            onClick={() => handleDelete(row.original.id)}
            className="p-2 text-red-400 hover:bg-gray-800 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Matches</h1>
          <p className="text-gray-400 mt-1">Manage all voting matches</p>
        </div>
        <button
          onClick={() => {
            setSelectedMatch(null);
            setShowMatchModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
        >
          <Plus size={20} />
          Create Match
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-2">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={matches}
        loading={loading}
        emptyMessage="No matches found"
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: total,
          onPaginationChange: setPagination,
        }}
        manualPagination
      />

      {/* Match Form Modal */}
      <MatchFormModal
        open={showMatchModal}
        onClose={() => {
          setShowMatchModal(false);
          setSelectedMatch(null);
        }}
        match={selectedMatch}
        onSuccess={fetchMatches}
      />
    </div>
  );
}
