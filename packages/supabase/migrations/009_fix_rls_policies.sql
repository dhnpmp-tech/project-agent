-- =============================================================================
-- 009: Fix RLS policies — use auth.jwt() instead of auth.users
-- =============================================================================
-- The original policies queried auth.users which the authenticated role
-- cannot access. Use auth.jwt() -> 'user_metadata' ->> 'client_id' instead,
-- which reads directly from the JWT token.
--
-- Onboarding sets client_id in user metadata via supabase.auth.updateUser()
-- after creating the client record.
-- =============================================================================

-- Drop all broken policies that reference auth.users or use wrong comparisons
DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS agent_deployments_select ON agent_deployments;
DROP POLICY IF EXISTS activity_logs_select ON activity_logs;
DROP POLICY IF EXISTS api_keys_select ON api_keys;
DROP POLICY IF EXISTS business_knowledge_select ON business_knowledge;
DROP POLICY IF EXISTS business_knowledge_update ON business_knowledge;
DROP POLICY IF EXISTS business_knowledge_insert ON business_knowledge;
DROP POLICY IF EXISTS calendar_configs_select ON calendar_configs;
DROP POLICY IF EXISTS calendar_configs_insert ON calendar_configs;
DROP POLICY IF EXISTS calendar_configs_update ON calendar_configs;
DROP POLICY IF EXISTS calendar_configs_delete ON calendar_configs;
DROP POLICY IF EXISTS customer_memory_select ON customer_memory;
DROP POLICY IF EXISTS customer_memory_insert ON customer_memory;
DROP POLICY IF EXISTS customer_memory_update ON customer_memory;
DROP POLICY IF EXISTS convo_summaries_select ON conversation_summaries;

-- CLIENTS
CREATE POLICY clients_select_v2 ON clients
  FOR SELECT USING (
    id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY clients_update ON clients
  FOR UPDATE USING (
    id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

-- AGENT DEPLOYMENTS
CREATE POLICY agent_deployments_select_v2 ON agent_deployments
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY agent_deployments_update ON agent_deployments
  FOR UPDATE USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

-- ACTIVITY LOGS
CREATE POLICY activity_logs_select_v2 ON activity_logs
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY activity_logs_insert ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- API KEYS
CREATE POLICY api_keys_select_v2 ON api_keys
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

-- BUSINESS KNOWLEDGE
CREATE POLICY business_knowledge_select_v2 ON business_knowledge
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY business_knowledge_update_v2 ON business_knowledge
  FOR UPDATE USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

-- CALENDAR CONFIGS
CREATE POLICY calendar_configs_select_v2 ON calendar_configs
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY calendar_configs_insert_v2 ON calendar_configs
  FOR INSERT WITH CHECK (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY calendar_configs_update_v2 ON calendar_configs
  FOR UPDATE USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY calendar_configs_delete_v2 ON calendar_configs
  FOR DELETE USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

-- CUSTOMER MEMORY
CREATE POLICY customer_memory_select_v2 ON customer_memory
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY customer_memory_insert_v2 ON customer_memory
  FOR INSERT WITH CHECK (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

CREATE POLICY customer_memory_update_v2 ON customer_memory
  FOR UPDATE USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );

-- CONVERSATION SUMMARIES
CREATE POLICY convo_summaries_select_v2 ON conversation_summaries
  FOR SELECT USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );
