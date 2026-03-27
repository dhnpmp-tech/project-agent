# CLAUDE.md — Project Agent Platform

## What This Is

Multi-tenant AI agent deployment platform for SMBs in UAE and Saudi Arabia.
Businesses get AI agents that handle WhatsApp customer service, sales, content,
HR screening, and financial intelligence — deployed in under two weeks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (dashboard) | Next.js 15 + React 19 + Tailwind CSS 3.4 |
| Frontend (website) | Next.js 15 + Framer Motion + dark theme |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| WhatsApp API | Kapso (kapso.ai) — multi-tenant platform API |
| AI (customer agents) | Claude Sonnet 4.6 (responses) + Claude Haiku 4.5 (classification) |
| AI (owner brain) | MiniMax M2.7 via OpenRouter (15x cheaper, 200K context) |
| AI (memory analysis) | MiniMax M2.7 (post-conversation analysis, ~$0.001/convo) |
| Workflow orchestration | n8n (self-hosted, one container per client) |
| Infrastructure | Docker + Traefik v3 (reverse proxy, auto-SSL) |
| Build | Turbo 2.4 + pnpm 9.15 |
| Package manager | pnpm (use pnpm, not npm) |
| Testing | Vitest 3 |

## Architecture

```
Customer WhatsApp ←→ AI Agent ←→ Owner WhatsApp
  (public number)     (brain)    (private number)
                        ↕
                    Dashboard (Vercel)
                        ↕
                    Supabase (8 tables)
```

Each client gets TWO WhatsApp numbers via Kapso Platform API:
1. Customer-facing: AI handles FAQ, booking, complaints, lead qualification
2. Owner/manager: AI sends notifications, owner updates agent conversationally

### Intelligence Loop
Customer asks unknown question → Agent can't answer → Brain stores it →
Brain asks owner on WhatsApp → Owner answers → Knowledge base updated →
Agent answers next time automatically. Never asks the same question twice.

### Customer Memory (SuperMemory-style)
- Redis: short-term conversation context (24h TTL)
- Supabase customer_memory: long-term profile (preferences, events, sentiment)
- Supabase conversation_summaries: AI-generated conversation index
- Kapso: raw message history (auto-backed up)

## Deployments

| App | URL | Source |
|-----|-----|--------|
| Client Dashboard | https://project-agent-chi.vercel.app | apps/client-dashboard |
| Marketing Website | https://clear-fjord-96p9.here.now | apps/website |
| GitHub | github.com/dhnpmp-tech/project-agent | monorepo root |

## Supabase

- Project: Project Agents (MICRO plan)
- URL: https://sybzqktipimbmujtowoz.supabase.co
- Region: Northeast Asia (Tokyo)

### Tables (8 migrations)
1. clients — tenant accounts
2. agent_deployments — agent instances per client
3. activity_logs — event stream
4. api_keys — client API authentication
5. rls_policies — row level security
6. calendar_configs — encrypted calendar credentials
7. business_knowledge — centralized knowledge base (FAQ, services, social, reviews, industry config)
8. customer_memory + conversation_summaries — long-term customer profiles

## Project Structure

```
project-agent/
├── apps/
│   ├── client-dashboard/     # Next.js 15 — login, onboarding, dashboard, WhatsApp inbox
│   └── website/              # Next.js 15 — marketing site (dark theme, animations)
├── packages/
│   ├── shared-types/         # TypeScript types (Client, Agent, Activity, Knowledge, Memory)
│   ├── provisioning-sdk/     # Docker, n8n, DNS, Kapso Platform SDK
│   ├── calendar-adapter/     # 5-provider calendar connector
│   └── supabase/             # SQL migrations + seed data
├── agent-templates/
│   ├── whatsapp-intelligence-agent/  # + 4 workflow templates (restaurant, real estate, reminders, feedback)
│   ├── ai-sdr-agent/
│   ├── content-engine-agent/
│   ├── hr-screening-agent/
│   ├── financial-intelligence-agent/
│   └── _shared/              # Knowledge base loader, browser research, owner brain, customer memory
├── infrastructure/           # Docker Compose, Traefik, provisioning scripts
├── docs/                     # Architecture + operations guide
└── .claude/skills/gstack/    # 28 dev workflow commands
```

## Onboarding Flow (6 steps)

1. Company Profile (name, contact, country, plan)
2. Scan Website (auto-crawl FAQ, services, social profiles, reviews via LLM)
3. Knowledge Base Review (tabbed: General / Sales & ICP / HR & Culture / Content)
4. Select Agents (5 AI agents)
5. Industry Setup (restaurant/real estate/healthcare/beauty + owner WhatsApp channel)
6. Review & Launch → saves to Supabase

## Kapso Integration

Using Kapso Platform API for multi-tenant WhatsApp:
- KapsoPlatformClient in provisioning-sdk (provisionClient() does customer + setup link + webhook)
- 5 Kapso proxy API routes (/api/kapso/status, setup, conversations, messages, send)
- WhatsApp inbox dashboard page (/dashboard/whatsapp)
- 4 workflow templates using Kapso features (buttons, lists, flows, templates, location, media)

## Coding Conventions

- TypeScript strict mode, ESNext modules
- Tailwind CSS with brand color: brand-600 (blue #2563eb)
- Use pnpm, not npm
- Supabase cookie typing: always type cookiesToSet parameter explicitly
- Run `npx vitest run` in packages/provisioning-sdk for tests
- Build with `npx turbo run build`
- Dashboard pages are server components (async), client components use "use client"

## What's Built vs What Needs Server

### Built (code + deployed):
- All auth UI (login, signup, password reset, sign out)
- 6-step onboarding wizard with website crawler
- Dashboard (agents, reports, WhatsApp inbox, integrations)
- Business knowledge base with centralized storage
- Customer memory system
- Kapso Platform SDK
- Owner Brain agent (system prompt + workflow template)
- 4 industry workflow templates
- 32 unit tests for provisioning-sdk
- Production hardening (security headers, healthchecks, rate limiting)

### Needs n8n server running:
- Owner notification workflow (send WhatsApp to owner on booking/complaint/lead)
- Owner update parser (parse "Add special: Wagyu AED 280" → update knowledge base)
- Webhook routing (Kapso webhook → correct client n8n instance)
- Daily/weekly summary cron
- Auto-provisioning trigger on onboarding completion

## Roadmap (Priority Order)

1. Fix remaining RLS policies for onboarding insert
2. Set up email sending (SendGrid/Resend) for auth confirmations
3. Build admin dashboard (see all clients, manage plans, system health)
4. Wire website booking to real calendar API (NEXT_PUBLIC_API_URL)
5. Deploy n8n server + implement owner brain workflows
6. Add Kapso Platform auto-provisioning on client onboarding
7. Monitoring stack (Prometheus + Grafana)
8. Apollo.io + Perplexity integrations for SDR and Content agents
9. Linq iMessage/RCS channel (future agent type)

## Key Files to Read

- docs/platform-operations-guide.md — full step-by-step operations guide
- docs/architecture.md — system architecture diagram
- agent-templates/_shared/owner-brain-system-prompt.md — the owner brain AI personality
- agent-templates/_shared/owner-brain-workflow.json — owner brain n8n workflow
- packages/provisioning-sdk/src/kapso-platform.ts — Kapso Platform API client
