-- Migration 015: Agreements and Legal Templates for Phase 17
CREATE TABLE IF NOT EXISTS agreement_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agreement_type TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  jurisdiction TEXT NOT NULL DEFAULT 'Philippines',
  template_sections JSONB NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE CASCADE,
  proposal_version INT NOT NULL DEFAULT 1,
  negotiation_session_id TEXT REFERENCES negotiation_sessions(id) ON DELETE SET NULL,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting_operator_review',
  agreement_type TEXT NOT NULL DEFAULT 'web_development_service_agreement',
  title TEXT NOT NULL,
  parties JSONB NOT NULL,
  commercial_baseline JSONB NOT NULL,
  scope JSONB NOT NULL,
  exclusions JSONB NOT NULL,
  deliverables JSONB NOT NULL,
  timeline JSONB NOT NULL,
  pricing JSONB NOT NULL,
  payment_terms JSONB NOT NULL,
  client_responsibilities JSONB,
  operator_responsibilities JSONB,
  revision_policy JSONB,
  termination_terms JSONB,
  ownership_terms JSONB,
  confidentiality_terms JSONB,
  warranties JSONB,
  limitations JSONB,
  dispute_terms JSONB,
  governing_law JSONB,
  signature_blocks JSONB,
  legal_review_required BOOLEAN NOT NULL DEFAULT true,
  content_hash TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to agreement_templates') THEN
    CREATE POLICY "Allow anon access to agreement_templates" ON agreement_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to agreements') THEN
    CREATE POLICY "Allow anon access to agreements" ON agreements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE agreement_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE agreements;