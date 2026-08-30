-- Phase 23: Independent QA & Visual Review Agent

CREATE TABLE IF NOT EXISTS qa_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    workspace_snapshot_id TEXT NOT NULL,
    manifest_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, running, failed, defects_found, passed, waiting_approval, approved, stale
    build_status TEXT NOT NULL DEFAULT 'pending',
    runtime_status TEXT NOT NULL DEFAULT 'pending',
    viewport_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    functional_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    accessibility_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    visual_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    console_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    network_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    link_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    defect_count INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    low_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL DEFAULT 'operator'
);

CREATE TABLE IF NOT EXISTS qa_defects (
    id TEXT PRIMARY KEY,
    qa_run_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    task_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- build, runtime, responsive, visual, accessibility, navigation, form, content, asset, performance, security, contractual, design_divergence
    severity TEXT NOT NULL, -- critical, high, medium, low
    route TEXT,
    viewport TEXT,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    contractual_source TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- open, repair_queued, repair_in_progress, awaiting_retest, resolved, wont_fix
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_qa_runs_proj ON qa_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_runs_snap ON qa_runs(workspace_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_qa_defects_run ON qa_defects(qa_run_id);
CREATE INDEX IF NOT EXISTS idx_qa_defects_proj ON qa_defects(project_id);