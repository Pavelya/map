'use client';

import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '@/stores/admin-auth';
import { DataTable } from '@/components/Admin/DataTable';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import type { FraudEvent } from '@/types/admin';
import { ShieldAlert, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { FraudDetailModal } from '@/components/Admin/FraudDetailModal';

export default function FraudPage() {
  const { token } = useAdminAuth();
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [total, setTotal] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [reviewedFilter, setReviewedFilter] = useState<string>('');
  const [matchFilter, setMatchFilter] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<FraudEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0,
    reviewedCount: 0,
    reviewRate: 0,
  });

  const fetchFraudEvents = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
      });

      if (severityFilter) {
        params.append('severity', severityFilter);
      }
      if (reviewedFilter) {
        params.append('reviewed', reviewedFilter);
      }
      if (matchFilter) {
        params.append('matchId', matchFilter);
      }

      const response = await fetch(`/api/admin/fraud?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch fraud events');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setEvents(result.data.events || []);
        setTotal(result.data.pagination?.total || 0);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/admin/fraud/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      }
    } catch (error) {
      console.error('Error fetching fraud events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudEvents();
  }, [pagination.pageIndex, pagination.pageSize, severityFilter, reviewedFilter, matchFilter, token]);

  const handleReview = async (eventId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/fraud/${eventId}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to review fraud event');
      }

      fetchFraudEvents();
    } catch (error) {
      console.error('Error reviewing fraud event:', error);
      alert('Failed to review fraud event');
    }
  };

  const columns: ColumnDef<FraudEvent>[] = [
    {
      accessorKey: 'detected_at',
      header: 'Timestamp',
      cell: ({ row }) => (
        <div className="text-sm">{format(new Date(row.original.detected_at), 'MMM d, yyyy HH:mm:ss')}</div>
      ),
    },
    {
      accessorKey: 'match_id',
      header: 'Match',
      cell: ({ row }) => <div className="text-sm font-mono">{row.original.match_id.slice(0, 8)}...</div>,
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <div className="text-sm max-w-xs truncate" title={row.original.reason}>
          {row.original.reason}
        </div>
      ),
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
    {
      accessorKey: 'reviewed',
      header: 'Status',
      cell: ({ row }) => {
        const reviewed = row.original.reviewed;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
              reviewed ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {reviewed ? (
              <>
                <CheckCircle size={12} />
                Reviewed
              </>
            ) : (
              <>
                <AlertTriangle size={12} />
                Pending
              </>
            )}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedEvent(row.original);
              setShowDetailModal(true);
            }}
            className="p-2 text-blue-400 hover:bg-gray-800 rounded transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {!row.original.reviewed && (
            <button
              onClick={() => handleReview(row.original.id)}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              Mark Reviewed
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Fraud Detection</h1>
        <p className="text-gray-400 mt-1">Monitor and review suspicious voting activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-red-500" size={24} />
            <span className="text-gray-400 text-sm">Total Events</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalEvents.toLocaleString()}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-purple-500" size={24} />
            <span className="text-gray-400 text-sm">Critical Events</span>
          </div>
          <p className="text-3xl font-bold">{stats.criticalEvents.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.highEvents} high severity</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-500" size={24} />
            <span className="text-gray-400 text-sm">Reviewed</span>
          </div>
          <p className="text-3xl font-bold">{stats.reviewedCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.reviewRate.toFixed(1)}% review rate</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-orange-500" size={24} />
            <span className="text-gray-400 text-sm">Pending Review</span>
          </div>
          <p className="text-3xl font-bold">{(stats.totalEvents - stats.reviewedCount).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="severity" className="block text-sm font-medium mb-2">
              Severity
            </label>
            <select
              id="severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label htmlFor="reviewed" className="block text-sm font-medium mb-2">
              Review Status
            </label>
            <select
              id="reviewed"
              value={reviewedFilter}
              onChange={(e) => setReviewedFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="true">Reviewed</option>
              <option value="false">Pending</option>
            </select>
          </div>

          <div>
            <label htmlFor="match" className="block text-sm font-medium mb-2">
              Match
            </label>
            <input
              id="match"
              type="text"
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
              placeholder="Match ID..."
              className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={events}
        loading={loading}
        emptyMessage="No fraud events found"
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: total,
          onPaginationChange: setPagination,
        }}
        manualPagination
      />

      {/* Fraud Detail Modal */}
      <FraudDetailModal
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSuccess={fetchFraudEvents}
      />
    </div>
  );
}
