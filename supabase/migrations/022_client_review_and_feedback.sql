-- Phase 24: Client Review Preview & Feedback Management

CREATE TABLE IF NOT EXISTS client_review_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    review_number TEXT NOT NULL, -- REV-2026-000001
    snapshot_id TEXT NOT NULL,
    manifest_hash TEXT NOT NULL,
    qa_run_id TEXT NOT NULL,
    deployment_id TEXT,
    preview_url TEXT,
    access_status TEXT NOT NULL DEFAULT 'accessible', -- accessible, client_access_blocked
    status TEXT NOT NULL DEFAULT 'draft', -- draft, waiting_deployment_approval, deploying, ready, invitation_pending, in_review, changes_requested, accepted, superseded, cancelled
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    invitation_message_id TEXT,
    client_opened_at TIMESTAMP WITH TIME ZONE,
    feedback_deadline TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_snapshot_hash TEXT,
    accepted_by_client_evidence TEXT,
    confirmed_by_operator TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL DEFAULT 'operator'
);

CREATE TABLE IF NOT EXISTS client_feedback (
    id TEXT PRIMARY KEY,
    review_session_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'email', -- email, operator, portal
    message_id TEXT,
    raw_text TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    classification TEXT NOT NULL, -- BUG, CONTRACTUAL_REVISION, CONTENT_UPDATE, CLIENT_CONFIGURATION, OUT_OF_SCOPE_REQUEST, QUESTION, POSITIVE_FEEDBACK, ACCEPTANCE_SIGNAL, UNCLEAR
    scope_status TEXT NOT NULL, -- in_scope, out_of_scope, pending_operator
    severity TEXT, -- critical, high, medium, low
    route TEXT,
    viewport TEXT,
    element_reference TEXT,
    operator_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, resolved
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rev_sess_proj ON client_review_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_rev_sess_snap ON client_review_sessions(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sess ON client_feedback(review_session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_proj ON client_feedback(project_id);