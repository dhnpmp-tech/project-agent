# DCP AI Agent Platform

Multi-tenant AI agent platform for SMBs in the UAE and Saudi Arabia. Businesses get autonomous AI employees — WhatsApp customer service, sales, content, HR, and finance — with persistent customer memory, an Owner Brain that reports via WhatsApp, and self-service onboarding.

**Live demo:** [Customer Chat](https://agents.dcp.sa/demo/saffron) | [Owner Brain](https://agents.dcp.sa/demo/saffron/owner)
**Dashboard:** [agents.dcp.sa](https://agents.dcp.sa)
**Website:** [clear-fjord-96p9.here.now](https://clear-fjord-96p9.here.now)

---

## How It Works

```
Customer WhatsApp  ──→  AI Agent  ──→  Owner WhatsApp
  (public number)       (brain)       (private number)
                          ↕
              ┌───────────────────────┐
              │   Supabase (8 tables) │
              │   RLS tenant isolation│
              └───────────────────────┘
                          ↕
              ┌───────────────────────┐
              │    Client Dashboard   │
              │    (agents.dcp.sa)    │
              └───────────────────────┘
```

Each client gets **two WhatsApp channels**:
1. **Customer-facing** — AI handles FAQ, bookings, complaints, lead qualification in Arabic + English, 24/7
2. **Owner private** — AI sends booking alerts, daily summaries, hot lead notifications. Owner texts back commands like *"Add today's special: Wagyu AED 280"* and the knowledge base updates instantly

## Key Features

- **Persistent Customer Memory** — AI remembers every customer across months. Preferences, history, sentiment, key events. A returning customer in December gets greeted like a regular, not a stranger.
- **Owner Brain (AI Chief of Staff)** — Proactive daily briefs, complaint escalations, revenue reports — all via WhatsApp. Owner manages the business by texting.
- **Self-Service Onboarding** — 6-step wizard: company profile → website crawl → knowledge base → select agents → industry setup → launch. Live in minutes.
- **Industry-Specific** — Pre-built for restaurants (SevenRooms, menus), real estate (listings, viewings), healthcare (appointments, calendar sync).
- **Web-Enriched AI** — Firecrawl integration for live context. Customer asks about weather? AI knows it's 28°C and suggests the outdoor terrace.
- **Multi-Tenant at Scale** — One platform account, hundreds of clients. Full data isolation via Supabase RLS.

## 5 AI Agents

| Agent | What It Does |
|-------|-------------|
| **WhatsApp Intelligence** | Customer FAQ, booking, complaints, lead qualification — bilingual, 24/7 |
| **AI Sales Rep** | Lead scoring, personalized outreach, pipeline management, meeting booking |
| **Content Engine** | Social media across LinkedIn, Instagram, TikTok — bilingual, scheduled |
| **HR Screening** | CV parsing, candidate scoring, interview scheduling, calendar sync |
| **Financial Intelligence** | Transaction categorization, anomaly detection, weekly reports |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Dashboard | Next.js 15 + React 19 + Tailwind CSS |
| Website | Next.js 15 + Framer Motion |
| Database | Supabase (PostgreSQL 17 + Auth + RLS) |
| WhatsApp | Kapso Platform API (multi-tenant) |
| AI | MiniMax M2.5 (230B params MoE) |
| Web Search | Firecrawl API |
| Workflows | n8n (self-hosted) |
| Email | Resend (6 templates) |
| Calendar | Google, Outlook, CalDAV, SevenRooms |
| Infra | Docker + Nginx + Let's Encrypt |
| Hosting | Vercel (dashboard) + HereNow (website) |
| Build | Turborepo + pnpm |

## Project Structure

```
project-agent/
├── apps/
│   ├── client-dashboard/     # Next.js — auth, onboarding, dashboard, demo chat
│   └── website/              # Next.js — marketing site (dark theme)
├── packages/
│   ├── shared-types/         # TypeScript types
│   ├── provisioning-sdk/     # Kapso, Docker, n8n, DNS automation
│   ├── calendar-adapter/     # 5-provider calendar connector
│   └── supabase/             # 9 SQL migrations
├── agent-templates/          # n8n workflow templates (5 agents + shared)
├── infrastructure/           # Docker Compose, provisioning scripts
└── docs/                     # Architecture, operations, cost overview
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dashboard dev server
pnpm --filter @project-agent/client-dashboard dev

# Start website dev server
pnpm --filter @project-agent/website dev
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
MINIMAX_API_KEY=              # MiniMax M2.5 for agent responses
FIRECRAWL_API_KEY=            # Web search for live context

# WhatsApp
KAPSO_PLATFORM_API_KEY=       # Multi-tenant WhatsApp provisioning

# Email
RESEND_API_KEY=               # Transactional emails from agents@dcp.sa

# Calendar (optional)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

## Database

9 migrations in `packages/supabase/migrations/`:

| Table | Purpose |
|-------|---------|
| `clients` | Tenant accounts with plan, status, metadata |
| `agent_deployments` | Agent instances per client with config + metrics |
| `business_knowledge` | Centralized KB — FAQ, services, social, industry config |
| `customer_memory` | Long-term customer profiles with preferences + events |
| `conversation_summaries` | AI-generated conversation index |
| `activity_logs` | Event stream for dashboard + analytics |
| `api_keys` | Client API authentication |
| `calendar_configs` | Encrypted calendar credentials |

All tables use JWT-based RLS: `auth.jwt() -> 'user_metadata' ->> 'client_id'`

## Infrastructure

| Service | Location | URL |
|---------|----------|-----|
| Dashboard | Vercel | agents.dcp.sa |
| Website | HereNow | clear-fjord-96p9.here.now |
| n8n + Postgres + Redis | Hostinger VPS | n8n.dcp.sa |
| Database | Supabase (Tokyo) | sybzqktipimbmujtowoz.supabase.co |

## Economics

| | Cost | Revenue |
|--|------|---------|
| **Per conversation** | ~$0.001 (MiniMax) | — |
| **10 clients** | ~$30/month | AED 15,000/month ($4,100) |
| **Margin** | — | **98%** |

## Documentation

- [Technical Documentation](docs/technical-documentation.md) — Complete system reference
- [Platform Operations Guide](docs/platform-operations-guide.md) — How to onboard clients
- [Cost Overview](docs/cost-overview.md) — Infrastructure and scaling costs
- [Architecture](docs/architecture.md) — System diagrams

## License

Proprietary. All rights reserved.
