-- Phase 29: Market Pilots & Live Real Commercial Evidence

CREATE TABLE IF NOT EXISTS market_pilots (
    id TEXT PRIMARY KEY,
    pilot_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, waiting_approval, approved, running, paused, completed, cancelled
    target_lead_count INTEGER NOT NULL DEFAULT 10,
    max_outbound_messages INTEGER NOT NULL DEFAULT 10,
    industry_scope TEXT,
    location_scope TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL DEFAULT 'operator',
    approved_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_pilot_sends (
    id TEXT PRIMARY KEY,
    pilot_id TEXT NOT NULL REFERENCES market_pilots(id),
    organization_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    approval_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    thread_id TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    source_classification TEXT NOT NULL DEFAULT 'LIVE_REAL_OUTREACH'
);

CREATE TABLE IF NOT EXISTS dnc_suppressions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- organization, contact, email, domain
    entity_value TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    suppressed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pilot_status ON market_pilots(status);
CREATE INDEX IF NOT EXISTS idx_pilot_sends ON market_pilot_sends(pilot_id);
CREATE INDEX IF NOT EXISTS idx_dnc_val ON dnc_suppressions(entity_value);