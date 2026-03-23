# AI SDR Agent Deployment Checklist

## Pre-deployment
- [ ] ICP criteria defined with client
- [ ] Email sending domain warmed (2 weeks minimum)
- [ ] SendGrid/Instantly account configured
- [ ] Calendly link for sales meeting booking
- [ ] CRM (HubSpot) credentials provided
- [ ] Outreach language preference confirmed (EN/AR/both)

## Deployment
- [ ] Workflow JSON imported to client n8n
- [ ] Anthropic API credentials configured
- [ ] SendGrid credentials configured
- [ ] WhatsApp Business API connected (for WhatsApp outreach)
- [ ] Webhook endpoint registered for inbound leads

## Testing
- [ ] Submit test lead via webhook → scored correctly
- [ ] Hot lead → personalized outreach generated
- [ ] Warm lead → nurture email generated
- [ ] Cold lead → logged, no outreach
- [ ] Activity logged in Supabase
- [ ] CRM record created in HubSpot

## Post-deployment
- [ ] First batch of real leads processed
- [ ] Client reviews outreach quality and approves tone
- [ ] Follow-up sequence activated
