# Platform Operations Guide

How everything works end-to-end. Read this to understand the full system,
how to onboard clients, and what needs to happen at each step.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR PLATFORM                             │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ Marketing│    │   Client     │    │  Provisioning   │    │
│  │ Website  │    │  Dashboard   │    │  SDK (Kapso +   │    │
│  │ (Vercel) │    │  (Vercel)    │    │  Composio)      │    │
│  └──────────┘    └──────┬───────┘    └────────┬────────┘    │
│                         │                     │             │
│                         ▼                     ▼             │
│              ┌────────────────────────────────────────┐     │
│              │  Supabase (21 tables, RLS, pgvector)   │     │
│              └─────────────────┬──────────────────────┘     │
│                                │                            │
│                                ▼                            │
│              ┌────────────────────────────────────────┐     │
│              │         Hostinger VPS (shared)         │     │
│              │  • FastAPI prompt-builder (all clients)│     │
│              │  • Mem0 + Graphiti                     │     │
│              │  • n8n (owner-brain workflows only)    │     │
│              └─────────────────┬──────────────────────┘     │
└────────────────────────────────┼────────────────────────────┘
                                 │
                                 ▼
              ┌────────────────────────────────┐
              │        Kapso Platform          │
              │  (multi-tenant WhatsApp API)   │
              │                                │
              │  Client A → customer + owner #s│
              │  Client B → customer + owner #s│
              │  Client C → customer + owner #s│
              └────────────────────────────────┘
                                 │
                                 ▼
                       WhatsApp end-users
```

The FastAPI prompt-builder is a single shared service that assembles per-tenant prompts on each turn (knowledge + vault notes + customer memory + booking state). Per-client isolation is enforced at the data layer (Supabase RLS + Composio per-agent OAuth scopes), not by spawning a Docker container per client.

## Two WhatsApp Numbers Per Client

Each client gets TWO communication channels:

```
Customer WhatsApp ←→ AI Agent ←→ Owner WhatsApp
  (public number)     (brain)    (private number)
                        ↕
                    Dashboard
                    (web UI)
```

### Customer-Facing Number
- Public number shared with customers
- AI handles: FAQ, booking, complaints, lead qualification
- Responds in Arabic + English automatically
- Available 24/7

### Owner/Manager Number
- Private number for the business owner
- AI sends: booking notifications, complaint alerts, daily summaries
- Owner sends: inventory updates, menu changes, price updates, announcements
- Conversational — owner texts naturally, AI interprets and updates

---

## Step-by-Step: Onboarding a New Client

### Prerequisites (One-Time Platform Setup)
- [ ] Supabase project running with all 13 migrations applied (`packages/supabase/migrations/` 001-009 + `backend/prompt-builder/migrations/` 010-013)
- [ ] Vercel deployments live (marketing at agents.dcp.sa, dashboard at agents.dcp.sa/app)
- [ ] Kapso Platform account (your master account, not client's)
- [ ] Hostinger VPS running FastAPI prompt-builder + Mem0 + Graphiti + n8n (owner-brain only)
- [ ] Composio account for per-agent OAuth vault
- [ ] Anthropic API key (Claude Sonnet 4.6 + Haiku 4.5)
- [ ] MiniMax API key (M2.7 for owner brain + memory analysis)

### Step 1: Client Signs Up
**Who does it:** The client
**Where:** `https://your-dashboard.vercel.app/signup`
**What happens:**
1. Client enters email + password
2. Supabase sends confirmation email
3. Client clicks confirmation link
4. Redirected to onboarding wizard

### Step 2: Onboarding Wizard (6 steps)
**Who does it:** The client (self-service)
**Where:** `/onboarding`

| Step | What They Do | What Gets Saved |
|------|-------------|-----------------|
| 1. Company Profile | Name, contact, country, plan | `clients` table |
| 2. Scan Website | Enter URL, we crawl it | `business_knowledge` (FAQ, services, social, reviews) |
| 3. Knowledge Base | Review/edit crawled data | `business_knowledge` (overrides) |
| 4. Select Agents | Pick 1-5 agents | `agent_deployments` (status: pending) |
| 5. Industry Setup | Industry-specific config | `business_knowledge.crawl_data` |
| 6. Review & Launch | Confirm everything | All tables updated |

### Step 3: You Provision WhatsApp (YOUR action)
**Who does it:** You (platform admin)
**How:** Run provisioning from your terminal or master n8n

```bash
# Using the Kapso Platform SDK:
import { KapsoPlatformClient } from "@project-agent/provisioning-sdk";

const kapso = new KapsoPlatformClient(process.env.KAPSO_PLATFORM_API_KEY);

const result = await kapso.provisionClient({
  clientName: "Acme Restaurant",
  clientSlug: "acme-restaurant",
  clientId: "uuid-from-supabase",
  webhookUrl: "https://acme-restaurant.yourdomain.com/webhook/whatsapp",
  dashboardUrl: "https://your-dashboard.vercel.app",
  brandColor: "#22C55E",  // your brand green
});

// result.setupLink.url → Send this to the client
// They click it → WhatsApp connected in 30 seconds
```

