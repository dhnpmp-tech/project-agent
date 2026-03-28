# Project Agent — Cost Overview
**Date:** March 28, 2026
**Prepared for:** Tareq & Team

---

## Monthly Infrastructure Costs

| Service | Plan | Monthly Cost | What It Does |
|---------|------|-------------|--------------|
| **Supabase** | Micro (free) | $0 | Database, auth, RLS — 8 tables, handles all client data |
| **Vercel** | Free (Hobby) | $0 | Hosts the client dashboard (Next.js) — auto-deploys from GitHub |
| **HereNow** | Free (authenticated) | $0 | Hosts the marketing website — permanent, no expiry |
| **Hostinger VPS** | Shared with DCP | ~$0* | 8 cores, 32GB RAM, 387GB disk — runs n8n + Redis + Postgres |
| **Resend** | Free tier | $0 | 3,000 emails/month — onboarding, alerts, receipts |
| **Kapso** | Free tier | $0** | WhatsApp Business API — multi-tenant, 1 platform account |
| **GitHub** | Free | $0 | Code repository (private) |
| **Domain (dcp.sa)** | Shared with DCP | ~$0* | DNS on Vercel, subdomains: agents.dcp.sa, n8n.dcp.sa |

**Current monthly total: ~$0/month** (all free tiers + shared VPS)

*\* VPS and domain costs are shared with the DCP compute platform project*
*\*\* Kapso pricing depends on WhatsApp message volume per client — free to start*

---

## AI Model Costs (Per Conversation)

| Model | Used For | Cost Per Conversation |
|-------|----------|----------------------|
| **MiniMax M2.7** | Customer WhatsApp responses + Owner Brain | ~$0.001 (~0.1 cents) |
| **MiniMax M2.7** | Post-conversation memory analysis | ~$0.001 |

**At 1,000 conversations/month per client: ~$2/month in AI costs**
**At 10 clients × 1,000 convos each: ~$20/month total AI costs**

---

## Revenue Model (What Clients Pay Us)

| Plan | Monthly | Setup Fee | Agents |
|------|---------|-----------|--------|
| Starter | AED 1,500 (~$410) | AED 2,999 | 1 agent |
| Professional | AED 8,000 (~$2,180) | AED 15,000 | 3-5 agents |
| Enterprise | AED 30,000+ (~$8,170+) | Custom | Unlimited |

**Break-even: 1 Starter client covers all infrastructure costs**

---

## What's Been Built (Development Investment)

### Platform (Code)
- Client dashboard with auth, onboarding, agent management
- 6-step self-service onboarding wizard with auto website crawler
- Marketing website (dark theme, 5 pages, responsive)
- 8 Supabase database migrations with full RLS tenant isolation
- Kapso Platform SDK for multi-tenant WhatsApp provisioning
- Calendar adapter (Google, Outlook, CalDAV, SevenRooms)
- Email system (6 transactional email templates via Resend)
- Auto-provisioning trigger (onboarding → deploy → email → WhatsApp)

### AI Agent System (n8n Workflows)
- WhatsApp Intelligence Agent (20 nodes — receives messages, fetches knowledge + customer memory, generates AI response, logs activity)
- Owner Brain Agent (8 nodes — daily briefs, owner commands, knowledge base updates via WhatsApp)
- Both workflows active on n8n.dcp.sa with MiniMax AI

### Infrastructure
- n8n + PostgreSQL + Redis running on Hostinger VPS
- Nginx reverse proxy with auto-renewing SSL for n8n.dcp.sa
- Vercel deployment with CI/CD from GitHub
- Supabase with 8 tables, RLS policies, persistent customer memory

---

## Scaling Costs (When We Grow)

| Milestone | What Changes | Added Cost |
|-----------|-------------|------------|
| **5 clients** | Nothing — free tiers handle it | $0 |
| **10 clients** | MiniMax AI usage increases | ~$20/month AI |
| **25 clients** | Supabase Pro upgrade needed | +$25/month |
| **50 clients** | Vercel Pro for more bandwidth | +$20/month |
| **100 clients** | Dedicated VPS for n8n | +$40/month |
| **500+ clients** | Run models on DCP GPUs | Cost drops to near-zero |

**Key insight: At 10 clients on Starter plan, revenue is AED 15,000/month ($4,100) with costs under $50/month. That's 98% margin.**

---

## What Still Needs Investment

| Item | Cost | Priority |
|------|------|----------|
| Resend Pro (if 2nd domain needed) | $20/month | Low — can use dcp.sa free |
| Stripe/payment integration | $0 (code only, Stripe fees are per-transaction) | High — needed for billing |
| First real client acquisition | $0 (outreach) | Critical |

---

*All infrastructure runs on free tiers. The only costs are AI model usage (~$0.001/conversation) and the shared VPS. Revenue from a single Starter client ($410/month) covers projected costs for the first 50 clients.*
