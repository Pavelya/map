-- Vote aggregation functions for atomic updates
-- Migration: 002_vote_aggregation_functions

-- Function to increment H3 vote aggregation (atomic)
CREATE OR REPLACE FUNCTION increment_h3_aggregate(
    p_match_id UUID,
    p_h3_index TEXT,
    p_h3_resolution INT,
    p_team_choice TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO vote_agg_h3 (id, match_id, h3_index, h3_resolution, team_a_count, team_b_count, last_updated_at)
    VALUES (
        gen_random_uuid(),
        p_match_id,
        p_h3_index,
        p_h3_resolution,
        CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (match_id, h3_index, h3_resolution)
    DO UPDATE SET
        team_a_count = vote_agg_h3.team_a_count + CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        team_b_count = vote_agg_h3.team_b_count + CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment country vote aggregation (atomic)
CREATE OR REPLACE FUNCTION increment_country_aggregate(
    p_match_id UUID,
    p_country_code TEXT,
    p_team_choice TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO vote_agg_country (id, match_id, country_code, team_a_count, team_b_count, last_updated_at)
    VALUES (
        gen_random_uuid(),
        p_match_id,
        p_country_code,
        CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END,
        NOW()
    )
    ON CONFLICT (match_id, country_code)
    DO UPDATE SET
        team_a_count = vote_agg_country.team_a_count + CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        team_b_count = vote_agg_country.team_b_count + CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get all match aggregates
CREATE OR REPLACE FUNCTION get_match_aggregates(p_match_id UUID)
RETURNS TABLE(
    aggregate_type TEXT,
    location_key TEXT,
    resolution INT,
    team_a_count INT,
    team_b_count INT,
    vote_count INT,
    last_updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Return H3 aggregates
    RETURN QUERY
    SELECT 
        'h3'::TEXT as aggregate_type,
        h3_index as location_key,
        h3_resolution as resolution,
        team_a_count,
        team_b_count,
        vote_count,
        last_updated_at
    FROM vote_agg_h3 
    WHERE match_id = p_match_id;
    
    -- Return country aggregates
    RETURN QUERY
    SELECT 
        'country'::TEXT as aggregate_type,
        country_code as location_key,
        0 as resolution,
        team_a_count,
        team_b_count,
        vote_count,
        last_updated_at
    FROM vote_agg_country 
    WHERE match_id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get realtime match statistics
CREATE OR REPLACE FUNCTION get_realtime_stats(p_match_id UUID)
RETURNS TABLE(
    total_votes BIGINT,
    team_a_votes BIGINT,
    team_b_votes BIGINT,
    unique_countries INT,
    unique_h3_cells INT,
    last_vote_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(vote_count), 0)::BIGINT as total_votes,
        COALESCE(SUM(team_a_count), 0)::BIGINT as team_a_votes,
        COALESCE(SUM(team_b_count), 0)::BIGINT as team_b_votes,
        (SELECT COUNT(DISTINCT country_code)::INT FROM vote_agg_country WHERE match_id = p_match_id) as unique_countries,
        (SELECT COUNT(DISTINCT h3_index)::INT FROM vote_agg_h3 WHERE match_id = p_match_id) as unique_h3_cells,
        (SELECT MAX(voted_at) FROM votes_raw WHERE match_id = p_match_id AND deleted = false) as last_vote_at
    FROM vote_agg_h3 
    WHERE match_id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- Legacy function for backward compatibility
CREATE OR REPLACE FUNCTION upsert_vote_agg_h3(
    p_match_id UUID,
    p_h3_index VARCHAR(15),
    p_h3_resolution INTEGER,
    p_team_choice team_choice
) RETURNS VOID AS $$
BEGIN
    PERFORM increment_h3_aggregate(p_match_id, p_h3_index, p_h3_resolution, p_team_choice::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Legacy function for backward compatibility
CREATE OR REPLACE FUNCTION upsert_vote_agg_country(
    p_match_id UUID,
    p_country_code VARCHAR(2),
    p_team_choice team_choice
) RETURNS VOID AS $$
BEGIN
    PERFORM increment_country_aggregate(p_match_id, p_country_code, p_team_choice::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Insert migration record
INSERT INTO migrations (version, name, checksum) 
VALUES ('002', 'vote_aggregation_functions', 'a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7')
ON CONFLICT (version) DO UPDATE SET 
    checksum = EXCLUDED.checksum,
    applied_at = NOW();