# DCP AI Agent Platform — Technical Documentation

**Version:** 1.4 (synced)
**Last Updated:** April 26, 2026
**Repository:** https://github.com/dhnpmp-tech/project-agent
**Canonical spec:** `docs/2026-04-05-project-agent-technical-spec.md` (v1.4) — refer there for the authoritative architecture; this doc is an operator-friendly overview.

---

## 1. What This Is

A multi-tenant AI agent deployment platform that gives SMBs in the UAE and Saudi Arabia autonomous AI employees. Each client gets AI agents that handle WhatsApp customer service, sales outreach, content creation, HR screening, and financial intelligence — with persistent customer memory, an Owner Brain that reports to the business owner via WhatsApp, and self-service onboarding that goes live in minutes.

The platform is designed for scale: one platform account manages hundreds of clients, each with their own isolated data, AI agents, and WhatsApp numbers.

---

## 2. Architecture

### 2.1 System Overview

```
                    ┌─────────────────────────────────┐
                    │         End Customers            │
                    │       (WhatsApp / Web)           │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │        Kapso Platform            │
                    │   (Multi-tenant WhatsApp API)    │
                    │                                  │
                    │  Per client: customer # + owner #│
                    └──────────────┬──────────────────┘
                                   │ webhooks
                    ┌──────────────▼──────────────────┐
                    │  Hostinger VPS (Docker+Traefik)  │
                    │                                  │
                    │  ┌─────────────────────────────┐ │
                    │  │ FastAPI prompt-builder      │ │
                    │  │ • Assembles per-tenant      │ │
                    │  │   prompt on each turn       │ │
                    │  │ • Routes to Claude Sonnet   │ │
                    │  │   4.6 (responses) /         │ │
                    │  │   Haiku 4.5 (classify)      │ │
                    │  │ • Reads vault_notes via     │ │
                    │  │   pgvector                  │ │
                    │  └─────────────────────────────┘ │
                    │                                  │
                    │  ┌─────────────────────────────┐ │
                    │  │ n8n (owner-brain only)      │ │
                    │  │ • Owner WhatsApp inbox      │ │
                    │  │ • Daily briefs (9AM)        │ │
                    │  │ • Karpathy/GEPA crons       │ │
                    │  │ • MiniMax M2.7              │ │
                    │  └─────────────────────────────┘ │
                    │                                  │
                    │  Mem0 + Graphiti (memory layer)  │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │         Supabase                 │
                    │  (PostgreSQL 17 + Auth + RLS +   │
                    │   pgvector) — 21 tables          │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  Vercel — Next.js apps           │
                    │  • agents.dcp.sa (marketing)     │
                    │  • agents.dcp.sa/app (dashboard) │
                    │                                  │
                    │  Composio (per-agent OAuth vault)│
                    └──────────────────────────────────┘
```

### 2.2 Dual WhatsApp Channel Architecture

Every client gets two communication channels:

```
Customer WhatsApp ←→ AI Agent (brain) ←→ Owner WhatsApp
  (public number)                        (private number)
                         ↕
                     Dashboard
                     (web UI)
```

**Customer-Facing Channel:**
- Public number shared with customers
- AI handles FAQ, booking, complaints, lead qualification
- Bilingual: Arabic + English (auto-detected)
- 24/7 autonomous operation
- Persistent customer memory across months/years

**Owner/Manager Channel (Owner Brain):**
- Private number for the business owner
- AI sends: booking notifications, complaint alerts, hot lead alerts, daily summaries
- Owner sends natural language commands: "Add today's special: Wagyu Steak AED 280"
- AI interprets intent and updates business knowledge base

### 2.3 Intelligence Loop

```
Customer asks unknown question
    → Agent can't answer from knowledge base
    → Brain stores the gap
    → Brain asks owner on WhatsApp: "A customer asked about X. What should I say?"
    → Owner answers naturally
    → Knowledge base updated
    → Agent answers next time automatically
    → Never asks the same question twice
```

### 2.4 Customer Memory System (SuperMemory-style)

