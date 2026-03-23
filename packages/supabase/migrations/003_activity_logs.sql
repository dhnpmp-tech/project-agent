-- Activity logs — append-only event stream per client
CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_deployment_id UUID REFERENCES agent_deployments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_client_time ON activity_logs(client_id, created_at DESC);
CREATE INDEX idx_activity_event_type ON activity_logs(event_type);