**What this does:**
1. Creates a Kapso customer linked to your Supabase client
2. Generates a branded setup link (your colors, your redirect URLs)
3. Sets up webhooks to route messages to the client's n8n instance
4. Optionally provisions a phone number (US/UAE/SA)

### Step 4: Client Connects WhatsApp
**Who does it:** The client
**How:** You send them the setup link (from step 3)
**What happens:**
1. Client clicks the link
2. Opens Kapso embedded signup (white-labeled)
3. Client logs in with Facebook Business
4. Selects their WhatsApp Business number (or gets a new one)
5. Redirected back to dashboard with `?connected=true`
6. Kapso fires `whatsapp.phone_number.created` webhook → you store the phone_number_id

### Step 5: Activate Agents
**Who does it:** You (platform admin) — usually automatic on onboarding completion
**How:** Flip `agent_deployments.status` from `pending` → `active`

There is **no per-client n8n workflow import**. The shared FastAPI prompt-builder on the VPS reads `agent_deployments` + `business_knowledge` + `vault_notes` per request and assembles the right prompt for the right tenant. Activation just means the row is live.

If the client uses any Composio integrations (Apollo, Perplexity, Google Calendar, etc.), the OAuth handshakes happen during onboarding and tokens land in `composio_connections` with scopes restricted by `composio_tool_whitelist`.

### Step 6: Set Up Owner Channel
**Who does it:** You (platform admin)
**What:** Configure the owner's WhatsApp number in Kapso so messages route to the owner-brain n8n workflow on the VPS

The owner's number (collected in onboarding step 5) is wired to a single shared owner-brain n8n workflow that fans out per-tenant via `client_id`:

**Inbound from owner → n8n parses the message (MiniMax M2.7) → updates business_knowledge / vault_notes**

Owner can text:
- "Add today's special: Wagyu Steak AED 280" → AI updates menu in knowledge base
- "We're fully booked tonight" → AI updates availability
- "Palm penthouse is sold" → AI removes from listings
- "New price for 2BR Marina: AED 1.8M" → AI updates property listing

**Outbound to owner → n8n sends notifications via Kapso**

Agent sends:
- "New booking: Ahmed, 4 guests, tonight 8pm, outdoor seating"
- "Complaint received from +971501234567 about cold food — escalating"
- "Hot lead: Sara looking for 3BR villa in JBR, budget 5M+ — score 92/100"
- "Daily summary: 47 inquiries handled, 3 bookings, 1 escalation"

### Step 7: Test Everything
**Checklist:**
- [ ] Send test WhatsApp message to customer number → AI responds
- [ ] Send Arabic message → AI responds in Arabic
- [ ] Send booking request → booking created + owner notified
- [ ] Send complaint → escalation triggered + owner notified
- [ ] Owner texts "add special: X" → knowledge base updated
- [ ] Check dashboard → activity shows all events
- [ ] Check reports → metrics updating

### Step 8: Go Live
- [ ] Change agent status from `pending` → `active` in Supabase
- [ ] Share customer WhatsApp number with the client's customers
- [ ] Monitor for 48 hours
- [ ] Review activity logs daily for first week

---

## Industry-Specific Setup Details

### Restaurant Clients

**What you need from them:**
| Item | How to Get It | Where It Goes |
|------|--------------|---------------|
| Menu PDF | Upload in onboarding or send via WhatsApp | `business_knowledge.crawl_data.menu_pdf_url` |
| SevenRooms API key | Client gets from SevenRooms Settings → API | `business_knowledge.crawl_data.sevenrooms_api_key` |
| SevenRooms Venue ID | Client gets from SevenRooms dashboard | `business_knowledge.crawl_data.sevenrooms_venue_id` |
| Google Maps URL | Search for them on Google Maps | `business_knowledge.crawl_data.google_business_url` |
| Operating hours | Ask during onboarding | `business_knowledge.business_hours` |
| Owner WhatsApp | Ask during onboarding | `business_knowledge.crawl_data.owner_whatsapp` |

**Workflow template:** `restaurant-booking-bot.json`
**What the customer can do via WhatsApp:**
- View menu (sent as PDF)
- Book a table (via WhatsApp Flow form)
- Get directions (location pin)
- Ask about dishes, allergens, prices (from knowledge base)
- Cancel/modify booking (via buttons)

**What the owner receives:**
- New booking notifications
- Cancellation alerts
- Daily booking summary
- Complaint escalations

