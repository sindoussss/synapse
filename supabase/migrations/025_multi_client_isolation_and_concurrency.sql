-- Phase 27: Multi-Client Isolation & Concurrent Operations

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,
    status TEXT NOT NULL DEFAULT 'prospect', -- prospect, active_client, past_client, archived
    primary_contact_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS organization_contacts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'primary_contact',
    source TEXT NOT NULL DEFAULT 'manual',
    verification_status TEXT NOT NULL DEFAULT 'verified',
    do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_leases (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL UNIQUE,
    agent_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    project_id TEXT,
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_mutation_locks (
    project_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    locked_by_execution_id TEXT NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS isolation_incidents (
    id TEXT PRIMARY KEY,
    incident_type TEXT NOT NULL, -- CROSS_CLIENT_WRITE_BLOCKED, CROSS_CLIENT_READ_BLOCKED, SCOPE_MISMATCH
    actor TEXT NOT NULL,
    execution_id TEXT,
    source_organization_id TEXT NOT NULL,
    target_organization_id TEXT,
    target_project_id TEXT,
    action_attempted TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON organization_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_leases_task ON execution_leases(task_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON isolation_incidents(source_organization_id);