-- Phase 29B: Pilot Source Classification and Counter Isolation

ALTER TABLE market_pilots ADD COLUMN IF NOT EXISTS live_send_committed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_pilots ADD COLUMN IF NOT EXISTS controlled_test_send_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_pilots ADD COLUMN IF NOT EXISTS blocked_attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE market_pilot_sends ADD COLUMN IF NOT EXISTS recipient_classification TEXT NOT NULL DEFAULT 'CONTROLLED_TEST_EXTERNAL_EFFECT';
ALTER TABLE dnc_suppressions ADD COLUMN IF NOT EXISTS source_classification TEXT NOT NULL DEFAULT 'CONTROLLED_TEST';