| Layer | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| Short-term context | Redis | 24h | Current conversation state |
| Long-term profile | Supabase `customer_memory` | Permanent | Name, preferences, sentiment, key events |
| Conversation index | Supabase `conversation_summaries` | Permanent | AI-generated summaries for retrieval |
| Raw messages | Kapso | Permanent | Full message history (auto-backed up) |

A customer who texted in January is greeted by name in December with their preferences, past orders, and history recalled automatically.

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend (Dashboard)** | Next.js 15 + React 19 + Tailwind CSS 3.4 | Client portal, onboarding, agent management |
| **Frontend (Website)** | Next.js 15 + Framer Motion | Marketing site, dark theme, Ask Rami widget |
| **Database** | Supabase (PostgreSQL 17 + Auth + RLS + pgvector) | Multi-tenant data with row-level security |
| **WhatsApp API** | Kapso Platform API | Multi-tenant WhatsApp, one account for all clients |
| **AI (Customer agents)** | Claude Sonnet 4.6 (responses) + Claude Haiku 4.5 (classify) | Per-turn customer replies + intent/sentiment |
| **AI (Owner brain + Rami)** | MiniMax M2.7 (230B MoE) | Owner WhatsApp brain + Rami CEO chat widget |
| **AI (Memory analysis)** | MiniMax M2.7 | Post-conversation summarization (~$0.001/convo) |
| **Vector embeddings** | OpenAI text-embedding-3-small (1536-dim) | `vault_notes` semantic retrieval |
| **Memory layer** | Mem0 + Graphiti (Zep) on VPS | Long-term entity & temporal memory |
| **Backend (FastAPI)** | prompt-builder service on VPS | Replaced n8n Code nodes for prompt assembly |
| **Workflow orchestration** | n8n (self-hosted) | Owner brain workflows only (not per-client) |
| **Tool integrations** | Composio | Per-agent OAuth vault, scope-minimized |
| **Email** | Resend | Transactional emails (6 templates) |
| **Payments** | Stripe (planned) | Subscription billing |
| **Calendar** | Google, Outlook, CalDAV, SevenRooms, iCal | Booking and appointment management |
| **Infrastructure** | Docker + Traefik v3 + Let's Encrypt | VPS deployment with auto-SSL |
| **Hosting (Dashboard + Website)** | Vercel (cross-project rewrite at agents.dcp.sa) | Auto-deploy from GitHub |
| **Build System** | Turbo 2.4 + pnpm 9.15 | Monorepo management |
| **Testing** | Vitest 3 + pytest | Unit tests (TS) + integration tests (FastAPI) |

---

## 4. Project Structure

