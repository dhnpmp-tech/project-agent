# DCP AI Agent Platform — Technical Documentation

**Version:** 1.0
**Last Updated:** March 28, 2026
**Repository:** https://github.com/dhnpmp-tech/project-agent

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
                    │   (WhatsApp / Web Chat / SMS)    │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │        Kapso Platform            │
                    │   (Multi-tenant WhatsApp API)    │
                    │                                  │
                    │  Customer A ←→ Phone Number A    │
                    │  Customer B ←→ Phone Number B    │
                    └──────────────┬──────────────────┘
                                   │ webhooks
                    ┌──────────────▼──────────────────┐
                    │     n8n Workflow Engine          │
                    │     (n8n.dcp.sa — VPS)           │
                    │                                  │
                    │  ┌─────────────────────────┐     │
                    │  │ WhatsApp Intelligence   │     │
                    │  │ Agent (20 nodes)        │     │
                    │  │ • Parse message          │     │
                    │  │ • Fetch knowledge base   │     │
                    │  │ • Fetch customer memory  │     │
                    │  │ • MiniMax M2.7 AI        │     │
                    │  │ • Log activity           │     │
                    │  └─────────────────────────┘     │
                    │                                  │
                    │  ┌─────────────────────────┐     │
                    │  │ Owner Brain Agent       │     │
                    │  │ (8 nodes)               │     │
                    │  │ • Owner messages         │     │
                    │  │ • Daily briefs (9AM)     │     │
                    │  │ • Knowledge base updates │     │
                    │  │ • MiniMax M2.7 AI        │     │
                    │  └─────────────────────────┘     │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │         Supabase                 │
                    │   (PostgreSQL + Auth + RLS)      │
                    │                                  │
                    │  8 tables with full RLS:         │
                    │  • clients                       │
                    │  • agent_deployments             │
                    │  • business_knowledge            │
                    │  • customer_memory               │
                    │  • conversation_summaries        │
                    │  • activity_logs                 │
                    │  • api_keys                      │
                    │  • calendar_configs              │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │    Client Dashboard (Vercel)     │
                    │    agents.dcp.sa                 │
                    │                                  │
                    │  • Auth (login/signup/reset)     │
                    │  • 6-step onboarding wizard      │
                    │  • Agent management dashboard    │
                    │  • WhatsApp inbox                │
                    │  • Reports & analytics           │
                    │  • Calendar integrations         │
                    │  • Demo chat pages               │
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
| **Frontend (Dashboard)** | Next.js 15 + React 19 + Tailwind CSS | Client portal, onboarding, agent management |
| **Frontend (Website)** | Next.js 15 + Framer Motion | Marketing site with dark theme, animations |
| **Database** | Supabase (PostgreSQL 17 + Auth + RLS) | Multi-tenant data with row-level security |
| **WhatsApp API** | Kapso Platform API | Multi-tenant WhatsApp, one account for all clients |
| **AI (Agents)** | MiniMax M2.7 (230B params, 10B active) | Customer responses, owner brain, analysis |
| **AI (Classification)** | MiniMax M2.7 | Intent classification, sentiment analysis |
| **Web Search** | Firecrawl API | Live context (weather, events, traffic) for AI responses |
| **Workflow Engine** | n8n (self-hosted) | Message processing, webhook routing, cron jobs |
| **Email** | Resend | Transactional emails (6 templates) |
| **Payments** | Stripe (planned) | Subscription billing |
| **Calendar** | Google Calendar, Outlook, CalDAV, SevenRooms | Booking and appointment management |
| **Infrastructure** | Docker + Nginx + Let's Encrypt | VPS deployment with auto-SSL |
| **Hosting (Dashboard)** | Vercel | Auto-deploy from GitHub |
| **Hosting (Website)** | HereNow | Static site hosting |
| **Build System** | Turborepo + pnpm | Monorepo management |
| **Testing** | Vitest | Unit tests (32 tests in provisioning-sdk) |

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
│   └── supabase/                  # Database layer
│       ├── migrations/
│       │   ├── 001_clients.sql
│       │   ├── 002_agent_deployments.sql
│       │   ├── 003_activity_logs.sql
│       │   ├── 004_api_keys.sql
│       │   ├── 005_rls_policies.sql
│       │   ├── 006_calendar_providers.sql
│       │   ├── 007_business_knowledge.sql
│       │   ├── 008_customer_memory.sql
│       │   └── 009_fix_rls_policies.sql  # JWT-based RLS (auth.jwt())
│       └── seed.sql
│
├── agent-templates/               # n8n workflow templates
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

### 5.1 Tables

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
2. Kapso receives → fires webhook to n8n
3. n8n parses the WhatsApp payload
4. n8n fetches business_knowledge from Supabase (services, FAQ, menu, hours)
5. n8n fetches customer_memory from Supabase (name, preferences, history)
6. n8n builds system prompt with full context
7. MiniMax M2.7 generates response (~500ms)
8. <think> tags stripped from output
9. Response sent back via Kapso → WhatsApp
10. Activity logged to Supabase
11. Post-conversation: customer memory updated asynchronously
```

### 6.2 Owner Brain Flow

```
1. Owner sends WhatsApp message (or daily cron fires at 9AM Dubai time)
2. n8n parses the message / triggers daily brief
3. n8n fetches business_knowledge + recent activity_logs from Supabase
4. MiniMax M2.7 generates response as "AI Chief of Staff"
5. If owner sent a command ("add special: X"), AI interprets and updates knowledge base
6. Response sent back via Kapso → Owner WhatsApp
```

### 6.3 Web-Enriched Responses (Firecrawl)

When a customer asks about weather, events, traffic, or nearby attractions:

```
1. Message classified as needing web context
2. Firecrawl Search API called with relevant query
3. Top 3 results (with full page content) injected into system prompt
4. AI weaves live web data into a restaurant-relevant response
   "It's 28°C and gorgeous outside! Perfect for our outdoor terrace 😊"
