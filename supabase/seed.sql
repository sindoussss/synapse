
-- ==============================================================================
-- INITIAL SEED DATA FOR AGENTS & DEMO WORKFLOWS
-- ==============================================================================

-- 1. SEED 5 AUTONOMOUS AGENTS
INSERT INTO agents (id, name, role, status, model_provider, model_name)
VALUES 
  ('agent-ceo', 'CEO Agent', 'Executive & Strategic Orchestration', 'active', 'Anthropic', 'claude-3-7-sonnet'),
  ('agent-research', 'Research Agent', 'Market Research & Lead Discovery', 'running', 'OpenAI', 'gpt-4o'),
  ('agent-analyst', 'Website Analyst', 'Technical & SEO Audit', 'idle', 'Google Cloud', 'gemini-2.5-flash'),
  ('agent-developer', 'Developer Agent', 'Prototype Generation & Code Audit', 'running', 'Anthropic', 'claude-3-7-sonnet'),
  ('agent-sales', 'Sales Agent', 'Cold Outreach & Follow-up Drafts', 'waiting_approval', 'OpenAI', 'gpt-4o-mini')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  model_provider = EXCLUDED.model_provider,
  model_name = EXCLUDED.model_name;

-- 2. SEED DEMO LEADS
INSERT INTO leads (id, company_name, website, industry, website_score, opportunity_score, status, notes)
VALUES
  ('LEAD-001', 'Apex Logistics LLC', 'apexlogistics-demo.com', 'Transportation & Logistics', 38, 94, 'Mockup Ready', 'Flash warning, no mobile viewport'),
  ('LEAD-002', 'NexaHealth Care Group', 'nexahealthcare-sample.org', 'Healthcare & Clinics', 42, 91, 'Outreach Pending', 'LCP 4.8s, non-responsive appointment form'),
  ('LEAD-003', 'BlueWave Solar Energy', 'bluewavesolar-mock.io', 'Clean Energy & Roofing', 51, 88, 'Mockup Ready', 'No savings calculator, 8MB hero image'),
  ('LEAD-004', 'Horizon Legal Partners', 'horizonlegal-demo.net', 'Legal Services', 34, 86, 'Audited', 'Outdated 2018 layout, missing WCAG 2.1 tags'),
  ('LEAD-005', 'Summit Financial Group', 'summitfinancial-mock.com', 'Financial & Wealth Advisory', 46, 84, 'Contacted', 'Cluttered navigation, WordPress 5.2'),
  ('LEAD-006', 'Metro HVAC & Plumbing', 'metrohvacplumbing-sample.com', 'Home Services & Contracting', 29, 92, 'Qualified', 'Emergency number unclickable on mobile'),
  ('LEAD-007', 'Vanguard Precision Machining', 'vanguardprecision-mock.com', 'Manufacturing & Industrial', 31, 79, 'Discovered', 'HTML4 table layout, no RFQ CTA')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED INITIAL TASKS
INSERT INTO tasks (id, title, description, type, status, priority, assigned_agent_id, target_lead_id, input, output, created_at, started_at)
VALUES
  ('TSK-1001', 'Generate Next.js Landing Page Mockup for Apex Logistics', 'Synthesize high-conversion hero section, responsive booking widget, and pricing table using Tailwind CSS.', 'Mockup Dev', 'running', 'high', 'agent-developer', 'LEAD-001', '{"framework": "Next.js 16 / Tailwind", "targetUrl": "apexlogistics-demo.com"}'::jsonb, NULL, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '15 minutes'),
  ('TSK-1002', 'Deep Crawl Chicago Dental Practices Directory', 'Extract 45 SMB domain candidates with HTTP status 200 and mobile viewport checks.', 'Lead Discovery', 'running', 'medium', 'agent-research', 'LEAD-002', '{"directoryUrl": "illinoishealthcare-directory.gov/dental", "maxItems": 45}'::jsonb, NULL, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '25 minutes'),
  ('TSK-1003', 'Dispatch Cold Pitch Email to NexaHealth CMO', 'Send tailored audit report highlighting 4.8s mobile load time and offering free interactive mockup.', 'Outreach', 'waiting_approval', 'critical', 'agent-sales', 'LEAD-002', '{"recipient": "sarah.jenkins@nexahealthcare-sample.org", "subject": "Website UX Audit for NexaHealth"}'::jsonb, '{"draftEmailPreview": "Hi Sarah, our automated analyzer detected severe mobile layout issues..."}'::jsonb, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  ('TSK-1004', 'Deploy Public Vercel Demo for BlueWave Solar', 'Publish interactive calculator preview to staging sub-domain for client review.', 'Mockup Dev', 'waiting_approval', 'high', 'agent-developer', 'LEAD-003', '{"subdomain": "bluewave.clientdemos.co"}'::jsonb, NULL, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours'),
  ('TSK-1005', 'Performance & Accessibility Audit: Horizon Legal', 'Run Lighthouse CLI audit, check WCAG 2.1 AA compliance, and evaluate quote-form UX.', 'Site Audit', 'queued', 'medium', 'agent-analyst', 'LEAD-004', '{"targetUrl": "horizonlegal-demo.net"}'::jsonb, NULL, NOW() - INTERVAL '30 minutes', NULL),
  ('TSK-1008', 'Full Technical Audit for Summit Financial Group', 'Completed comprehensive site benchmark: detected 31/100 mobile score and outdated WordPress 5.2.', 'Site Audit', 'completed', 'high', 'agent-analyst', 'LEAD-005', '{"targetUrl": "summitfinancial-mock.com"}'::jsonb, '{"auditScore": 46, "vulnerabilities": 3}'::jsonb, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 40 minutes')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED INITIAL APPROVALS
INSERT INTO approvals (id, task_id, action_type, description, risk_level, payload, status, created_at)
VALUES
  ('APR-201', 'TSK-1003', 'Send Cold Outreach Pitch Email', 'Outbound pitch email with 3-page site performance audit to NexaHealth CMO.', 'high', '{"recipient": "sarah.jenkins@nexahealthcare-sample.org", "cost": "$0.002"}'::jsonb, 'pending', NOW() - INTERVAL '1 hour'),
  ('APR-202', 'TSK-1004', 'Deploy Public Staging Prototype', 'Publish interactive calculator preview to public subdomain bluewave.clientdemos.co.', 'medium', '{"domain": "bluewave.clientdemos.co", "framework": "Next.js 16"}'::jsonb, 'pending', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED INITIAL ACTIVITIES
INSERT INTO activities (id, agent_id, task_id, action, message, metadata, created_at)
VALUES
  ('act-seed-1', 'agent-developer', 'TSK-1001', 'task_started', 'Developer Agent started execution on "Generate Next.js Landing Page Mockup for Apex Logistics".', '{"taskId": "TSK-1001"}'::jsonb, NOW() - INTERVAL '15 minutes'),
  ('act-seed-2', 'agent-sales', 'TSK-1003', 'approval_event', 'Sales Agent requested approval for outbound pitch email to NexaHealth CMO.', '{"approvalId": "APR-201", "riskLevel": "high"}'::jsonb, NOW() - INTERVAL '1 hour'),
  ('act-seed-3', 'agent-analyst', 'TSK-1008', 'task_completed', 'Website Analyst completed technical audit for Summit Financial Group.', '{"taskId": "TSK-1008"}'::jsonb, NOW() - INTERVAL '3 hours 40 minutes')
ON CONFLICT (id) DO NOTHING;
