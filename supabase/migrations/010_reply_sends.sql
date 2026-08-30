-- Migration 010: Create reply_sends table for Phase 12 Controlled Reply Sending
CREATE TABLE IF NOT EXISTS reply_sends (
  id TEXT PRIMARY KEY,
  response_draft_id TEXT REFERENCES response_drafts(id) ON DELETE CASCADE,
  reply_analysis_id TEXT REFERENCES reply_analyses(id) ON DELETE SET NULL,
  email_message_id TEXT REFERENCES email_messages(id) ON DELETE SET NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_thread_id TEXT,
  in_reply_to_message_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  provider_message_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reply_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to reply_sends') THEN
    CREATE POLICY "Allow anon access to reply_sends" ON reply_sends FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE reply_sends;