```
project-agent/
├── apps/
│   ├── client-dashboard/          # Next.js 15 — the main product
│   │   ├── src/app/
│   │   │   ├── (root)/page.tsx    # Smart router: → /onboarding or /dashboard
│   │   │   ├── login/             # Dark-themed login page
│   │   │   ├── signup/            # Dark-themed signup with autoconfirm
│   │   │   ├── onboarding/        # 6-step wizard
│   │   │   ├── dashboard/         # Agent status, activity, reports
│   │   │   │   ├── page.tsx       # Main dashboard
│   │   │   │   ├── reports/       # Analytics & metrics
│   │   │   │   ├── whatsapp/      # WhatsApp inbox
│   │   │   │   ├── integrations/  # Calendar & tool connections
│   │   │   │   ├── agents/[id]/   # Individual agent detail
│   │   │   │   ├── activity/      # Full activity log
│   │   │   │   └── support/       # Request a change form
│   │   │   ├── demo/saffron/      # Live demo: customer chat
│   │   │   │   └── owner/         # Live demo: owner brain chat
│   │   │   ├── api/
│   │   │   │   ├── auth/          # Google OAuth, signout
│   │   │   │   ├── demo/chat/     # Demo AI chat endpoint (MiniMax + Firecrawl)
│   │   │   │   ├── email/send/    # Resend email trigger
│   │   │   │   ├── provisioning/  # Auto-provisioning trigger + complete
│   │   │   │   ├── crawl/         # Website crawler for onboarding
│   │   │   │   ├── kapso/         # WhatsApp proxy routes (5 endpoints)
│   │   │   │   ├── calendar-configs/ # Calendar CRUD
│   │   │   │   ├── public/        # Public booking API (availability, book)
│   │   │   │   └── webhooks/      # n8n webhook receiver
│   │   │   └── auth/callback/     # Supabase auth callback
│   │   ├── src/lib/
│   │   │   ├── supabase-client.ts # Browser Supabase client
│   │   │   ├── supabase-server.ts # Server Supabase client (cookie-based)
│   │   │   ├── supabase-admin.ts  # Admin client (service role, bypasses RLS)
│   │   │   └── email.ts           # Resend email templates (6 types)
│   │   └── src/components/        # React components
│   │
│   └── website/                   # Next.js 15 — marketing site
│       └── src/app/
│           ├── page.tsx           # Landing page (hero, agents, pricing, CTA)
│           ├── services/          # 7 agent descriptions
│           ├── process/           # 5-step onboarding process
│           ├── case-study/        # Dubai real estate agency story
│           └── book-audit/        # Booking page with calendar
│
├── packages/
│   ├── shared-types/              # TypeScript types
│   │   └── src/
│   │       ├── client.ts          # Client, Plan, Status types
│   │       ├── agent.ts           # AgentType, AgentDeployment, Metrics
│   │       ├── activity.ts        # ActivityLog, EventType
│   │       ├── knowledge.ts       # BusinessKnowledge, FAQ, CrawlData
│   │       ├── memory.ts          # CustomerMemory, ConversationSummary
│   │       └── calendar.ts        # CalendarProvider, BookingRequest
│   │
│   ├── provisioning-sdk/          # Client provisioning automation
│   │   └── src/
│   │       ├── kapso-platform.ts  # KapsoPlatformClient (multi-tenant WhatsApp)
│   │       ├── docker-manager.ts  # Docker container management per client
│   │       ├── n8n-api-client.ts  # n8n workflow import/activation
│   │       ├── dns-manager.ts     # Cloudflare DNS record management
│   │       └── template-injector.ts # Inject client config into workflow templates
│   │
│   ├── calendar-adapter/          # Universal calendar connector
│   │   └── src/
│   │       ├── factory.ts         # createCalendarAdapter() factory
│   │       ├── google.ts          # Google Calendar provider
│   │       ├── outlook.ts         # Microsoft Outlook provider
│   │       ├── caldav.ts          # CalDAV (Proton, Apple, Fastmail)
│   │       ├── ical.ts            # iCal feed (read-only)
│   │       ├── sevenrooms.ts      # SevenRooms restaurant bookings
│   │       └── types.ts           # Shared calendar types
│   │
│   └── supabase/                  # Database layer (core migrations)
│       ├── migrations/            # 001-009 (clients, agents, RLS, knowledge, memory, booking)
│       └── seed.sql
│
├── backend/
│   └── prompt-builder/            # FastAPI service on VPS
│       ├── migrations/            # 010-013 (vault, Composio, Karpathy, GEPA, Rami chat)
│       ├── ceo_persona.py         # Rami CEO chat persona
│       ├── ceo_chat_engine.py     # SSE chat engine
│       └── conftest.py            # pytest env bootstrap
│
├── agent-templates/               # n8n workflow templates (owner brain only)
│   ├── _shared/
│   │   ├── owner-brain-system-prompt.md
│   │   ├── owner-brain-workflow.json
│   │   ├── knowledge-base-subworkflow.json
│   │   ├── customer-memory-subworkflow.json
│   │   ├── browser-research-subworkflow.json
│   │   ├── memory-updater-subworkflow.json
│   │   ├── error-handler-subworkflow.json
│   │   ├── logging-subworkflow.json
│   │   └── system-prompts/        # Base prompts (Arabic + English)
│   │
│   ├── whatsapp-intelligence-agent/
│   │   ├── workflow.json          # 20-node n8n workflow
│   │   ├── system-prompt.md
│   │   ├── config-schema.json
│   │   └── workflow-templates/
│   │       ├── restaurant-booking-bot.json
│   │       ├── real-estate-lead-qualifier.json
│   │       ├── appointment-reminders.json
│   │       └── feedback-survey-flow.json
│   │
│   ├── ai-sdr-agent/              # Sales development rep
│   ├── content-engine-agent/      # Social media content
│   ├── hr-screening-agent/        # CV screening + scheduling
│   └── financial-intelligence-agent/ # Financial reports
│
├── infrastructure/
│   ├── docker-compose.master.yml  # n8n + Postgres + Redis
│   ├── docker-compose.client.template.yml
│   ├── provision-client.sh        # Client provisioning script
│   ├── backup-client.sh
│   ├── teardown-client.sh
│   ├── health-check.sh
│   └── traefik.yml                # Reverse proxy config
│
└── docs/
    ├── platform-operations-guide.md
    ├── architecture.md
    ├── cost-overview.md
    └── technical-documentation.md  # This file
```

