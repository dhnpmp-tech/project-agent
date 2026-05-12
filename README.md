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
              ┌────────────────────────────┐
              │  Postgres 17 + pgvector    │
              │  (21 tables, VPS, isolated)│
              │  app-layer client_id scope │
              └────────────────────────────┘
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
- **Multi-Tenant at Scale** — One platform, hundreds of clients. Data isolation enforced at the query layer via `session.clientId` (every `server-queries.ts` helper auto-filters). Cost per conversation: ~$0.001.

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
| Database | Self-hosted PostgreSQL 17 + pgvector on VPS (`/opt/agents-platform`, isolated Docker, 21 tables) |
| Auth | Custom Resend OTP service + HS256 JWT (jose) at `auth.agents.dcp.sa` |
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
│   └── supabase/             # Historical SQL migrations (001-013) — adapted copies live in infrastructure/agents-platform/migrations/out/
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
# Database + Auth (self-hosted)
DATABASE_URL=                 # postgres://agents_app:...@76.13.179.86:5432/agents?sslmode=require
AUTH_API_URL=                 # https://auth.agents.dcp.sa
JWT_SECRET=                   # HS256 secret shared with auth service
RESEND_API_KEY=               # Used by auth service for OTP delivery

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

21 tables across two migration folders. See spec §19 for the full reconciliation. Production runs the adapted copies in `infrastructure/agents-platform/migrations/out/`.

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

Tenant scoping is now enforced in application code via `getServerSession().clientId` (see `apps/client-dashboard/src/lib/server-queries.ts`). JWT shape preserves the legacy contract: `user_metadata.client_id` survives in the JWT payload so downstream Python services (`asyncpg` via `supa.py`) read it the same way they used to read `auth.jwt()`.

## Infrastructure

| Service | Location | URL |
|---------|----------|-----|
| Marketing site | Vercel (`marketing-website`) | agents.dcp.sa |
| Client dashboard | Vercel (`project-agent`, basePath `/app`) | agents.dcp.sa/app |
| Prompt-builder API + n8n + Mem0 + Graphiti | Hostinger VPS (76.13.179.86) | n8n.dcp.sa |
| Auth service (Resend OTP + JWT) | Hostinger VPS (76.13.179.86:8201) | auth.agents.dcp.sa |
| Database | Hostinger VPS (Postgres 17 + pgvector, `/opt/agents-platform`) | 76.13.179.86:5432 |

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
