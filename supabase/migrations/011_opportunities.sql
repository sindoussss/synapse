-- Migration 011: Create opportunities table for Phase 13 Opportunity & Deal Management
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  primary_contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  stage TEXT NOT NULL DEFAULT 'new',
  title TEXT NOT NULL,
  summary TEXT,
  project_type TEXT DEFAULT 'website_redesign',
  requested_scope JSONB DEFAULT '[]'::jsonb,
  required_features JSONB DEFAULT '[]'::jsonb,
  optional_features JSONB DEFAULT '[]'::jsonb,
  prospect_questions JSONB DEFAULT '[]'::jsonb,
  unresolved_questions JSONB DEFAULT '[]'::jsonb,
  commercial_signals JSONB DEFAULT '[]'::jsonb,
  budget_signal TEXT DEFAULT 'unknown',
  budget_literal TEXT,
  timeline_signal TEXT DEFAULT 'unknown',
  authority_signal TEXT DEFAULT 'unknown',
  qualification JSONB DEFAULT '{}'::jsonb,
  next_recommended_action TEXT,
  proposal_readiness INT DEFAULT 0,
  source_reply_analysis_id TEXT REFERENCES reply_analyses(id) ON DELETE SET NULL,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to opportunities') THEN
    CREATE POLICY "Allow anon access to opportunities" ON opportunities FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE opportunities;