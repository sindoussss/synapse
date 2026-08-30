-- Migration 005: Create redesign_projects table
CREATE TABLE IF NOT EXISTS redesign_projects (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  audit_id TEXT,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  design_brief JSONB,
  generated_files JSONB,
  preview_path TEXT,
  validation_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

ALTER TABLE redesign_projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to redesign_projects') THEN
    CREATE POLICY "Allow anon access to redesign_projects" ON redesign_projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE redesign_projects;