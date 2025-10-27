-- Vote aggregation functions for atomic updates
-- Migration: 002_vote_aggregation_functions

-- Function to upsert H3 vote aggregation
CREATE OR REPLACE FUNCTION upsert_vote_agg_h3(
    p_match_id UUID,
    p_h3_index VARCHAR(15),
    p_h3_resolution INTEGER,
    p_team_choice team_choice
) RETURNS VOID AS $$
BEGIN
    INSERT INTO vote_agg_h3 (match_id, h3_index, h3_resolution, team_a_count, team_b_count)
    VALUES (
        p_match_id, 
        p_h3_index, 
        p_h3_resolution,
        CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END
    )
    ON CONFLICT (match_id, h3_index, h3_resolution)
    DO UPDATE SET
        team_a_count = vote_agg_h3.team_a_count + CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        team_b_count = vote_agg_h3.team_b_count + CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to upsert country vote aggregation
CREATE OR REPLACE FUNCTION upsert_vote_agg_country(
    p_match_id UUID,
    p_country_code VARCHAR(2),
    p_team_choice team_choice
) RETURNS VOID AS $$
BEGIN
    INSERT INTO vote_agg_country (match_id, country_code, team_a_count, team_b_count)
    VALUES (
        p_match_id, 
        p_country_code,
        CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END
    )
    ON CONFLICT (match_id, country_code)
    DO UPDATE SET
        team_a_count = vote_agg_country.team_a_count + CASE WHEN p_team_choice = 'team_a' THEN 1 ELSE 0 END,
        team_b_count = vote_agg_country.team_b_count + CASE WHEN p_team_choice = 'team_b' THEN 1 ELSE 0 END,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert migration record
INSERT INTO migrations (version, name, checksum) 
VALUES ('002', 'vote_aggregation_functions', 'f1e2d3c4b5a6978869504132435465768');