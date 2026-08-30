-- Migration 014: Negotiation Sessions and Events for Phase 16
CREATE TABLE IF NOT EXISTS negotiation_sessions (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  proposal_id TEXT REFERENCES proposals(id) ON DELETE CASCADE,
  proposal_document_id TEXT REFERENCES proposal_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  current_proposal_version INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negotiation_events (
  id TEXT PRIMARY KEY,
  negotiation_session_id TEXT REFERENCES negotiation_sessions(id) ON DELETE CASCADE,
  email_message_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  requested_changes JSONB,
  objections JSONB,
  commercial_signals JSONB,
  source_grounding JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to negotiation_sessions') THEN
    CREATE POLICY "Allow anon access to negotiation_sessions" ON negotiation_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to negotiation_events') THEN
    CREATE POLICY "Allow anon access to negotiation_events" ON negotiation_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_events;