---

## 5. Database Schema

The platform has **21 tables** across two migration groups. See the v1.4 spec §19 for full reconciliation. The detail tables shown below are the load-bearing core; vault, Composio, Karpathy, GEPA, and Rami chat tables are documented in the spec.

| Group | Migrations | Tables |
|-------|-----------|--------|
| Core | `packages/supabase/migrations/` 001-009 | clients, agent_deployments, activity_logs, api_keys, rls_policies, calendar_configs, business_knowledge, customer_memory, conversation_summaries, booking_state |
| Vault + coordination | `backend/prompt-builder/migrations/` 010-012 | vault_notes, vault_categories, composio_connections, composio_tool_whitelist, karpathy_rules, gepa_runs, owner_actions, owner_briefings, agent_health |
| Rami CEO chat | `backend/prompt-builder/migrations/` 011 | ceo_chat_sessions, ceo_chat_messages, ceo_chat_rate_limit |

### 5.1 Core Tables (selected)

**clients** — One row per tenant
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | TEXT | URL-safe identifier (unique) |
| company_name | TEXT | Business name |
| company_name_ar | TEXT | Arabic name |
| contact_name | TEXT | Primary contact |
| contact_email | TEXT | Email |
| contact_phone | TEXT | Phone |
| country | TEXT | AE or SA |
| status | TEXT | pending → provisioning → active → suspended |
| plan | TEXT | starter, professional, enterprise, solopreneur |
| metadata | JSONB | Kapso IDs, custom config |

**agent_deployments** — One row per agent instance
| Column | Type | Description |
|--------|------|-------------|
| client_id | UUID | FK → clients |
| agent_type | TEXT | wia, ai_sdr, cea, hrsa, fia |
| status | TEXT | pending → deploying → active → paused → error |
| config | JSONB | Agent-specific configuration |
| metrics | JSONB | messages_handled, leads_qualified, etc. |

**business_knowledge** — Centralized knowledge base per client
| Column | Type | Description |
|--------|------|-------------|
| client_id | UUID | FK → clients (unique) |
| business_description | TEXT | Auto-generated from website crawl |
| brand_voice | TEXT | Communication style |
| business_hours | TEXT | Operating hours |
| services | TEXT[] | Service list |
| faq | JSONB | Question/answer pairs |
| contact_info | JSONB | Phone, email, address, locations |
| social_profiles | JSONB | Instagram, LinkedIn, etc. |
| review_sources | JSONB | Google, TripAdvisor ratings |
| crawl_data | JSONB | Industry-specific config (menu, listings, etc.) |

**customer_memory** — Long-term customer profiles
| Column | Type | Description |
|--------|------|-------------|
| client_id | UUID | FK → clients |
| phone_number | TEXT | WhatsApp number (unique per client) |
| name | TEXT | Customer name |
| profile_summary | TEXT | AI-generated profile |
| preferences | JSONB | Seating, dietary, communication language |
| key_events | JSONB | Booking history, complaints, purchases |
| lead_score | INTEGER | 0-100 |
| lifetime_value | DECIMAL | Total spend |
| avg_sentiment | DECIMAL | 0.0 to 1.0 |
| tags | TEXT[] | VIP, repeat-customer, nut-allergy, etc. |

### 5.2 Row Level Security (RLS)

All tables use RLS with tenant isolation via JWT metadata:

```sql
CREATE POLICY clients_select_v2 ON clients
  FOR SELECT USING (
    id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
  );
```

