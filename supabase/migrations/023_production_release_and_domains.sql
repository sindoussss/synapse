-- Phase 25: Controlled Production Release & Domain Cutover

CREATE TABLE IF NOT EXISTS production_releases (
    id TEXT PRIMARY KEY,
    release_number TEXT NOT NULL, -- REL-2026-000001
    project_id TEXT NOT NULL,
    review_session_id TEXT NOT NULL,
    review_number TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    manifest_hash TEXT NOT NULL,
    qa_run_id TEXT NOT NULL,
    deployment_provider TEXT NOT NULL DEFAULT 'vercel',
    provider_deployment_id TEXT,
    production_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, blocked, waiting_release_approval, approved, building, deployed, waiting_dns_approval, dns_updating, verifying, live, failed, rolled_back
    build_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    security_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    configuration_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    dns_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    health_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    rollback_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_by TEXT NOT NULL DEFAULT 'operator',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    deployed_at TIMESTAMP WITH TIME ZONE,
    cutover_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS project_domains (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    domain_type TEXT NOT NULL DEFAULT 'subdomain', -- apex, www, subdomain
    provider TEXT NOT NULL DEFAULT 'manual',
    ownership_status TEXT NOT NULL DEFAULT 'verified',
    verification_status TEXT NOT NULL DEFAULT 'verified',
    current_dns_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    desired_dns_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active', -- unverified, verified, planning, waiting_approval, updating, propagating, active, failed, rolled_back
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    cutover_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_releases_proj ON production_releases(project_id);
CREATE INDEX IF NOT EXISTS idx_releases_snap ON production_releases(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_domains_proj ON project_domains(project_id);