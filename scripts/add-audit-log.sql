-- Add audit_log table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id),
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_type_time ON audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id, created_at DESC);