The `client_id` is set in user metadata during onboarding via `supabase.auth.updateUser()`. The JWT is refreshed immediately so subsequent queries work through RLS.

Service role key bypasses all RLS for admin operations (n8n workflows, provisioning).

---

## 6. AI Pipeline

### 6.1 Customer Message Flow

```
1. Customer sends WhatsApp message
2. Kapso receives → fires webhook to FastAPI prompt-builder (VPS)
3. FastAPI identifies tenant via phone_number_id → client_id
4. FastAPI fetches business_knowledge + vault_notes (pgvector top-k)
   + customer_memory + booking_state + Mem0/Graphiti context
5. Haiku 4.5 classifies intent (booking, complaint, FAQ, lead, etc.)
6. FastAPI assembles per-tenant system prompt
7. Claude Sonnet 4.6 generates response
8. Response sent back via Kapso → WhatsApp
9. Activity logged to Supabase
10. Post-conversation: MiniMax M2.7 summarizes + updates customer_memory
    + writes to Mem0/Graphiti (~$0.001/convo)
```

### 6.2 Owner Brain Flow

```
1. Owner sends WhatsApp message (or daily cron fires at 9AM Dubai time)
2. n8n owner-brain workflow parses the message / triggers daily brief
3. n8n fetches business_knowledge + vault_notes + recent activity_logs
4. MiniMax M2.7 generates response as "AI Chief of Staff"
5. If owner sent a command ("add special: X"), MiniMax extracts intent
   and writes to business_knowledge / vault_notes (pending owner approval
   for material changes via owner_actions table)
6. Response sent back via Kapso → Owner WhatsApp
```

### 6.3 Karpathy Loop + GEPA (nightly)

```
1. Karpathy nightly cron scans recent activity per agent
2. MiniMax M2.7 distills behavioral patterns → karpathy_rules
3. GEPA evolves the agent's system prompt against rules → gepa_runs
4. Owner approves significant prompt changes via owner_actions queue
5. Approved prompts go live in next FastAPI prompt assembly
```

### 6.4 Web-Enriched Responses (Firecrawl)

When a customer asks about weather, events, traffic, or nearby attractions:

```
1. Haiku 4.5 classifies the message as needing web context
2. Firecrawl Search API called with relevant query
3. Top 3 results (with full page content) injected into FastAPI prompt
4. Sonnet 4.6 weaves live web data into a tenant-relevant response
   "It's 28°C and gorgeous outside! Perfect for our outdoor terrace."
```

### 6.5 Model Configuration

| Model | Endpoint | Use Case | Cost |
|-------|----------|----------|------|
| Claude Sonnet 4.6 | api.anthropic.com | Customer responses | ~$0.003/conversation |
| Claude Haiku 4.5 | api.anthropic.com | Intent + sentiment classification | ~$0.0001/classification |
| MiniMax M2.7 | api.minimax.io/v1/chat/completions | Owner brain + memory analysis + Rami CEO chat | ~$0.001/conversation |
| OpenAI text-embedding-3-small | api.openai.com | `vault_notes` embeddings | ~$0.00001/note |
| Firecrawl Search | api.firecrawl.dev/v1/search | Live web context | ~$0.01/search |
| Firecrawl Scrape | api.firecrawl.dev/v1/scrape | Website crawling (onboarding) | ~$0.01/page |

---

## 7. Onboarding Flow

### 7.1 Self-Service Wizard (6 Steps)

| Step | What The Client Does | What Gets Saved |
|------|---------------------|-----------------|
| 1. Company Profile | Name, contact, country, plan | `clients` table |
| 2. Scan Website | Enter URL → AI crawls it | `business_knowledge` (auto-populated) |
| 3. Knowledge Base | Review/edit crawled data | `business_knowledge` (overrides) |
| 4. Select Agents | Pick 1-5 agents | `agent_deployments` (status: pending) |
| 5. Industry Setup | Restaurant/real estate/healthcare config | `business_knowledge.crawl_data` |
| 6. Review & Launch | Confirm everything | All tables finalized |

### 7.2 Post-Onboarding Auto-Provisioning

