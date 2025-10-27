import React, { useEffect, useState } from 'react';
import { useVoteSocket } from '@/hooks/useVoteSocket';
import { aggregationService } from '@/services/aggregation-service';
import { formatAggregatesForMap, calculateDominance } from '@/lib/aggregation-utils';

interface VoteAggregationExampleProps {
  matchId: string;
}

export function VoteAggregationExample({ matchId }: VoteAggregationExampleProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Use WebSocket hook for real-time updates
  const {
    connected,
    connecting,
    stats,
    aggregates,
    connectionError,
    retry
  } = useVoteSocket({
    matchId,
    autoConnect: true,
    reconnectAttempts: 5
  });

  // Format aggregates for map display
  const mapAggregates = formatAggregatesForMap(aggregates);

  // Calculate overall dominance
  const overallDominance = stats ? calculateDominance(stats.teamAVotes, stats.teamBVotes) : null;

  // Submit a test vote
  const submitTestVote = async (teamChoice: 'team_a' | 'team_b') => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Example H3 index and country code
      const testH3Index = '8a1fb46622dffff';
      const testCountryCode = 'US';

      // Update aggregates
      await Promise.all([
        aggregationService.updateH3Aggregate(matchId, testH3Index, 10, teamChoice),
        aggregationService.updateCountryAggregate(matchId, testCountryCode, teamChoice)
      ]);

      console.log('Vote submitted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSubmitError(errorMessage);
      console.error('Failed to submit vote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk vote submission example
  const submitBulkVotes = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Create 50 test votes
      const bulkVotes = Array.from({ length: 50 }, (_, i) => ({
        matchId,
        h3Index: `8a1fb46622d${i.toString().padStart(4, '0')}`,
        h3Resolution: 10,
        countryCode: i % 2 === 0 ? 'US' : 'CA',
        teamChoice: (i % 2 === 0 ? 'team_a' : 'team_b') as 'team_a' | 'team_b'
      }));

      await aggregationService.bulkUpdateAggregates(bulkVotes);
      console.log('Bulk votes submitted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSubmitError(errorMessage);
      console.error('Failed to submit bulk votes:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Vote Aggregation System Demo</h1>

      {/* Connection Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">WebSocket Connection</h2>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            connected ? 'bg-green-100 text-green-800' : 
            connecting ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
          </div>
          {connectionError && (
            <div className="text-red-600 text-sm">
              Error: {connectionError}
            </div>
          )}
          {!connected && !connecting && (
            <button
              onClick={retry}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>

      {/* Match Statistics */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Real-time Statistics</h2>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalVotes}</div>
              <div className="text-sm text-gray-600">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.teamAVotes}</div>
              <div className="text-sm text-gray-600">Team A Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.teamBVotes}</div>
              <div className="text-sm text-gray-600">Team B Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.uniqueCountries}</div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.uniqueH3Cells}</div>
              <div className="text-sm text-gray-600">H3 Cells</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">
                {overallDominance?.dominantTeam === 'tie' ? 'Tie' : 
                 overallDominance?.dominantTeam === 'team_a' ? 'Team A' : 'Team B'}
              </div>
              <div className="text-sm text-gray-600">
                {overallDominance?.dominancePercentage.toFixed(1)}% Leading
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No statistics available</div>
        )}
      </div>

      {/* Vote Submission */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Submit Test Votes</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => submitTestVote('team_a')}
            disabled={isSubmitting || !connected}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Vote Team A
          </button>
          <button
            onClick={() => submitTestVote('team_b')}
            disabled={isSubmitting || !connected}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Vote Team B
          </button>
          <button
            onClick={submitBulkVotes}
            disabled={isSubmitting || !connected}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Submit 50 Bulk Votes
          </button>
        </div>
        {submitError && (
          <div className="text-red-600 text-sm">
            Error: {submitError}
          </div>
        )}
        {isSubmitting && (
          <div className="text-blue-600 text-sm">
            Submitting votes...
          </div>
        )}
      </div>

      {/* Aggregates Display */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Vote Aggregates ({aggregates.length} total)
        </h2>
        <div className="max-h-64 overflow-y-auto">
          {aggregates.length > 0 ? (
            <div className="space-y-2">
              {aggregates.slice(0, 10).map((aggregate, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="text-sm">
                    <span className="font-medium">
                      {aggregate.aggregateType === 'h3' ? 'H3' : 'Country'}: 
                    </span>
                    <span className="ml-1">{aggregate.locationKey}</span>
                    {aggregate.resolution && (
                      <span className="ml-1 text-gray-500">(res: {aggregate.resolution})</span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-red-600">A: {aggregate.teamACount}</span>
                    <span className="mx-2">|</span>
                    <span className="text-green-600">B: {aggregate.teamBCount}</span>
                    <span className="ml-2 text-gray-500">({aggregate.voteCount} total)</span>
                  </div>
                </div>
              ))}
              {aggregates.length > 10 && (
                <div className="text-center text-gray-500 text-sm">
                  ... and {aggregates.length - 10} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">No aggregates available</div>
          )}
        </div>
      </div>

      {/* Map Aggregates Preview */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Map Layer Data ({mapAggregates.length} H3 cells)
        </h2>
        <div className="max-h-32 overflow-y-auto">
          {mapAggregates.length > 0 ? (
            <div className="space-y-1">
              {mapAggregates.slice(0, 5).map((mapAgg, index) => (
                <div key={index} className="text-xs text-gray-600">
                  H3: {mapAgg.h3Index} | 
                  Lat: {mapAgg.lat.toFixed(4)} | 
                  Lng: {mapAgg.lng.toFixed(4)} | 
                  Dominant: {mapAgg.dominantTeam} ({mapAgg.dominancePercentage}%)
                </div>
              ))}
              {mapAggregates.length > 5 && (
                <div className="text-xs text-gray-400">
                  ... and {mapAggregates.length - 5} more cells
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No H3 aggregates for map display</div>
          )}
        </div>
      </div>
    </div>
  );
}