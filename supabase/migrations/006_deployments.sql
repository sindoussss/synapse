-- Migration 006: Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  redesign_project_id TEXT,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'vercel',
  deployment_type TEXT NOT NULL DEFAULT 'preview',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  provider_deployment_id TEXT,
  preview_url TEXT,
  commit_hash TEXT,
  build_logs JSONB,
  validation_results JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to deployments') THEN
    CREATE POLICY "Allow anon access to deployments" ON deployments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE deployments;