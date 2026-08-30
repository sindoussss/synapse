-- Migration 012: Create proposals table for Phase 14 Human-Controlled Proposal Builder
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting_approval',
  title TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  client_needs JSONB DEFAULT '[]'::jsonb,
  scope_items JSONB DEFAULT '[]'::jsonb,
  exclusions JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  optional_enhancements JSONB DEFAULT '[]'::jsonb,
  assumptions JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '{}'::jsonb,
  pricing JSONB DEFAULT '{}'::jsonb,
  payment_terms JSONB DEFAULT '{}'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  source_grounding JSONB DEFAULT '{}'::jsonb,
  generated_by TEXT DEFAULT 'Sales Agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to proposals') THEN
    CREATE POLICY "Allow anon access to proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE proposals;