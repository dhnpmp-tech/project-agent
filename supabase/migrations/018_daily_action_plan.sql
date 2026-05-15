-- Migration 018 · Daily action plan + owner approval.
--
-- The teardown promises a 7-Day Plan the agent will execute with owner
-- approval. The agent_action_queue table existed, but nothing was
-- populating it as a daily plan and nothing surfaced pending actions
-- to the owner for approval. This wires that loop.
--
-- Flow:
--   1. cron @ 22:00 tenant-local · generate_tomorrow_plan(client_id)
--      inserts 5-8 actions for tomorrow into agent_action_queue with
--      status='pending_approval' + for_date=tomorrow.
--   2. cron @ 09:00 tenant-local (existing owner brief fan-out) now
--      includes the pending actions in the brief text with a one-tap
--      approval block ("Reply YES to approve all · NO to skip · or
--      mention a letter (A/B/C) to approve a subset").
--   3. (deferred) WhatsApp webhook handler parses the owner reply and
--      moves actions to approved/rejected. Today's commit ships
--      everything except the parser — actions can also be approved
--      from the dashboard.
--   4. cron @ each hour · scan agent_action_queue for status=approved
--      AND for_date <= today, dispatch to the per-action executor.

ALTER TABLE agent_action_queue
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS for_date DATE,
  ADD COLUMN IF NOT EXISTS approval_token TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Drop the old constraint (4 statuses) and replace with 6.
ALTER TABLE agent_action_queue
  DROP CONSTRAINT IF EXISTS agent_action_queue_status_check;
ALTER TABLE agent_action_queue
  ADD CONSTRAINT agent_action_queue_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'pending_approval'::text,
    'approved'::text,
    'rejected'::text,
    'blocked'::text,
    'executed'::text
  ]));

-- The planner asks: "what is pending or pending_approval for client X
-- on date Y?" — this index supports both that and the executor scan
-- ("approved AND for_date <= today").
CREATE INDEX IF NOT EXISTS idx_agent_action_queue_planning
  ON agent_action_queue (client_id, for_date, status);

-- Approval-token lookup when the owner WhatsApps back "yes A".
CREATE INDEX IF NOT EXISTS idx_agent_action_queue_token
  ON agent_action_queue (client_id, approval_token)
  WHERE approval_token IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON agent_action_queue TO authenticated;
