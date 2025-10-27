-- Team Vote Map - Initial Database Schema
-- Migration: 001_initial_schema
-- Description: Create all tables, constraints, and indexes for the team vote mapping system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE match_status AS ENUM ('draft', 'scheduled', 'active', 'ended', 'cancelled');
CREATE TYPE team_choice AS ENUM ('team_a', 'team_b');
CREATE TYPE location_source AS ENUM ('ip', 'browser_geo', 'manual');
CREATE TYPE fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL
);

-- 1. MATCHES TABLE
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_a_name VARCHAR(100) NOT NULL,
    team_a_color VARCHAR(7) NOT NULL CHECK (team_a_color ~ '^#[0-9A-Fa-f]{6}$'),
    team_a_logo_url TEXT,
    team_b_name VARCHAR(100) NOT NULL,
    team_b_color VARCHAR(7) NOT NULL CHECK (team_b_color ~ '^#[0-9A-Fa-f]{6}$'),
    team_b_logo_url TEXT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status match_status NOT NULL DEFAULT 'draft',
    allow_precise_geo BOOLEAN NOT NULL DEFAULT false,
    require_captcha BOOLEAN NOT NULL DEFAULT false,
    max_votes_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_votes_per_user > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT chk_match_time CHECK (end_time > start_time)
);

-- 2. ADMIN_USERS TABLE (referenced by matches.created_by)
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key constraint for matches.created_by
ALTER TABLE matches 
ADD CONSTRAINT fk_matches_created_by 
FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;

-- 3. VOTES_RAW TABLE
CREATE TABLE votes_raw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    team_choice team_choice NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    h3_index VARCHAR(15) NOT NULL,
    h3_resolution INTEGER NOT NULL CHECK (h3_resolution >= 0 AND h3_resolution <= 15),
    country_code VARCHAR(2),
    city_name VARCHAR(100),
    location_source location_source NOT NULL,
    consent_precise_geo BOOLEAN NOT NULL DEFAULT false,
    user_agent_hash VARCHAR(64),
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT fk_votes_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- 4. VOTE_AGG_H3 TABLE
CREATE TABLE vote_agg_h3 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    h3_index VARCHAR(15) NOT NULL,
    h3_resolution INTEGER NOT NULL CHECK (h3_resolution >= 0 AND h3_resolution <= 15),
    team_a_count INTEGER NOT NULL DEFAULT 0 CHECK (team_a_count >= 0),
    team_b_count INTEGER NOT NULL DEFAULT 0 CHECK (team_b_count >= 0),
    vote_count INTEGER GENERATED ALWAYS AS (team_a_count + team_b_count) STORED,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_vote_agg_h3_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT uk_vote_agg_h3_match_index UNIQUE (match_id, h3_index, h3_resolution)
);

-- 5. VOTE_AGG_COUNTRY TABLE
CREATE TABLE vote_agg_country (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    team_a_count INTEGER NOT NULL DEFAULT 0 CHECK (team_a_count >= 0),
    team_b_count INTEGER NOT NULL DEFAULT 0 CHECK (team_b_count >= 0),
    vote_count INTEGER GENERATED ALWAYS AS (team_a_count + team_b_count) STORED,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_vote_agg_country_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT uk_vote_agg_country_match_code UNIQUE (match_id, country_code)
);

-- 6. FRAUD_EVENTS TABLE
CREATE TABLE fraud_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL,
    fingerprint_hash VARCHAR(64),
    ip_hash VARCHAR(64),
    detection_reason TEXT NOT NULL,
    severity fraud_severity NOT NULL,
    metadata JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_fraud_match_id FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 7. AUDIT_LOG TABLE
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_audit_admin_id FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- CREATE ALL INDEXES (from Appendix B)

-- votes_raw indexes
CREATE INDEX idx_votes_match_time ON votes_raw(match_id, voted_at DESC) WHERE deleted = false;
CREATE INDEX idx_votes_fp_match ON votes_raw(fingerprint_hash, match_id) WHERE deleted = false;
CREATE INDEX idx_votes_ip_match ON votes_raw(ip_hash, match_id) WHERE deleted = false;
CREATE INDEX idx_votes_h3 ON votes_raw(h3_index, h3_resolution, match_id) WHERE deleted = false;
CREATE INDEX idx_votes_deleted ON votes_raw(deleted, match_id);

-- vote_agg_h3 indexes
CREATE INDEX idx_vote_agg_match_h3 ON vote_agg_h3(match_id, h3_resolution, vote_count DESC);
CREATE INDEX idx_vote_agg_updated ON vote_agg_h3(last_updated_at DESC);

-- matches indexes
CREATE INDEX idx_matches_status_time ON matches(status, start_time, end_time);
CREATE INDEX idx_matches_active ON matches(status, start_time) WHERE status IN ('scheduled', 'active');

-- fraud_events indexes
CREATE INDEX idx_fraud_match_severity ON fraud_events(match_id, severity, detected_at DESC);
CREATE INDEX idx_fraud_fp ON fraud_events(fingerprint_hash, detected_at DESC);
CREATE INDEX idx_fraud_unreviewed ON fraud_events(reviewed, detected_at DESC) WHERE reviewed = false;

-- audit_log indexes
CREATE INDEX idx_audit_type_time ON audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);

-- CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vote_agg_h3_updated_at 
    BEFORE UPDATE ON vote_agg_h3 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vote_agg_country_updated_at 
    BEFORE UPDATE ON vote_agg_country 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert migration record
INSERT INTO migrations (version, name, checksum) 
VALUES ('001', 'initial_schema', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');

COMMIT;