-- Seed data for development/testing

INSERT INTO clients (slug, company_name, company_name_ar, contact_name, contact_email, contact_phone, country, status, plan)
VALUES
  ('demo-realestate', 'Demo Real Estate LLC', 'ديمو للعقارات', 'Ahmed Al-Mansoori', 'ahmed@demo-re.ae', '+971501234567', 'AE', 'active', 'professional'),
  ('demo-restaurant', 'Demo Restaurant Group', 'مجموعة ديمو للمطاعم', 'Fatima Al-Rashid', 'fatima@demo-resto.ae', '+971509876543', 'AE', 'active', 'starter'),
  ('demo-clinic', 'Demo Medical Center', 'مركز ديمو الطبي', 'Dr. Omar Hassan', 'omar@demo-med.sa', '+966551234567', 'SA', 'provisioning', 'professional');

-- Deploy agents for the active demo clients
INSERT INTO agent_deployments (client_id, agent_type, status, deployed_at)
SELECT id, 'wia', 'active', now()
FROM clients WHERE slug = 'demo-realestate';

INSERT INTO agent_deployments (client_id, agent_type, status, deployed_at)
SELECT id, 'ai_sdr', 'active', now()
FROM clients WHERE slug = 'demo-realestate';

INSERT INTO agent_deployments (client_id, agent_type, status, deployed_at)
SELECT id, 'cea', 'active', now()
FROM clients WHERE slug = 'demo-realestate';

INSERT INTO agent_deployments (client_id, agent_type, status)
SELECT id, 'wia', 'active'
FROM clients WHERE slug = 'demo-restaurant';

-- Sample activity logs
INSERT INTO activity_logs (client_id, agent_deployment_id, event_type, summary, payload)
SELECT c.id, a.id, 'message_received', 'Customer asked about villa pricing in Dubai Marina',
  '{"phone": "+971501111111", "language": "en"}'::jsonb
FROM clients c JOIN agent_deployments a ON a.client_id = c.id
WHERE c.slug = 'demo-realestate' AND a.agent_type = 'wia';