**How the owner updates the agent:**
- "Add special: [dish name] AED [price]" → updates daily specials
- "86 the lamb" / "We're out of [dish]" → removes from available items
- "Closed for private event on [date]" → blocks bookings
- "Update hours: closing at 11pm tonight" → temporary hours change

### Real Estate Clients

**What you need from them:**
| Item | How to Get It | Where It Goes |
|------|--------------|---------------|
| Property types | Selected chips in onboarding | `business_knowledge.crawl_data.property_types` |
| Service areas | Selected chips in onboarding | `business_knowledge.crawl_data.service_areas` |
| Budget ranges | Selected chips in onboarding | `business_knowledge.crawl_data.budget_ranges` |
| Listings source | Selected in onboarding (manual/API/CSV) | `business_knowledge.crawl_data.listings_source` |
| Current inventory | API feed or manual update via WhatsApp | `business_knowledge.crawl_data.listings` |
| Owner WhatsApp | Ask during onboarding | `business_knowledge.crawl_data.owner_whatsapp` |

**Workflow template:** `real-estate-lead-qualifier.json`
**What the customer can do via WhatsApp:**
- Search properties (by area, budget, type via interactive buttons)
- View property images and details
- Book a viewing (via WhatsApp Flow form)
- Ask questions about specific properties
- Get pre-qualified

**What the owner receives:**
- New lead with score (hot/warm/cold)
- Viewing requests with customer details
- Daily lead pipeline summary
- High-value lead alerts (score 75+)

**How the owner updates inventory:**
- "New listing: 2BR Marina AED 1.8M" → adds to inventory
- "Sold: Palm penthouse unit 42" → marks as sold
- "Price drop: JBR 1BR now AED 750K" → updates pricing
- "Open house: Dubai Hills villa, Saturday 10am-2pm" → creates event
- Send photo + "Add to listing [reference]" → adds image to property

### Healthcare / Beauty Clients

**What you need from them:**
| Item | How to Get It | Where It Goes |
|------|--------------|---------------|
| Service list with prices | Entered in onboarding | `business_knowledge.crawl_data.service_list` |
| Appointment duration | Selected in onboarding | `business_knowledge.crawl_data.appointment_duration` |
| Calendar connection | Calendar integration in dashboard | `calendar_configs` |
| Owner WhatsApp | Ask during onboarding | `business_knowledge.crawl_data.owner_whatsapp` |

**Workflow template:** `appointment-reminders.json`
**What the customer can do via WhatsApp:**
- Book appointments
- Confirm/reschedule/cancel via buttons
- Ask about services and prices
- Leave feedback after visit

**What the owner receives:**
- New appointment notifications
- Cancellation alerts
- No-show alerts
- Feedback summaries (NPS scores)

---

## Where Everything Lives

| Data | Storage | Who Reads It |
|------|---------|-------------|
| Client info (name, contact, plan) | Supabase `clients` | Dashboard, provisioning |
| Agent configs | Supabase `agent_deployments` | FastAPI prompt-builder |
| Business knowledge (FAQ, services, etc.) | Supabase `business_knowledge` + `vault_notes` (pgvector) | FastAPI prompt-builder |
| Industry config (SevenRooms, listings, etc.) | Supabase `business_knowledge.crawl_data` | FastAPI prompt-builder (industry branch) |
| Owner WhatsApp number | Supabase `business_knowledge.crawl_data.owner_whatsapp` | Owner-brain n8n workflow |
| Kapso customer ID | Supabase `clients.metadata.kapso_customer_id` | Kapso Platform API calls |
| Kapso phone number ID | Supabase `clients.metadata.kapso_phone_number_id` | Sending messages via Kapso |
| Calendar credentials | Supabase `calendar_configs` (encrypted) | Booking workflows |
| Activity logs | Supabase `activity_logs` | Dashboard reports |

## Current Status

The shared infrastructure is live:

- **FastAPI prompt-builder** (VPS) — assembles prompts on every Kapso webhook
- **Owner-brain n8n workflow** (VPS, single shared instance) — parses owner intent and writes to Supabase
- **Webhook routing** — Kapso fires to FastAPI; tenant identified by phone-number-id → client_id
- **Daily summary** — Karpathy nightly cron compiles per-tenant stats; owner-brain delivers via WhatsApp
- **Auto-provisioning** — onboarding completion triggers `KapsoPlatformClient.provisionClient()`

Open backlog (see CLAUDE.md §Roadmap for the canonical list):
1. Wire Resend for auth confirmation emails
2. Apollo.io integration (SDR agent prospecting)
3. Perplexity integration (Content + Research agents)
4. Universal Onboarding L3 (Composio auto-discovery)
5. Recraft integration for Rami v2 photo generation
6. CEO admin view in dashboard (cross-client memory graph)
7. Observability stack (Sentry + Loki + Prometheus + Grafana Tempo)
8. Q2 2026 disaster recovery restore drill
