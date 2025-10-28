export interface AdminUser {
  id: string;
  username: string;
  email: string;
  created_at?: string;
  last_login?: string;
}

export interface Match {
  id: string;
  title: string;
  description?: string;
  team_a_name: string;
  team_a_color: string;
  team_a_logo_url?: string;
  team_b_name: string;
  team_b_color: string;
  team_b_logo_url?: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled';
  allow_precise_geo: boolean;
  require_captcha: boolean;
  max_votes_per_user: number;
  created_at: string;
  updated_at: string;
  total_votes_a?: number;
  total_votes_b?: number;
  total_votes?: number;
}

export interface FraudEvent {
  id: string;
  match_id: string;
  fingerprint_hash: string;
  ip_hash: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
  detected_at: string;
  reviewed: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

export interface VoteData {
  id: string;
  match_id: string;
  team: 'A' | 'B';
  h3_index: string;
  fingerprint_hash: string;
  voted_at: string;
  country_code?: string;
}

export interface AnalyticsData {
  totalVotes: number;
  totalMatches: number;
  activeUsers: number;
  votesOverTime: Array<{ date: string; votes: number }>;
  votesByCountry: Array<{ country: string; votes: number }>;
  votesByHour: Array<{ hour: number; votes: number }>;
  teamDominance: Array<{ team: string; votes: number }>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
