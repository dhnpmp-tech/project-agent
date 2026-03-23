-- Row Level Security — tenant isolation
-- All tables are isolated by client_id. The service role bypasses RLS.

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Clients: a user can only see their own client record
-- The app sets auth.uid() to the Supabase Auth user, linked to client_id via user metadata
CREATE POLICY clients_select ON clients
  FOR SELECT USING (
    id = (
      SELECT (raw_user_meta_data->>'client_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Agent deployments: isolated by client_id
CREATE POLICY agent_deployments_select ON agent_deployments
  FOR SELECT USING (
    client_id = (
      SELECT (raw_user_meta_data->>'client_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Activity logs: isolated by client_id
CREATE POLICY activity_logs_select ON activity_logs
  FOR SELECT USING (
    client_id = (
      SELECT (raw_user_meta_data->>'client_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- API keys: isolated by client_id
CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (
    client_id = (
      SELECT (raw_user_meta_data->>'client_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Service role (used by provisioning system and n8n) bypasses all RLS by default.
-- No explicit policy needed — Supabase service_role key skips RLS.
