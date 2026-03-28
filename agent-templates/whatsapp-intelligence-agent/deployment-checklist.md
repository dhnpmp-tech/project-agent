# WIA Deployment Checklist (Kapso-powered)

## Pre-deployment

- [ ] Client intake form completed
- [ ] Knowledge base filled with business FAQ (10+ Q&As)
- [ ] Kapso account created (kapso.ai — 2-minute setup)
- [ ] WhatsApp number connected via Kapso (sandbox or pre-verified US number)
- [ ] Kapso API key generated (Project Settings > API Keys)
- [ ] Kapso webhook configured (pointing to client n8n instance)
- [ ] Business description and hours confirmed
- [ ] Calendar link configured (if booking enabled)
- [ ] Escalation contacts defined (phone + email)
- [ ] Preferred language(s) confirmed

## Deployment

- [ ] Client container provisioned (via provision-client.sh)
- [ ] Workflow JSON imported to client n8n
- [ ] Client config injected (template-injector)
- [ ] Anthropic API credentials created in n8n
- [ ] Kapso API key stored in n8n credentials
- [ ] Kapso webhook URL registered (whatsapp.message.received event)
- [ ] Kapso webhook signature verification enabled
- [ ] Redis connection verified (conversation memory)
- [ ] Supabase logging endpoint verified
- [ ] Business knowledge base loaded from Supabase

## Testing

- [ ] Send test greeting in English → correct response
- [ ] Send test greeting in Arabic → correct response in Arabic
- [ ] Send product/service question → answered from knowledge base
- [ ] Send booking request → calendar link provided
- [ ] Send complaint → empathetic response + escalation triggered
- [ ] Ask for human → handoff message sent
- [ ] Test voice call (if enabled) → AI voice responds
- [ ] Test media message (image/document) → handled correctly
- [ ] Verify activity log entry in Supabase
- [ ] Verify conversation memory persists across messages
- [ ] Verify Kapso inbox shows conversation history

## Post-deployment

- [ ] Client notified — welcome email sent
- [ ] Client added to Supabase with status='active'
- [ ] Dashboard shows agent as green/active
- [ ] Kapso inbox shared with client team (if applicable)
- [ ] 24-hour monitoring period — check for errors
