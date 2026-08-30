-- Migration 004: Create website_audits table
CREATE TABLE IF NOT EXISTS website_audits (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  performance_score INTEGER NOT NULL,
  mobile_score INTEGER NOT NULL,
  seo_score INTEGER NOT NULL,
  accessibility_score INTEGER NOT NULL,
  conversion_score INTEGER NOT NULL,
  design_score INTEGER NOT NULL,
  website_score INTEGER NOT NULL,
  redesign_opportunity_score INTEGER NOT NULL,
  findings JSONB,
  strengths JSONB,
  weaknesses JSONB,
  summary TEXT,
  recommended_action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE website_audits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to website_audits') THEN
    CREATE POLICY "Allow anon access to website_audits" ON website_audits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE website_audits;