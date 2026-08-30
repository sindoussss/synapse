-- Phase 21: Operator-Controlled Deal Closing & Production Project Kickoff

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_number TEXT UNIQUE NOT NULL,
    opportunity_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    agreement_version INTEGER NOT NULL DEFAULT 1,
    agreement_document_id TEXT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, planning, waiting_approval, ready, in_progress, blocked, client_review, completed, cancelled
    currency TEXT NOT NULL DEFAULT 'PHP',
    contract_value_minor BIGINT NOT NULL DEFAULT 0,
    verified_paid_minor BIGINT NOT NULL DEFAULT 0,
    outstanding_minor BIGINT NOT NULL DEFAULT 0,
    planned_start_date TIMESTAMP WITH TIME ZONE,
    contractual_end_date TIMESTAMP WITH TIME ZONE,
    scope_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclusions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    client_responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    commercial_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS project_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sequence INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'planned', -- planned, ready, in_progress, blocked, client_review, completed
    is_contractual BOOLEAN NOT NULL DEFAULT true,
    target_date TIMESTAMP WITH TIME ZONE,
    acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS project_change_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requested_by TEXT NOT NULL, -- client, operator, agent
    status TEXT NOT NULL DEFAULT 'candidate', -- candidate, under_review, approved, rejected
    scope_classification TEXT NOT NULL DEFAULT 'outside_contractual_scope',
    commercial_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_projects_opp ON projects(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_projects_agr ON projects(agreement_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_milestones_proj ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_change_req_proj ON project_change_requests(project_id);