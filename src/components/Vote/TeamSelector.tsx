'use client';

import React from 'react';

export interface Team {
  id: 'team_a' | 'team_b';
  name: string;
  logo?: string;
  color: string;
}

interface TeamSelectorProps {
  teams: [Team, Team];
  selectedTeam: 'team_a' | 'team_b' | null;
  onSelectTeam: (teamId: 'team_a' | 'team_b') => void;
  error?: string | undefined;
}

export function TeamSelector({
  teams,
  selectedTeam,
  onSelectTeam,
  error,
}: TeamSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-white">
        Choose your team <span className="text-red-600" aria-label="required">*</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            isSelected={selectedTeam === team.id}
            onSelect={() => onSelectTeam(team.id)}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

interface TeamCardProps {
  team: Team;
  isSelected: boolean;
  onSelect: () => void;
}

function TeamCard({ team, isSelected, onSelect }: TeamCardProps) {
  return (
    <label
      className={`
        relative flex flex-col items-center justify-center
        p-6 rounded-xl border-2 cursor-pointer
        transition-all duration-200 ease-in-out
        hover:scale-105 hover:shadow-lg
        focus-within:ring-4 focus-within:ring-offset-2 focus-within:ring-opacity-50
        ${
          isSelected
            ? 'border-current shadow-lg scale-105'
            : 'border-gray-700 hover:border-gray-600'
        }
      `}
      style={{
        borderColor: isSelected ? team.color : undefined,
        backgroundColor: isSelected ? `${team.color}10` : 'rgb(17 24 39)',
      }}
    >
      {/* Hidden radio input for accessibility */}
      <input
        type="radio"
        name="team"
        value={team.id}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
        aria-label={`Select ${team.name}`}
      />

      {/* Team logo */}
      {team.logo && (
        <div className="mb-4 w-20 h-20 flex items-center justify-center">
          <img
            src={team.logo}
            alt={`${team.name} logo`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* Team name */}
      <div
        className="text-xl font-bold text-center"
        style={{ color: team.color }}
      >
        {team.name}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </label>
  );
}
