-- Phase 22: Autonomous Production Developer Agent & Workspace Security

CREATE TABLE IF NOT EXISTS workspace_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT,
    snapshot_type TEXT NOT NULL, -- before_execution, after_execution, rollback, manual
    manifest_hash TEXT NOT NULL,
    file_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by TEXT NOT NULL DEFAULT 'developer_agent',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS developer_executions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- running, waiting_approval, approved, rejected, failed, rolled_back
    plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    files_changed JSONB NOT NULL DEFAULT '[]'::jsonb,
    build_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    security_scan JSONB NOT NULL DEFAULT '{}'::jsonb,
    scope_validation JSONB NOT NULL DEFAULT '{}'::jsonb,
    repair_attempts INTEGER NOT NULL DEFAULT 0,
    before_snapshot_id TEXT,
    after_snapshot_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS content_placeholders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file TEXT NOT NULL,
    location TEXT NOT NULL,
    placeholder_type TEXT NOT NULL, -- logo, service_description, contact_recipient, copy
    description TEXT NOT NULL,
    dependency_id TEXT,
    status TEXT NOT NULL DEFAULT 'placeholder', -- placeholder, client_provided, approved, resolved
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- image, icon, font, document
    source TEXT NOT NULL,
    rights_status TEXT NOT NULL DEFAULT 'public_placeholder', -- client_provided, licensed, generated, public_placeholder, unknown
    file_reference TEXT NOT NULL,
    usage TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_work_snap_proj ON workspace_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_exec_proj ON developer_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_exec_task ON developer_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_placeholders_proj ON content_placeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_proj ON project_assets(project_id);