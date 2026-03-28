# Platform Operations Guide

How everything works end-to-end. Read this to understand the full system,
how to onboard clients, and what needs to happen at each step.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR PLATFORM                             │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐   │
│  │ Marketing │    │  Client  │    │   Provisioning SDK   │   │
│  │ Website   │    │Dashboard │    │  (Docker + Kapso +   │   │
│  │(here.now) │    │ (Vercel) │    │   n8n + Supabase)    │   │
│  └──────────┘    └────┬─────┘    └──────────┬───────────┘   │
│                       │                      │               │
│                       ▼                      ▼               │
│              ┌─────────────────────────────────┐            │
│              │         Supabase                 │            │
│              │  - clients                       │            │
│              │  - agent_deployments             │            │
│              │  - business_knowledge            │            │
│              │  - activity_logs                  │            │
│              │  - calendar_configs               │            │
│              └─────────────────────────────────┘            │
│                            │                                 │
│              ┌─────────────┼─────────────┐                  │
│              ▼             ▼             ▼                   │
│         ┌────────┐   ┌────────┐   ┌────────┐               │
│         │Client A│   │Client B│   │Client C│               │
│         │  n8n   │   │  n8n   │   │  n8n   │               │
│         └───┬────┘   └───┬────┘   └───┬────┘               │
│             │            │            │                      │
└─────────────┼────────────┼────────────┼──────────────────────┘
              │            │            │
              ▼            ▼            ▼
         ┌────────────────────────────────┐
         │        Kapso Platform          │
         │  (WhatsApp API for all clients)│
         │                                │
         │  Customer A ←→ Phone Number A  │
         │  Customer B ←→ Phone Number B  │
         │  Customer C ←→ Phone Number C  │
         └────────────────────────────────┘
              │            │            │
              ▼            ▼            ▼
         WhatsApp Users (3 billion potential customers)
```

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
- [ ] Supabase project running with all 7 migrations
- [ ] Vercel deployment live (client dashboard)
- [ ] Kapso Platform account (your master account, not client's)
- [ ] Master n8n instance running on your server
- [ ] Anthropic API key

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

### Step 5: Deploy Agent Workflows
**Who does it:** You (platform admin)
**How:** Import n8n workflow + inject client config

```bash
# Using the provisioning SDK:
import { N8nApiClient, loadWorkflowTemplate, injectConfig } from "@project-agent/provisioning-sdk";

const n8n = new N8nApiClient("https://acme-restaurant.yourdomain.com", apiKey);

// Load the WhatsApp agent workflow
const workflow = loadWorkflowTemplate("wia");

// Inject client-specific config from business_knowledge
const configured = injectConfig(workflow, {
  clientId: "uuid",
  clientSlug: "acme-restaurant",
  companyName: "Acme Restaurant",
  companyNameAr: "مطعم أكمي",
  businessDescription: "Lebanese restaurant in Dubai Marina...",
  businessHours: "Daily 12:00-00:00",
  knowledgeBaseContent: "Q: What cuisine?\nA: Lebanese...",
  // ... from business_knowledge table
});

// Import and activate
const workflowId = await n8n.importWorkflow(configured);
await n8n.activateWorkflow(workflowId);
```

### Step 6: Set Up Owner Channel
**Who does it:** You (platform admin)
**What:** Configure a second Kapso webhook for the owner's WhatsApp number

The owner's number (collected in onboarding step 5) gets a special workflow:

**Inbound from owner → n8n parses the message → updates business_knowledge**

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
| Agent configs | Supabase `agent_deployments` | n8n workflows |
| Business knowledge (FAQ, services, etc.) | Supabase `business_knowledge` | All agents via knowledge-base-subworkflow |
| Industry config (SevenRooms, listings, etc.) | Supabase `business_knowledge.crawl_data` | Industry-specific n8n workflows |
| Owner WhatsApp number | Supabase `business_knowledge.crawl_data.owner_whatsapp` | Owner notification workflow |
| Kapso customer ID | Supabase `clients.metadata.kapso_customer_id` | Kapso Platform API calls |
| Kapso phone number ID | Supabase `clients.metadata.kapso_phone_number_id` | Sending messages via Kapso |
| Calendar credentials | Supabase `calendar_configs` (encrypted) | Booking workflows |
| Activity logs | Supabase `activity_logs` | Dashboard reports |

## What Still Needs to Be Built

These pieces require your n8n server running + Kapso Platform account:

1. **Owner notification n8n workflow** — listens for events (booking, complaint, lead) and sends WhatsApp to owner via Kapso
2. **Owner update parser n8n workflow** — receives owner's WhatsApp messages, uses Claude to interpret intent, updates business_knowledge in Supabase
3. **Webhook routing** — Kapso webhook → your server → routes to correct client n8n instance
4. **Daily summary cron** — n8n workflow that runs at 9pm daily, compiles stats, sends to owner
5. **Auto-provisioning trigger** — when client completes onboarding, auto-run provisionClient()

These are all n8n workflows that run on YOUR server — not code changes. Once your server + n8n is live, you can import the workflow templates and configure them per client.
