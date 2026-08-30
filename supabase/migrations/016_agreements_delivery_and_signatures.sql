-- Migration 016: Agreement Documents, Deliveries, Signing Sessions, and Signature Events for Phase 18
CREATE TABLE IF NOT EXISTS agreement_documents (
  id TEXT PRIMARY KEY,
  agreement_id TEXT REFERENCES agreements(id) ON DELETE CASCADE,
  agreement_version INT NOT NULL DEFAULT 1,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  document_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting_approval',
  rendered_html TEXT,
  pdf_reference TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  signing_started_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agreement_deliveries (
  id TEXT PRIMARY KEY,
  agreement_id TEXT REFERENCES agreements(id) ON DELETE CASCADE,
  agreement_document_id TEXT REFERENCES agreement_documents(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS signing_sessions (
  id TEXT PRIMARY KEY,
  agreement_id TEXT REFERENCES agreements(id) ON DELETE CASCADE,
  agreement_document_id TEXT REFERENCES agreement_documents(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'internal_esign',
  provider_request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_delivery',
  document_hash TEXT NOT NULL,
  required_signers JSONB NOT NULL,
  completed_signers JSONB NOT NULL DEFAULT '[]'::jsonb,
  signing_url_reference TEXT,
  client_signed_at TIMESTAMPTZ,
  operator_signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signature_events (
  id TEXT PRIMARY KEY,
  signing_session_id TEXT REFERENCES signing_sessions(id) ON DELETE CASCADE,
  agreement_id TEXT REFERENCES agreements(id) ON DELETE CASCADE,
  agreement_document_id TEXT REFERENCES agreement_documents(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  provider_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agreement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to agreement_documents') THEN
    CREATE POLICY "Allow anon access to agreement_documents" ON agreement_documents FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to agreement_deliveries') THEN
    CREATE POLICY "Allow anon access to agreement_deliveries" ON agreement_deliveries FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to signing_sessions') THEN
    CREATE POLICY "Allow anon access to signing_sessions" ON signing_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to signature_events') THEN
    CREATE POLICY "Allow anon access to signature_events" ON signature_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE agreement_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE agreement_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE signing_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE signature_events;