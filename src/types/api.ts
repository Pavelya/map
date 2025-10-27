export interface VoteResponse {
  success: boolean;
  voteId: string;
  currentStats: {
    teamACount: number;
    teamBCount: number;
    totalVotes: number;
  };
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export interface VoteSubmissionData {
  matchId: string;
  teamChoice: 'team_a' | 'team_b';
  fingerprint: string;
  location: {
    h3Index: string;
    h3Resolution: number;
    countryCode?: string;
    cityName?: string;
    source: 'ip' | 'browser_geo' | 'manual';
    consentPreciseGeo: boolean;
  };
  captchaToken?: string;
  userAgent: string;
}

export interface FraudDetectionResult {
  isSuspicious: boolean;
  reasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MatchValidationResult {
  isValid: boolean;
  match?: {
    id: string;
    status: string;
    requireCaptcha: boolean;
    maxVotesPerUser: number;
  };
  error?: string;
}

export interface VoteServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}