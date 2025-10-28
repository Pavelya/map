-- Team Vote Map Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    team_a_name VARCHAR(100) NOT NULL,
    team_a_color VARCHAR(7) NOT NULL,
    team_a_logo_url TEXT,
    team_b_name VARCHAR(100) NOT NULL,
    team_b_color VARCHAR(7) NOT NULL,
    team_b_logo_url TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    allow_precise_geo BOOLEAN DEFAULT false,
    require_captcha BOOLEAN DEFAULT true,
    max_votes_per_user INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    CONSTRAINT check_status CHECK (status IN ('draft', 'scheduled', 'active', 'ended', 'cancelled')),
    CONSTRAINT check_end_time CHECK (end_time > start_time)
);

-- Votes Table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team VARCHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
    h3_index VARCHAR(15) NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(64),
    country_code VARCHAR(2),
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Fraud Events Table
CREATE TABLE IF NOT EXISTS fraud_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES admin_users(id),
    notes TEXT
);

-- Vote Aggregates Table (for performance)
CREATE TABLE IF NOT EXISTS vote_aggregates (
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    h3_index VARCHAR(15) NOT NULL,
    team VARCHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
    vote_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (match_id, h3_index, team)
);

-- Migrations Table (for tracking)
CREATE TABLE IF NOT EXISTS migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_match_id ON votes(match_id);
CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(match_id, fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_votes_h3 ON votes(match_id, h3_index);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON votes(voted_at);

-- Fraud events indexes
CREATE INDEX IF NOT EXISTS idx_fraud_match_id ON fraud_events(match_id);
CREATE INDEX IF NOT EXISTS idx_fraud_fingerprint ON fraud_events(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_fraud_severity ON fraud_events(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_reviewed ON fraud_events(reviewed);
CREATE INDEX IF NOT EXISTS idx_fraud_detected_at ON fraud_events(detected_at);

-- Vote aggregates indexes
CREATE INDEX IF NOT EXISTS idx_aggregates_match ON vote_aggregates(match_id);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_start_time ON matches(start_time);
CREATE INDEX IF NOT EXISTS idx_matches_end_time ON matches(end_time);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update match updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to auto-update matches.updated_at
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert initial migration record
INSERT INTO migrations (version, name, checksum)
VALUES ('001', 'initial_schema', 'manual_creation')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - Enable if needed)
-- ============================================================================

-- Enable RLS on tables (commented out by default)
-- ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vote_aggregates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