```

### 6.4 Model Configuration

| Model | Endpoint | Use Case | Cost |
|-------|----------|----------|------|
| MiniMax-M2.7 | api.minimax.io/v1/chat/completions | All AI responses | ~$0.001/conversation |
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
| n8n | project-agent-n8n | 5678 | https://n8n.dcp.sa |
| PostgreSQL 16 | project-agent-postgres | 5432 | Internal |
| Redis 7 | project-agent-redis | 6379 | Internal |
| Nginx | System service | 80/443 | Reverse proxy |

### 9.3 Active n8n Workflows

| Workflow | Nodes | Webhook | Status |
|----------|-------|---------|--------|
| WhatsApp Intelligence Agent | 11 | /webhook/whatsapp-webhook | ACTIVE |
| Owner Brain Agent | 8 | /webhook/owner-brain | ACTIVE |

### 9.4 Deployments

| App | Platform | URL | Domain |
|-----|----------|-----|--------|
| Client Dashboard | Vercel | project-agent-chi.vercel.app | agents.dcp.sa |
| Marketing Website | HereNow | clear-fjord-96p9.here.now | — |
| n8n Engine | Docker (VPS) | n8n.dcp.sa | n8n.dcp.sa |

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

### Vercel (Dashboard)

| Variable | Source | Purpose |
|----------|--------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase | Database URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase | Public API key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase | Admin API key (bypasses RLS) |
| KAPSO_PLATFORM_API_KEY | Kapso | WhatsApp provisioning |
| RESEND_API_KEY | Resend | Transactional emails |
| MINIMAX_API_KEY | MiniMax | AI model API |
| FIRECRAWL_API_KEY | Firecrawl | Web search/scrape |
| GOOGLE_CALENDAR_CLIENT_ID | Google | Calendar integration |
| GOOGLE_CALENDAR_CLIENT_SECRET | Google | Calendar integration |

### n8n Server

| Variable | Purpose |
|----------|---------|
| MINIMAX_API_KEY | AI responses in workflows |
| KAPSO_PLATFORM_API_KEY | WhatsApp message routing |
| SUPABASE_URL | Database access |
| SUPABASE_SERVICE_ROLE_KEY | Database admin access |

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
- Row Level Security (RLS) on all 8 tables
- All policies use `auth.jwt() -> 'user_metadata' ->> 'client_id'`
- Service role key for admin operations (n8n, provisioning)
- API routes validate session or service role key

### 13.3 Data Isolation
- Each client can only see their own data via RLS
- No cross-tenant data leakage possible at the database level
- Calendar credentials stored encrypted in Supabase

### 13.4 Rate Limiting
- Demo chat: 30 requests/minute per IP
- Supabase auth: 2 emails/hour, 30 signups/hour
- n8n webhooks: No rate limit (Kapso handles this)

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
| Supabase | $0 | Micro (free) plan |
| Vercel | $0 | Hobby (free) plan |
| HereNow | $0 | Authenticated (permanent) |
| Hostinger VPS | Shared with DCP | ~$0 marginal |
| Resend | $0 | 3,000 emails/month free |
| Kapso | $0 | Free to start |
| MiniMax M2.7 | ~$0.001/conversation | Pay-per-use |
| Firecrawl | ~$0.01/search | Pay-per-use |

**At 10 clients × 1,000 conversations/month: ~$30/month total cost**
**Revenue at 10 Starter clients: AED 15,000/month ($4,100)**
**Margin: 98%**

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

### Completed
- [x] Auth system (login, signup, password reset, autoconfirm)
- [x] 6-step onboarding wizard with website crawler
- [x] Dashboard (agents, activity, reports, WhatsApp inbox)
- [x] RLS policies (JWT-based, fully isolated)
- [x] n8n deployment with Owner Brain + WIA workflows
- [x] Email system (6 Resend templates)
- [x] Auto-provisioning trigger
- [x] Demo chat pages (customer + owner)
- [x] Marketing website with updated copy
- [x] Firecrawl web search integration
- [x] Kapso Platform SDK
- [x] Calendar adapter (5 providers)
- [x] Customer memory system

### Next
- [ ] Payment integration (Stripe)
- [ ] Admin dashboard (all clients, plans, revenue)
- [ ] Connect first real WhatsApp number via Kapso
- [ ] Owner Brain knowledge base update parser
- [ ] Daily/weekly summary cron workflows
- [ ] Apollo.io + Perplexity for SDR/Content agents
- [ ] Monitoring stack (Prometheus + Grafana)
- [ ] Run models on DCP GPUs (cost → near-zero)
