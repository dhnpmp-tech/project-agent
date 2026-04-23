# DCP AI Agent Platform

Multi-tenant AI agent platform for SMBs in the UAE and Saudi Arabia. Businesses get autonomous AI employees — WhatsApp customer service, sales, content, HR, and finance — with persistent customer memory, an Owner Brain that reports via WhatsApp, and self-service onboarding.

**Marketing site:** [agents.dcp.sa](https://agents.dcp.sa)
**Client dashboard:** [agents.dcp.sa/app](https://agents.dcp.sa/app)
**Live demo:** [Customer Chat](https://agents.dcp.sa/demo/saffron) | [Owner Brain](https://agents.dcp.sa/demo/saffron/owner)

---

## How It Works

```
Customer WhatsApp  ──→  AI Persona  ──→  Owner WhatsApp
  (public number)     (with memory)     (private number)
                          ↕
              ┌───────────────────────┐
              │   Prompt-Builder API  │
              │   (tool execution)    │
              └───────────────────────┘
                    ↕           ↕
     ┌──────────────┐   ┌──────────────┐
     │  Mem0 Memory  │   │  Composio    │
     │  (40+ facts)  │   │  (500+ tools)│
     └──────────────┘   └──────────────┘
                    ↕
              ┌───────────────────────┐
              │   Supabase (21 tables)│
              │   RLS tenant isolation│
              └───────────────────────┘
                    ↕           ↕
     ┌──────────────┐   ┌──────────────┐
     │   Dashboard   │   │    Admin     │
     │ agents.dcp.sa │   │  /admin      │
     └──────────────┘   └──────────────┘
```

Each client gets **two WhatsApp channels**:
1. **Customer-facing** — AI handles FAQ, bookings, complaints, lead qualification in Arabic + English, 24/7
2. **Owner private** — AI sends booking alerts, daily summaries, hot lead notifications. Owner texts back commands like *"Add today's special: Wagyu AED 280"* and the knowledge base updates instantly

## Key Features

- **AI Persona System** — Each business gets a generated AI employee with a full backstory, personality, and voice. She never breaks character. Texts like a real person — short messages, natural timing.
- **Persistent Customer Memory (Mem0)** — 40+ facts stored per customer. Names, preferences, family, order history, sentiment. A returning customer in December gets greeted by name with preferences from January.
- **Multi-Message WhatsApp** — AI sends 2-3 short messages like a real person texting, not a wall of text. Natural 1.5s delays between messages.
- **Tool Execution (Composio + Custom)** — AI can book tables (SevenRooms), create payments (Stripe, Tabby, Tamara), update calendars (Google), manage CRM (HubSpot, Zoho). 500+ integrations via Composio + custom REST clients.
- **Owner Brain (AI Chief of Staff)** — Daily briefs, complaint escalations, revenue reports — all via WhatsApp. Owner texts back commands to update menus, prices, availability.
- **Admin Dashboard** — Client management, persona stories, interactive memory graph visualization, system health monitoring at /admin.
- **Multi-Tenant at Scale** — One platform, hundreds of clients. Full data isolation via Supabase RLS. Cost per conversation: ~$0.001.

## AI Agents

| Agent | What It Does |
|-------|-------------|
| **WhatsApp Intelligence** | Customer FAQ, booking, complaints, lead qualification — bilingual, 24/7 |
| **Owner Brain** | Daily briefs, alerts, owner-driven knowledge updates via WhatsApp |
| **AI Sales Rep** | Lead scoring, personalized outreach, pipeline management, meeting booking |
| **Content Engine** | Social media across LinkedIn, Instagram, TikTok — bilingual, scheduled |
| **Loyalty Engine** | Points, tiers, referrals — bundled with Growth tier+ |
| **Google Business Profile** | Review monitoring + auto-response, Q&A, posts, local SEO |
| **Market Intelligence** | Social listening across 13+ platforms (Pro tier+) |
| **HR Screening** | CV parsing, candidate scoring, interview scheduling, calendar sync |
| **Financial Intelligence** | Transaction categorization, anomaly detection, weekly reports |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Dashboard | Next.js 15 + React 19 + Tailwind CSS |
| Website | Next.js 15 + Framer Motion |
| Database | Supabase (PostgreSQL 17 + Auth + RLS + pgvector) — 21 tables |
| WhatsApp | Kapso Platform API (multi-tenant) |
| AI (customer-facing) | MiniMax M2.7 (230B params MoE) |
| AI (internal agents) | OpenRouter free models (Qwen, Nemotron) |
| AI (embeddings) | Ollama nomic-embed-text (self-hosted, free) |
| Customer Memory | Mem0 (self-hosted, Neo4j + pgvector) |
| Knowledge Graph | Graphiti (self-hosted, Neo4j) |
| Tool Execution | Composio (500+ integrations) + custom REST |
| Integrations | SevenRooms, HubSpot, Stripe, Tabby, Tamara, Google Suite, Zoho |
| Workflows | n8n (self-hosted) + prompt-builder API |
| Email | Resend |
| Infra | Docker + Nginx + Let's Encrypt |
| Hosting | Vercel (dashboard) + HereNow (website) + Hostinger VPS |
| Build | Turborepo + pnpm |

## Project Structure

```
project-agent/
├── apps/
│   ├── client-dashboard/     # Next.js — auth, onboarding, dashboard, admin panel, demo chat
│   └── website/              # Next.js — marketing site (dark theme) + integrations docs
├── packages/
│   ├── shared-types/         # TypeScript types
│   ├── provisioning-sdk/     # Kapso, Docker, n8n, DNS automation
│   ├── calendar-adapter/     # 5-provider calendar connector
│   └── supabase/             # SQL migrations (009 core + 010-013 in backend/prompt-builder/migrations)
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
MINIMAX_API_KEY=              # MiniMax M2.7 for customer-facing agents
FIRECRAWL_API_KEY=            # Web search for live context
COMPOSIO_API_KEY=             # Tool execution (500+ integrations)

# Memory
MEM0_URL=                     # Mem0 API (e.g. http://76.13.179.86:8888)
MEM0_API_KEY=                 # Mem0 admin key

# WhatsApp
KAPSO_PLATFORM_API_KEY=       # Multi-tenant WhatsApp provisioning

# Email
RESEND_API_KEY=               # Transactional emails

# Admin
ADMIN_EMAILS=                 # Comma-separated admin emails for /admin access

# Calendar (optional)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

## Database

21 tables across two migration folders. See spec §19 for the full reconciliation.

**Core (`packages/supabase/migrations/` 001-009):**

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
| `booking_state` | Per-conversation booking flow state |

**Vault + coordination (`backend/prompt-builder/migrations/` 010-012):**
`vault_notes` (8 categories + pgvector embeddings), `vault_categories`,
`composio_connections`, `composio_tool_whitelist`, `karpathy_rules`,
`gepa_runs`, `owner_actions`, `owner_briefings`, `agent_health`.

**Rami CEO chat (`backend/prompt-builder/migrations/` 011):**
`ceo_chat_sessions`, `ceo_chat_messages`, `ceo_chat_rate_limit`.

All tables use JWT-based RLS: `auth.jwt() -> 'user_metadata' ->> 'client_id'`

## Infrastructure

| Service | Location | URL |
|---------|----------|-----|
| Marketing site | Vercel (`marketing-website`) | agents.dcp.sa |
| Client dashboard | Vercel (`project-agent`, basePath `/app`) | agents.dcp.sa/app |
| Prompt-builder API + n8n + Mem0 + Graphiti | Hostinger VPS (76.13.179.86) | n8n.dcp.sa |
| Database | Supabase (Tokyo) | sybzqktipimbmujtowoz.supabase.co |

## Economics

Pricing (canonical, see spec §1):

| Tier | Monthly | Setup |
|------|---------|-------|
| Starter | AED 1,500 | AED 3,000 |
| Growth (most popular) | AED 3,000 | AED 3,000 |
| Pro | AED 5,000 | AED 3,000 |
| Enterprise | AED 8,000 | AED 3,000 |

Per-conversation cost ~$0.001 (MiniMax). At 10 Growth-tier clients
(AED 30,000/month ≈ $8,200) infra runs ~$200/month — gross margin ~97%.

## Documentation

- [Technical Documentation](docs/technical-documentation.md) — Complete system reference
- [Platform Operations Guide](docs/platform-operations-guide.md) — How to onboard clients
- [Cost Overview](docs/cost-overview.md) — Infrastructure and scaling costs
- [Architecture](docs/architecture.md) — System diagrams

## License

Proprietary. All rights reserved.