```
Client clicks "Launch" →
  1. Client record created (UUID generated client-side)
  2. User metadata updated with client_id
  3. Session refreshed (new JWT with client_id)
  4. Business knowledge saved
  5. Agent deployments created
  6. Auto-provisioning trigger fires (non-blocking):
     a. Client status → "provisioning"
     b. Agent status → "deploying"
     c. Activity logged
     d. Welcome email sent (Resend)
     e. Kapso customer created (if API key configured)
     f. WhatsApp setup link emailed to client
  7. Redirect to /dashboard
```

---

## 8. Email System

6 transactional email templates via Resend, all from `agents@dcp.sa`:

| Email | Trigger | Content |
|-------|---------|---------|
| Welcome | After signup | Onboarding steps, dashboard link |
| Onboarding Complete | After wizard | Agent count, setup status, ETA |
| WhatsApp Setup | After Kapso provisioning | Setup link button, expiry date |
| Agent Active | When agent goes live | Agent name, live status indicator |
| Weekly Summary | Cron (Sunday) | Conversations, resolution rate, top agent |
| Payment Receipt | After payment | Amount, currency, invoice ID |

All templates use dark theme matching the website (bg #09090b, green #22c55e accents).

---

## 9. Infrastructure

### 9.1 Server (Hostinger VPS)

| Detail | Value |
|--------|-------|
| IP | 76.13.179.86 |
| OS | Ubuntu 24.04 |
| CPU | 8 cores |
| RAM | 32 GB |
| Disk | 387 GB |
| Docker | v29.1.5 |

### 9.2 Running Services

| Service | Container | Port | URL |
|---------|-----------|------|-----|
| FastAPI prompt-builder | prompt-builder | 8000 | https://prompt-builder.dcp.sa |
| n8n (owner-brain only) | project-agent-n8n | 5678 | https://n8n.dcp.sa |
| Mem0 | mem0 | 8001 | Internal |
| Graphiti (Zep) | graphiti | 8002 | Internal |
| Redis 7 | project-agent-redis | 6379 | Internal |
| Traefik v3 | traefik | 80/443 | Reverse proxy + auto-SSL |

### 9.3 Active n8n Workflows

| Workflow | Webhook | Status |
|----------|---------|--------|
| Owner Brain | /webhook/owner-brain | ACTIVE |
| Karpathy nightly | cron | ACTIVE |
| GEPA prompt evolution | cron | ACTIVE |

Customer-facing message handling runs in the FastAPI prompt-builder, not n8n.

### 9.4 Deployments

| App | Platform | URL |
|-----|----------|-----|
| Marketing Website | Vercel (project `marketing-website`) | https://agents.dcp.sa/ |
| Client Dashboard | Vercel (project `project-agent`) | https://agents.dcp.sa/app/* |
| Dashboard origin (do not link directly) | Vercel | https://project-agent-dc11.vercel.app |
| FastAPI prompt-builder | Docker on Hostinger VPS | https://prompt-builder.dcp.sa |
| n8n owner brain | Docker on Hostinger VPS | https://n8n.dcp.sa |

---

## 10. API Endpoints

### 10.1 Dashboard API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/signout | Session | Sign out |
| GET | /api/auth/google | Session | Google OAuth initiation |
| GET | /api/auth/google/callback | Session | Google OAuth callback |
| POST | /api/crawl | Session | Crawl website for onboarding |
| POST | /api/demo/chat | Public | Demo chat (rate-limited 30/min) |
| POST | /api/email/send | Service role | Send transactional email |
| POST | /api/provisioning/trigger | Session | Auto-provisioning after onboarding |
| POST | /api/provisioning/complete | Service role | Mark provisioning done |
| GET/POST | /api/kapso/status | Session | WhatsApp connection status |
| POST | /api/kapso/setup | Session | Generate WhatsApp setup link |
| GET | /api/kapso/conversations | Session | List conversations |
| GET | /api/kapso/messages | Session | Get messages for conversation |
| POST | /api/kapso/send | Session | Send WhatsApp message |
| GET | /api/calendar-configs | Session | List calendar integrations |
| POST | /api/calendar-configs | Session | Add calendar integration |
| GET | /api/public/availability | Public | Check booking availability |
| POST | /api/public/book | Public | Create booking |
| POST | /api/webhooks/n8n | API key | n8n webhook receiver |

### 10.2 n8n Webhook Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| /webhook/whatsapp-webhook | POST | Customer WhatsApp messages from Kapso |
| /webhook/owner-brain | POST | Owner WhatsApp messages from Kapso |
| /webhook/owner-notify | POST | Agent event notifications to owner |

---

## 11. Environment Variables

### Vercel (Dashboard + Marketing)

| Variable | Source | Purpose |
|----------|--------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase | Database URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase | Public API key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase | Admin API key (bypasses RLS) |
| KAPSO_PLATFORM_API_KEY | Kapso | WhatsApp provisioning |
| RESEND_API_KEY | Resend | Transactional emails |
| ANTHROPIC_API_KEY | Anthropic | Claude Sonnet 4.6 + Haiku 4.5 |
| MINIMAX_API_KEY | MiniMax | Owner brain + Rami CEO chat |
| OPENAI_API_KEY | OpenAI | text-embedding-3-small for vault_notes |
| FIRECRAWL_API_KEY | Firecrawl | Web search/scrape |
| COMPOSIO_API_KEY | Composio | Per-agent OAuth vault |
| GOOGLE_CALENDAR_CLIENT_ID | Google | Calendar integration |
| GOOGLE_CALENDAR_CLIENT_SECRET | Google | Calendar integration |
| CALENDAR_ENCRYPTION_KEY | self-managed | AES-256-GCM key for `calendar_configs` |

### VPS (FastAPI prompt-builder + n8n)

| Variable | Purpose |
|----------|---------|
| ANTHROPIC_API_KEY | Sonnet 4.6 + Haiku 4.5 for customer-agent responses |
| MINIMAX_API_KEY | Owner brain + memory analysis |
| OPENAI_API_KEY | Embeddings for vault retrieval |
| KAPSO_PLATFORM_API_KEY | WhatsApp message routing |
| SUPABASE_URL | Database access |
| SUPABASE_SERVICE_ROLE_KEY | Database admin access |
| MEM0_API_URL | Internal Mem0 endpoint |
| GRAPHITI_API_URL | Internal Graphiti endpoint |
| COMPOSIO_API_KEY | Per-agent tool execution |

---

## 12. Industry-Specific Configurations

### 12.1 Restaurant

| Data Point | Source | Storage |
|-----------|--------|---------|
| Menu (categories, items, prices) | Onboarding / owner WhatsApp | crawl_data.menu_highlights |
| Daily specials | Owner WhatsApp command | crawl_data.daily_specials |
| SevenRooms API key | Client input | crawl_data.sevenrooms_api_key |
| Cuisine type | Onboarding | crawl_data.cuisine_type |
| Seating capacity | Onboarding | crawl_data.seating_capacity |
| Dietary handling | Knowledge base FAQ | faq |

### 12.2 Real Estate

| Data Point | Source | Storage |
|-----------|--------|---------|
| Property types | Onboarding chips | crawl_data.property_types |
| Service areas | Onboarding chips | crawl_data.service_areas |
| Budget ranges | Onboarding chips | crawl_data.budget_ranges |
| Listings source | Onboarding | crawl_data.listings_source |
| Current inventory | Owner WhatsApp / API | crawl_data.listings |

### 12.3 Healthcare / Beauty

| Data Point | Source | Storage |
|-----------|--------|---------|
| Service list with prices | Onboarding | crawl_data.service_list |
| Appointment duration | Onboarding | crawl_data.appointment_duration |
| Calendar connection | Dashboard integration | calendar_configs |

---

## 13. Security

### 13.1 Authentication
- Supabase Auth with email/password
- JWT-based session management via `@supabase/ssr`
- Autoconfirm enabled (no email verification required)
- Session refresh after onboarding to update JWT metadata

### 13.2 Authorization
- Row Level Security (RLS) on all 21 tables
- All policies use `auth.jwt() -> 'user_metadata' ->> 'client_id'`
- Service role key for admin operations (FastAPI prompt-builder, n8n owner brain, provisioning)
- API routes validate session or service role key
- Composio per-agent OAuth tokens scoped to a single `agent_deployment` (whitelist enforced via `composio_tool_whitelist`)

### 13.3 Data Isolation
- Each client can only see their own data via RLS
- No cross-tenant data leakage possible at the database level
- Calendar credentials stored encrypted in Supabase

### 13.4 Rate Limiting
- Demo chat: 30 requests/minute per IP
- Rami CEO chat: sliding-window IP limit via `ceo_chat_rate_limit` (composite PK: ip + bucket_start_minute)
- Supabase auth: 2 emails/hour, 30 signups/hour
- Kapso webhooks: No rate limit (Kapso handles this)

---

## 14. Monitoring & Observability

### Current
- n8n execution logs (success/error per workflow run)
- Supabase activity_logs table (all agent events)
- Vercel deployment logs
- Docker container health checks

### Planned
- Prometheus + Grafana metrics dashboard
- Per-agent response time tracking
- Customer satisfaction scoring
- Revenue attribution per agent

---

## 15. Cost Analysis

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Supabase | Micro tier | Scales as tenants grow |
| Vercel | Hobby (free) | Marketing + dashboard projects |
| Hostinger VPS | Shared with DCP | FastAPI prompt-builder + n8n + Mem0 + Graphiti |
| Resend | $0 | 3,000 emails/month free |
| Kapso | Pay-per-conversation | Per-tenant WhatsApp |
| Anthropic (Sonnet 4.6 + Haiku 4.5) | ~$0.003/conversation | Customer-agent responses + classification |
| MiniMax M2.7 | $80/mo plan + ~$0.001/conv | Owner brain + memory analysis + Rami |
| OpenAI embeddings | ~$0.00001/note | `vault_notes` indexing |
| Composio | Free tier | Per-agent OAuth vault |
| Firecrawl | ~$0.01/search | Pay-per-use |

See `docs/cost-overview.md` and the v1.4 spec §Pricing for canonical OPEX/revenue breakdown.

---

## 16. Demo Pages

### Customer Demo
**URL:** https://agents.dcp.sa/demo/saffron
- WhatsApp-style chat interface
- Full Saffron Kitchen knowledge base (menu, hours, FAQ, specials)
- MiniMax M2.7 AI with Firecrawl web search
- Quick-reply buttons: Menu, Book a table, Opening hours, Location
- Live web context for weather, events, traffic questions

### Owner Demo
**URL:** https://agents.dcp.sa/demo/saffron/owner
- Owner Brain chat interface with amber/gold theme
- Pre-populated daily brief with metrics and reservations
- Quick-reply buttons: Today's bookings, Add special, 86 an item, Weekly report
- Demonstrates command-based knowledge base updates

---

## 17. Roadmap

See the v1.4 spec §24 for the canonical roadmap. Summary as of April 2026:

### Completed (Phase 0-9a)
- [x] Auth system, 6-step onboarding, dashboard, RLS, email, auto-provisioning
- [x] Marketing website + Ask Rami CEO chat widget (live on agents.dcp.sa)
- [x] Calendar adapter (5 providers), Kapso Platform SDK, customer memory
- [x] FastAPI prompt-builder on VPS (replaced n8n Code nodes)
- [x] Vault (`vault_notes` + pgvector), Composio per-agent OAuth
- [x] Karpathy nightly + GEPA prompt evolution
- [x] Owner brain (n8n) on MiniMax M2.7
- [x] First production tenant (Saffron Demo) on Kapso
- [x] Vercel cutover: marketing on `/`, dashboard on `/app/*`

### In Progress / Next (Phase 9b+)
- [ ] Cross-Agent Integration (Phase 9b)
- [ ] Rami Admin Inspector (cross-client memory graph)
- [ ] Recraft integration for Rami v2 photos
- [ ] Apollo.io (SDR), Perplexity (Content + Research)
- [ ] Universal Onboarding L3 (Composio auto-discovery)
- [ ] Resend wired for auth confirmation emails
- [ ] Observability stack (Sentry + Loki + Prometheus + Grafana Tempo)
- [ ] Q2 2026 disaster recovery restore drill
- [ ] UAE data residency migration
- [ ] Linq iMessage/RCS channel (future)
