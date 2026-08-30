-- Phase 28: Company Intelligence & Profitability Engine

CREATE TABLE IF NOT EXISTS business_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    organization_id TEXT,
    lead_id TEXT,
    opportunity_id TEXT,
    project_id TEXT,
    agent_id TEXT,
    execution_id TEXT,
    source_classification TEXT NOT NULL DEFAULT 'CONTROLLED_TEST', -- LIVE_REAL, CONTROLLED_TEST, SYNTHETIC, SIMULATION
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    numeric_value NUMERIC,
    currency TEXT DEFAULT 'PHP',
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_record_type TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_cost_events (
    id TEXT PRIMARY KEY,
    cost_type TEXT NOT NULL, -- llm_api, hosting, deployment, email, signature_provider, payment_processing, domain, software_subscription, contractor, labor, marketing, other
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PHP',
    source TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT TRUE,
    allocation_method TEXT NOT NULL DEFAULT 'direct',
    organization_id TEXT,
    project_id TEXT,
    period TEXT,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, running, completed, cancelled
    assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
    results JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS business_decisions (
    id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    operator_decision TEXT NOT NULL, -- accepted, rejected, deferred
    reason TEXT,
    configuration_change JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_busevents_type ON business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_busevents_src ON business_events(source_classification);
CREATE INDEX IF NOT EXISTS idx_costevents_proj ON business_cost_events(project_id);