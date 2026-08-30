-- Migration 003: Extend leads table for provenance and location
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'web_search';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS discovered_by_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;