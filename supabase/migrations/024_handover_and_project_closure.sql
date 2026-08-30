-- Phase 26: Client Handover, Final Invoicing, Payment & Project Closure

CREATE TABLE IF NOT EXISTS handover_packages (
    id TEXT PRIMARY KEY,
    handover_number TEXT NOT NULL, -- HND-2026-000001
    project_id TEXT NOT NULL,
    release_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, waiting_approval, approved, delivery_pending, delivered, client_review, confirmed, superseded
    release_snapshot_id TEXT NOT NULL,
    release_manifest_hash TEXT NOT NULL,
    client_documents JSONB NOT NULL DEFAULT '{}'::jsonb,
    technical_documents JSONB NOT NULL DEFAULT '{}'::jsonb,
    configuration_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    asset_inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_artifact_id TEXT,
    source_artifact_hash TEXT,
    delivery_message_id TEXT,
    client_confirmation_evidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    client_confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS handover_items (
    id TEXT PRIMARY KEY,
    handover_package_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    item_type TEXT NOT NULL, -- domain, hosting, repository, source_code, assets, analytics, form_configuration, documentation, credentials, other
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- not_required, pending, ready, transferred, verified, blocked
    transferred_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_handover_proj ON handover_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_handover_rel ON handover_packages(release_id);
CREATE INDEX IF NOT EXISTS idx_handover_items_pkg ON handover_items(handover_package_id);