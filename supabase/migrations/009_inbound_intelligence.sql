-- Migration 009: Inbound Reply Intelligence tables

-- 1. email_messages table
CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  email_send_id TEXT REFERENCES email_sends(id) ON DELETE SET NULL,
  outreach_draft_id TEXT REFERENCES outreach_drafts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_message_id TEXT,
  provider_thread_id TEXT,
  in_reply_to TEXT,
  direction TEXT NOT NULL, -- 'outbound' | 'inbound'
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  has_attachments BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. reply_analyses table
CREATE TABLE IF NOT EXISTS reply_analyses (
  id TEXT PRIMARY KEY,
  email_message_id TEXT REFERENCES email_messages(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  classification TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.90,
  summary TEXT NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb,
  requested_actions JSONB DEFAULT '[]'::jsonb,
  commercial_signals JSONB DEFAULT '[]'::jsonb,
  suggested_next_step TEXT NOT NULL,
  needs_human_attention BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. response_drafts table
CREATE TABLE IF NOT EXISTS response_drafts (
  id TEXT PRIMARY KEY,
  reply_analysis_id TEXT REFERENCES reply_analyses(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  grounding JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting_approval', -- 'waiting_approval' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to email_messages') THEN
    CREATE POLICY "Allow anon access to email_messages" ON email_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to reply_analyses') THEN
    CREATE POLICY "Allow anon access to reply_analyses" ON reply_analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to response_drafts') THEN
    CREATE POLICY "Allow anon access to response_drafts" ON response_drafts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE email_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE reply_analyses;
ALTER PUBLICATION supabase_realtime ADD TABLE response_drafts;