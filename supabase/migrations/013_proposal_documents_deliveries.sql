-- Migration 013: Proposal Documents and Deliveries for Phase 15
CREATE TABLE IF NOT EXISTS proposal_documents (
  id TEXT PRIMARY KEY,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  proposal_version INT NOT NULL DEFAULT 1,
  document_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting_approval',
  title TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  pdf_path_or_url TEXT,
  content_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_deliveries (
  id TEXT PRIMARY KEY,
  proposal_document_id TEXT REFERENCES proposal_documents(id) ON DELETE CASCADE,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  provider_message_id TEXT,
  provider_thread_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proposal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to proposal_documents') THEN
    CREATE POLICY "Allow anon access to proposal_documents" ON proposal_documents FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to proposal_deliveries') THEN
    CREATE POLICY "Allow anon access to proposal_deliveries" ON proposal_deliveries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE proposal_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_deliveries;