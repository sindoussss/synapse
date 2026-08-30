-- Migration 007: Create outreach_drafts table
CREATE TABLE IF NOT EXISTS outreach_drafts (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  redesign_project_id TEXT,
  deployment_id TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  follow_up TEXT,
  personalization JSONB,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'waiting_approval',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to outreach_drafts') THEN
    CREATE POLICY "Allow anon access to outreach_drafts" ON outreach_drafts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE outreach_drafts;