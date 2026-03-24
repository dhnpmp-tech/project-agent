-- Agent deployments — one row per agent instance deployed for a client
CREATE TABLE agent_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL
    CHECK (agent_type IN ('wia', 'ai_sdr', 'cea', 'hrsa', 'fia')),
  workflow_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'deploying', 'active', 'paused', 'error')),
  config JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, agent_type)
);

CREATE INDEX idx_agent_deployments_client ON agent_deployments(client_id);
CREATE INDEX idx_agent_deployments_status ON agent_deployments(status);
