# WIA Deployment Checklist

## Pre-deployment

- [ ] Client intake form completed
- [ ] Knowledge base filled with business FAQ (10+ Q&As)
- [ ] WhatsApp Business API account approved
- [ ] WhatsApp Business phone number verified
- [ ] Business description and hours confirmed
- [ ] Calendly link configured (if booking enabled)
- [ ] CRM credentials provided (if CRM integration needed)
- [ ] Escalation contacts defined (phone + email)
- [ ] Preferred language(s) confirmed

## Deployment

- [ ] Client container provisioned (via provision-client.sh)
- [ ] Workflow JSON imported to client n8n
- [ ] Client config injected (template-injector)
- [ ] Anthropic API credentials created in n8n
- [ ] WhatsApp webhook URL registered with Meta
- [ ] WhatsApp webhook verification token configured
- [ ] Redis connection verified
- [ ] Supabase logging endpoint verified

## Testing

- [ ] Send test greeting in English → correct response
- [ ] Send test greeting in Arabic → correct response in Arabic
- [ ] Send product/service question → answered from knowledge base
- [ ] Send booking request → Calendly link provided
- [ ] Send complaint → empathetic response + escalation triggered
- [ ] Ask for human → handoff message + Slack notification sent
- [ ] Verify activity log entry in Supabase
- [ ] Verify conversation memory persists across messages

## Post-deployment

- [ ] Client notified — welcome email sent
- [ ] Client added to Supabase with status='active'
- [ ] Dashboard shows agent as green/active
- [ ] 24-hour monitoring period — check for errors
