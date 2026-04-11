# Project Agent -- Master Technical Specification

**Date:** April 5, 2026
**Version:** 1.1
**Status:** Phase 0-8 complete. Phase 9+ in design.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Infrastructure](#3-infrastructure)
4. [The Prompt-Builder API](#4-the-prompt-builder-api)
5. [WhatsApp Pipeline (Phase 1)](#5-whatsapp-pipeline-phase-1)
6. [Persona System](#6-persona-system)
7. [Memory System (Phase 0-1)](#7-memory-system-phase-0-1)
8. [Booking System](#8-booking-system)
9. [Onboarding (Phase 3)](#9-onboarding-phase-3)
10. [Composio + Custom Integrations (Phase 2)](#10-composio--custom-integrations-phase-2)
11. [Research Engine (Phase 4)](#11-research-engine-phase-4)
12. [Karpathy Loop (Phase 5)](#12-karpathy-loop-phase-5)
13. [Proactive Engine (Phase 6)](#13-proactive-engine-phase-6)
14. [Owner Brain v2 (Phase 7)](#14-owner-brain-v2-phase-7)
15. [Multi-Tenant Routing](#15-multi-tenant-routing)
16. [Client Dashboard](#16-client-dashboard)
17. [Admin Dashboard](#17-admin-dashboard)
18. [Marketing Website](#18-marketing-website)
19. [Database Schema](#19-database-schema)
20. [Cron Jobs](#20-cron-jobs)
21. [Environment Variables](#21-environment-variables)
22. [Testing](#22-testing)
23. [Billing (Planned)](#23-billing-planned)
24. [Roadmap Status](#24-roadmap-status)
25. [Appendix: Agency-Agents Research](#25-appendix-agency-agents-research)
26. [Sales Rep Agent (Phase 8)](#26-sales-rep-agent-phase-8)
27. [Content Engine (Phase 8)](#27-content-engine-phase-8)
28. [Morning Brief v3 — The Daily Scorecard](#28-morning-brief-v3--the-daily-scorecard)
29. [Updated Onboarding (Phase 8)](#29-updated-onboarding-phase-8)
30. [Gamified Achievements (Phase 8)](#30-gamified-achievements-phase-8)
31. [Intent Classification — SQOS (Phase 8)](#31-intent-classification--sqos-phase-8)
32. [Content Learnings — Self-Improving Intelligence (Phase 8)](#32-content-learnings--self-improving-intelligence-phase-8)
33. [Conversion Tracking (Phase 8)](#33-conversion-tracking-phase-8)
34. [Image Prompt Generator (Phase 8)](#34-image-prompt-generator-phase-8)

---

## 1. Product Overview

### What Project Agent Is

Project Agent is a multi-tenant AI agent deployment platform that gives SMBs a fully autonomous WhatsApp-based customer service, sales, and operations assistant. Each business gets an AI persona -- a fictional human character with a backstory, personality, voice, and profile photo -- that handles customer conversations on WhatsApp 24/7. The AI remembers every customer, learns from every conversation, books appointments, processes orders, and improves itself nightly without human intervention.

The platform is not a chatbot builder. It is a managed AI employee deployment service. The business owner answers 5 questions on WhatsApp, and within minutes has a live AI agent with its own identity, knowledge base, and memory system handling their customers.

### Target Market

- **Primary:** SMBs in the UAE and Saudi Arabia
- **Industries:** Restaurants, coffee shops, salons/spas, real estate, healthcare, retail, hotels, florists
- **Why this market:** WhatsApp penetration is 85.8% in the UAE. WhatsApp is the primary customer communication channel for SMBs in the region. No competitor offers persona-driven AI agents with long-term memory and self-improvement in Arabic + English.

### Revenue Model

Premium consultative B2B sale. Not SaaS. One-on-one premium deployment.

| Tier | Monthly (AED) | Setup Fee (AED) | What's Included |
|------|---------------|-----------------|-----------------|
| Starter | 1,500 | 3,000+ | 1 WhatsApp agent, basic memory, booking |
| Professional | 4,000-8,000 | 3,000+ | Full suite: 5-10 agents, integrations, reports |
| Enterprise | 15,000-30,000 | Custom | Multi-location, custom integrations, SLA |

Each client gets 5-10 AI agents working together: WhatsApp Intelligence, Owner Brain, Content Engine, AI SDR, HR Screening, Financial Intelligence.

**Margin at 10 clients:** AED 15-20K revenue vs AED 1,100 ($300) OPEX = 13-18x margin.

---

## 2. Architecture

### System Diagram

```
                                   EXTERNAL SERVICES
                            +--------------------------+
                            |  MiniMax M2.7 API        |
                            |  (LLM - $80/mo plan)     |
                            +-----------+--------------+
                                        |
                                        v
+-------------------+     +-------------+-------------+     +------------------+
|                   |     |                           |     |                  |
|  Customer         |     |   VPS: 76.13.179.86      |     |  Supabase        |
|  WhatsApp         |     |   (Hostinger, 31GB RAM)   |     |  (Cloud, Tokyo)  |
|                   |     |                           |     |                  |
|  +1 205-858-2516  |     |  +---------------------+ |     |  17 tables       |
|  (Saffron Demo)   +---->+  | nginx               | |     |  + pgvector      |
|                   |     |  | :443 (SSL)           | |     |  + RLS           |
+-------------------+     |  +---+--------+--------+ |     +--------+---------+
                          |      |        |          |              ^
                     +----+------v--+  +--v--------+ |              |
                     | Kapso        |  |            | |              |
                     | (WhatsApp    |  | prompt-    +-+--------------+
                     |  Cloud API)  |  | builder    | |
                     +----+---------+  | :8200      | |
                          |            | (systemd)  | |     +------------------+
                          |            +--+---------+ |     |                  |
                          |               |           |     |  Vercel          |
                          |            +--v---------+ |     |  agents.dcp.sa   |
                          |            | Mem0 :8888 | |     |  (Dashboard)     |
                          |            | (Docker)   | |     |                  |
                          |            +--+---------+ |     +------------------+
                          |               |           |
                          |            +--v---------+ |     +------------------+
                          |            | Neo4j      | |     |                  |
                          |            | (Docker)   | |     |  HereNow         |
                          |            +------------+ |     |  (Website)       |
                          |                           |     |                  |
                          |  +---------------------+  |     +------------------+
                          |  | n8n :5678 (Docker)  |  |
                          |  | Redis :6379         |  |
                          |  | Postgres :5432      |  |
                          |  | Ollama :11434       |  |
                          |  | Graphiti :8100      |  |
                          |  +---------------------+  |
                          +---------------------------+
```

### Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| LLM (customer-facing) | MiniMax M2.7 (230B MoE) | $80/mo (15K req/5h window) |
| LLM (background agents) | OpenRouter free models (Qwen, Nemotron) | $0 |
| LLM (embeddings) | Ollama nomic-embed-text (768d, local) | $0 |
| LLM (Graphiti embeddings) | OpenAI text-embedding-3-small (1536d) | ~$2/mo |
| WhatsApp API | Kapso (kapso.ai) | Platform API |
| Memory (long-term) | Mem0 (self-hosted, Apache 2.0) | $0 |
| Memory (graph) | Neo4j (Mem0 backend) + Graphiti | $0 |
| Database | Supabase (PostgreSQL + Auth + RLS + pgvector) | $25/mo (Pro) |
| Workflow Engine | n8n (self-hosted Docker) | $0 |
| Dashboard | Next.js 15 + React 19 + Tailwind CSS 3.4 | $0 (Vercel) |
| Website | Next.js 15 + Framer Motion | $0 (HereNow) |
| Reverse Proxy | nginx (SSL termination) | $0 |
| VPS | Hostinger (31GB RAM) | $100/mo |
| Build System | Turbo 2.4 + pnpm 9.15 | $0 |
| Tool Execution | Composio SDK (1,034 apps) | $0 (free tier) |
| Image Generation | MiniMax image-01 | Included in $80/mo |

**Total OPEX: ~$350-400/month** for unlimited clients (until hitting MiniMax request limits at ~200+ clients).

### Data Flow

```
Customer WhatsApp Message
    |
    v
Kapso Cloud (receives message, fires webhook)
    |
    v
https://n8n.dcp.sa/webhook/whatsapp-webhook
    |
    v
nginx (:443 SSL) on VPS 76.13.179.86
    |
    v  (proxy_pass to 127.0.0.1:8200)
prompt-builder FastAPI (/webhook/whatsapp)
    |
    +---> 1. Parse incoming message (extract text, phone, contact name)
    +---> 2. Resolve client (phone_number_id -> client_id via PHONE_TO_CLIENT or Supabase)
    +---> 3. Fetch KB from Supabase (business_knowledge table)
    +---> 4. Fetch customer memory from Mem0 (40+ relations per customer)
    +---> 5. Load conversation history (last 20 messages, 24h TTL)
    +---> 6. Load booking state from Supabase (active_bookings table)
    +---> 7. Build system prompt (persona + KB + memory + booking + tools + time + rules)
    +---> 8. Call MiniMax M2.7 API (generate response)
    +---> 9. Extract reply (strip <think> tags, CJK characters, [TOOL:] calls)
    +---> 10. Split into multiple WhatsApp messages (||| delimiter or auto-split)
    +---> 11. Send via Kapso API (1.5s delay between messages)
    +---> 12. Update booking state in Supabase (auto-detect from message)
    +---> 13. Update Mem0 memory (new facts about customer)
    +---> 14. Store conversation in Supabase (conversation_messages table)
    |
    v
Customer receives reply on WhatsApp
```

### Multi-Tenant Design

Every component is tenant-isolated:

- **Routing:** `phone_number_id` in the Kapso webhook payload maps to a `client_id` via `PHONE_TO_CLIENT` dict (in-memory) or `agent_deployments` table (Supabase fallback)
- **Knowledge Base:** Each client has its own row in `business_knowledge` with persona, menu, FAQ, hours, goals, behaviors
- **Memory:** Mem0 stores memories keyed by `{client_id}_{customer_phone}` -- no cross-tenant leakage
- **Booking State:** `active_bookings` table has `client_id` column with RLS policies
- **Conversation History:** `conversation_messages` table scoped by `client_id`
- **Dashboard:** Supabase RLS enforces `client_id = auth.jwt().user_metadata.client_id` on all queries
- **Admin:** Protected by `ADMIN_EMAILS` env var in Next.js middleware

---

## 3. Infrastructure

### VPS: 76.13.179.86 (Hostinger)

| Spec | Value |
|------|-------|
| Provider | Hostinger |
| RAM | 31 GB |
| IP | 76.13.179.86 |
| SSH | `ssh -i ~/.ssh/dc1_hostinger root@76.13.179.86` |
| Domain | n8n.dcp.sa (points to VPS) |
| OS | Ubuntu (Docker-capable) |

### Services Running

| Service | Type | Port | Purpose |
|---------|------|------|---------|
| prompt-builder | systemd (host) | 8200 | FastAPI -- main AI pipeline |
| n8n | Docker | 127.0.0.1:5678 | Workflow engine (webhook routing, cron) |
| Mem0 | Docker | 127.0.0.1:8888 | Long-term customer memory API |
| Mem0 Postgres | Docker | 8432 | pgvector backend for Mem0 |
| Mem0 Neo4j | Docker | 8687 | Graph backend for Mem0 |
| Graphiti | Docker | 127.0.0.1:8100 | Temporal knowledge graph |
| Brain Neo4j | Docker | internal | Neo4j for Graphiti |
| n8n Postgres | Docker | 5432 | PostgreSQL for n8n state |
| n8n Redis | Docker | 6379 | Redis cache for n8n |
| Ollama | Host process | 11434 | Local embeddings (nomic-embed-text, 768d) |
| nginx | Host process | 443 | SSL termination, reverse proxy |

### Docker Compose Locations

| Stack | File |
|-------|------|
| n8n + Postgres + Redis | `/Users/pp/ClaudeCode/project-agent/infrastructure/local-dev/docker-compose.yml` |
| Graphiti + Neo4j | `/opt/ai-brain/docker-compose.yml` |
| Mem0 + Postgres + Neo4j | `/opt/ai-brain/mem0-repo/server/docker-compose.yaml` |

### Nginx Routing

```nginx
# WhatsApp webhook (Kapso -> prompt-builder)
location /webhook/whatsapp-webhook {
    proxy_pass http://127.0.0.1:8200/webhook/whatsapp;
}

# Onboarding webhook
location /webhook/onboarding {
    proxy_pass http://127.0.0.1:8200/webhook/onboarding;
}

# n8n UI (still accessible)
location / {
    proxy_pass http://127.0.0.1:5678;
}
```

### Supabase

| Property | Value |
|----------|-------|
| URL | https://sybzqktipimbmujtowoz.supabase.co |
| Region | Northeast Asia (Tokyo) |
| Plan | Micro ($25/mo when upgraded to Pro) |
| Extensions | pgvector (enabled) |
| Tables | 18 (8 original + 9 vault + 1 migration) |
| RLS | Enabled on all tables, service_role bypass + tenant isolation |

### Vercel (Client Dashboard)

| Property | Value |
|----------|-------|
| URL | https://agents.dcp.sa |
| Alternate | https://project-agent-chi.vercel.app |
| Framework | Next.js 15 |
| Source | `apps/client-dashboard/` |
| Deploy | Auto on push to `main` |

### HereNow (Marketing Website)

| Property | Value |
|----------|-------|
| URL | https://clear-fjord-96p9.here.now |
| Framework | Next.js 15 (static export) |
| Source | `apps/website/` |

### GitHub

| Property | Value |
|----------|-------|
| Repo | github.com/dhnpmp-tech/project-agent |
| Type | Monorepo (Turbo + pnpm workspaces) |

---

## 4. The Prompt-Builder API

**Location on VPS:** `/opt/prompt-builder/`
**Runtime:** Python 3 + FastAPI + uvicorn
**Port:** 8200 (host process, not Docker)
**Service:** systemd (`/etc/systemd/system/prompt-builder.service`)

### Source Files

| File | Purpose | Approx Lines |
|------|---------|--------------|
| `app.py` | Main FastAPI application -- WhatsApp pipeline, booking engine, prompt builder, MiniMax client, Kapso client, conversation history, test endpoint | ~1,700 |
| `onboarding.py` | WhatsApp-based business signup -- 5-question interview, bilingual, auto KB + persona creation | ~300 |
| `research_engine.py` | Weekly intelligence briefs -- customer stats, booking analytics, AI-powered suggestions | ~400 |
| `karpathy_loop.py` | Nightly self-improvement -- transcript analysis, behavioral rule generation, auto-apply to prompt | ~350 |
| `proactive_engine.py` | Follow-ups and re-engagement -- 8 template messages, churn detection, opt-in tracking | ~500 |
| `owner_brain.py` | Owner Brain v2 -- SCQA briefs, review responder, guest intelligence (RFM), risk surfacing, automation governance | ~600 |
| `integrations.py` | Custom API clients -- SevenRooms (OAuth + reservations), Tabby (BNPL UAE), Tamara (BNPL KSA) | ~400 |

### All Endpoints

**Core Pipeline:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/whatsapp` | Full WhatsApp pipeline -- single endpoint handles everything from parse to reply |
| POST | `/webhook/onboarding` | WhatsApp-based business onboarding (5 questions) |
| GET | `/health` | Health check |
| POST | `/test` | Test pipeline without WhatsApp (direct message input, returns AI response) |

**Legacy Endpoints (from n8n era, still functional):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/parse` | Parse Kapso webhook payload |
| POST | `/build-prompt` | Construct system prompt from KB + memory + booking |
| POST | `/extract-reply` | Clean MiniMax response (strip think tags, CJK, tools) |
| POST | `/send-reply` | Send message via Kapso API |
| POST | `/prep-memory` | Format conversation for Mem0 storage |
| POST | `/execute-tool` | Execute a Composio tool call |
| POST | `/parse-tool-calls` | Detect [TOOL:] patterns in AI response |

**Research Engine:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/research/brief/{client_id}` | Generate weekly intelligence brief for one client |
| GET | `/research/all` | Generate briefs for all clients |

**Karpathy Loop:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/karpathy/{client_id}` | Run self-improvement cycle for one client |
| GET | `/karpathy/{id}/rules` | View all rules with status, metrics, expiry |
| GET | `/karpathy/{id}/metrics?days=N` | Performance snapshot over N days |

**Proactive Engine:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/proactive/process` | Process all pending follow-ups (hourly cron) |
| GET | `/proactive/churn/{client_id}` | Detect at-risk customers for one client |

**Owner Brain v2:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/owner/review/draft/{client_id}` | AI drafts reply to a Google review |
| POST | `/owner/review/approve/{client_id}` | Process owner's response (SEND / EDIT / SKIP) |
| GET | `/owner/guests/{client_id}` | Full RFM guest segmentation data |
| GET | `/owner/guests/{client_id}/brief` | WhatsApp-friendly guest summary |
| GET | `/owner/risks/{client_id}` | Detect unanswered conversations, unreminded bookings, churning VIPs |

**Multi-Tenant:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register-route` | Dynamically register a phone_number_id -> client_id mapping |

---

## 5. WhatsApp Pipeline (Phase 1)

### Overview

The entire WhatsApp conversation pipeline runs in a single FastAPI endpoint: `POST /webhook/whatsapp`. This replaced the original n8n workflow (8 nodes) after n8n's task runner proved unreliable under VPS load (Code nodes timing out, cached workflow versions not updating).

### Pipeline Steps

```
POST /webhook/whatsapp
    |
    1. PARSE
    |   Extract: message text, customer phone, contact name,
    |   phone_number_id (identifies which business number received the message)
    |
    2. RESOLVE CLIENT
    |   phone_number_id -> client_id
    |   Check PHONE_TO_CLIENT dict first, then Supabase agent_deployments
    |
    3. FETCH KNOWLEDGE BASE
    |   GET business_knowledge from Supabase WHERE client_id = resolved_id
    |   Contains: persona, menu, hours, FAQ, goals, behaviors, booking requirements
    |
    4. FETCH CUSTOMER MEMORY
    |   GET memories from Mem0 for user_id = "{client_id}_{customer_phone}"
    |   Returns: 40+ relations (preferences, dietary, occasions, names, relationships)
    |   Temporal noise filtered: strips "today", "tonight", dates from memory facts
    |   continueOnFail=true (pipeline continues if Mem0 is down)
    |
    5. LOAD CONVERSATION HISTORY
    |   Last 20 messages from in-memory conversation buffer
    |   24-hour TTL -- conversations reset after 24h of inactivity
    |   Format: alternating user/assistant messages
    |
    6. LOAD BOOKING STATE
    |   SELECT * FROM active_bookings WHERE client_id AND customer_phone
    |   If exists: inject current booking details at TOP of prompt
    |
    7. BUILD SYSTEM PROMPT
    |   Components assembled in order:
    |     - UAE date/time: "RIGHT NOW: Friday, April 3, 2026 at 7:42 PM (GST, UTC+4)"
    |     - Persona voice_prompt (first-person identity)
    |     - Business knowledge (menu, hours, services, FAQ)
    |     - Booking state (if active)
    |     - Customer memory (formatted facts from Mem0)
    |     - Conversation goals and proactive behaviors
    |     - Tool definitions (if integrations configured)
    |     - Learned behaviors (from Karpathy Loop rules)
    |     - Booking requirements (industry-specific fields needed)
    |     - Gender detection context (habibi vs habibti)
    |     - Formatting instructions (multi-message splitting with |||)
    |
    8. CALL MINIMAX M2.7
    |   POST https://api.minimax.io/v1/chat/completions
    |   Model: MiniMax-M2.7
    |   Temperature: 0.8
    |   Max tokens: 300
    |   Messages: system prompt + conversation history + current message
    |
    9. EXTRACT REPLY
    |   - Strip <think>...</think> reasoning tags
    |   - Strip CJK characters (MiniMax sometimes outputs Chinese)
    |   - Strip [TOOL: ...] calls from customer-visible text
    |   - Split on ||| delimiter into multiple messages
    |   - Auto-split long messages at sentence/paragraph boundaries
    |
    10. SEND VIA KAPSO
    |   POST to Kapso API for each message segment
    |   1.5-second delay between messages (feels natural)
    |   Uses phone_number_id to send FROM the correct business number
    |
    11. UPDATE BOOKING STATE
    |   Auto-detect booking details from the AI's response:
    |     - Time: regex for "7pm", "7:30 PM", "19:00" patterns
    |     - Date: regex for "tomorrow", "Friday", "April 5" + absolute conversion
    |     - Name: regex for guest names (supports hyphenated: "Al-Rahman")
    |     - Party size: regex for "4 people", "table for 6", "8 total"
    |     - Dietary: keyword detection (vegetarian, halal, gluten-free, vegan, etc.)
    |     - Occasion: keyword detection (birthday, anniversary, engagement, business dinner)
    |     - Seating: keyword detection (terrace, indoor, private, garden, rooftop)
    |   SQL UPDATE on active_bookings -- overwrites, never duplicates
    |
    12. UPDATE MEMORY
    |   POST to Mem0: store new facts extracted from conversation
    |   Keyed by user_id = "{client_id}_{customer_phone}"
    |
    13. STORE CONVERSATION
        INSERT into conversation_messages (Supabase)
        Both inbound (customer) and outbound (AI) messages
```

### Conversation History Buffer

- **Size:** Last 20 messages (10 turns)
- **TTL:** 24 hours -- after 24h of no messages, history resets
- **Storage:** In-memory Python dict (not persistent across restarts)
- **Format:** List of `{"role": "user"/"assistant", "content": "..."}`
- **Purpose:** Gives the AI conversational context without re-fetching from Supabase

### Key Design Decisions

1. **Single endpoint over orchestration:** Moving from 8 n8n nodes to 1 FastAPI endpoint eliminated n8n's caching bugs, reduced latency by ~2s, and made debugging straightforward.

2. **Booking state in Supabase, not Mem0:** Mem0 stored conflicting times (7pm AND 8pm for same booking). SQL UPDATE = single source of truth.

3. **Memory as soft context, not hard rules:** Memory is injected as "things you remember about this customer" -- the AI uses it naturally, not as strict commands.

4. **CJK stripping:** MiniMax M2.7 is a Chinese model that occasionally outputs Chinese characters. These are stripped before sending to WhatsApp.

5. **Tool call stripping:** When the AI detects a need for a tool (e.g., `[TOOL: check_calendar]`), the tool call syntax is stripped from the message sent to the customer. The customer only sees the natural language response.

---

## 6. Persona System

### Concept

Each business gets a unique AI persona -- not a set of rules ("be warm and friendly") but a fully realized fictional human being with a backstory, education, career, relationships, quirks, and a specific voice. The AI does not follow instructions about being a character; it BECOMES the character.

### Architecture

The persona is stored as a `voice_prompt` field inside `business_knowledge.crawl_data.persona`. It is a first-person narrative (800-1,200 words) that the AI receives as part of its system prompt on every conversation.

### What a Voice Prompt Contains

1. Full name, age, nationality, current city
2. Origin story -- childhood, family, formative memories (specific sensory details)
3. Education -- actual school names, degrees, mentors
4. Career path -- every job, what they loved/hated, transitions
5. How they found THIS job -- the specific moment, why it clicked
6. Work relationships -- owner, coworkers, regulars (real dynamics, inside jokes)
7. Personal life -- family, relationship, home, hobbies, dreams
8. 6+ specific quirks (not generic traits)
9. Behavioral patterns for: birthdays, complaints, first-timers, regulars, celebrations
10. "HOW I TALK" section -- 8-10 example WhatsApp messages with exact voice, slang, emoji style

### Example Personas

**Nadia Khoury -- Saffron Kitchen (Dubai Marina)**
- 34, Lebanese, grew up in Achrafieh dusted in flour from the family bakery
- Teta Hanan's Sunday cooking taught her food makes people stay
- Engaged to Tarek. Cried at a proposal she set up at the restaurant
- Says "Habibi!!" and sends food emojis. Pushes the terrace tables hard
- Language: English with Arabic warmth

**Noor Al-Rashid -- Jareed Coffee (Riyadh)**
- Saudi, passionate about third-wave coffee in the Kingdom
- Talks about single-origin beans like they're people
- Language: Arabic (full conversation in Arabic)

### Persona Generator

**Script:** `scripts/generate-persona.py`

Automated 4-step pipeline:

1. **Voice Prompt Generation** -- MiniMax M2.7 (temperature 0.9) generates the first-person narrative from business config JSON
2. **Visual Description Extraction** -- MiniMax extracts physical appearance from the narrative
3. **Headshot Generation** -- MiniMax image-01 creates 2 professional profile photos
4. **Lifestyle Photo Generation** -- MiniMax image-01 creates 4 activity/hobby photos using subject reference for face consistency

**Cost per persona:** ~$0.04
**Time:** Under 5 minutes end-to-end
**Output:** `voice_prompt.txt` + `visual_description.txt` + `headshot_1.jpg` + `headshot_2.jpg` + `lifestyle_1-4.jpg` + `persona_output.json`

### Auto-Generation During Onboarding

When a new client completes the WhatsApp onboarding flow, the provisioning system calls `POST /api/provisioning/generate-persona` which:
1. Takes the business data collected during onboarding
2. Calls MiniMax to generate the voice_prompt
3. Extracts the persona name from the text
4. Saves to `business_knowledge.crawl_data.persona.voice_prompt` in Supabase

---

## 7. Memory System (Phase 0-1)

### Three-Layer Memory Architecture

| Layer | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| Conversation Buffer | In-memory (Python dict) | 24 hours | Current conversation context (last 20 messages) |
| Customer Facts | Mem0 (self-hosted) | Permanent | Long-term knowledge about each customer |
| Booking State | Supabase (`active_bookings`) | Until completed | Current booking details |

### Mem0 (Long-Term Memory)

- **Deployment:** Self-hosted Docker on VPS (Apache 2.0 license, no paywall)
- **URL:** http://localhost:8888 (from host), http://172.17.0.1:8888 (from Docker containers)
- **Backend:** pgvector (Postgres) + Neo4j graph
- **Embeddings:** Ollama nomic-embed-text (768 dimensions, free, local)
- **LLM:** MiniMax M2.7 (for memory extraction and analysis)
- **Admin Key:** `brain-mem0-admin-key-2026`

**What Mem0 Stores (per customer):**

- Preferences (dietary, seating, drink orders, favorite dishes)
- Personal facts (name, spouse name, children, job, nationality)
- Relationships (married_to, works_with, friends_with)
- Occasions (birthdays, anniversaries, celebrations)
- Behavioral patterns (always orders X, visits on Thursdays)
- History (last visit date, total visits, total spend)

**Typical customer:** 40+ relations after a few conversations.

**User ID format:** `{client_id}_{customer_phone}` -- ensures tenant isolation.

### Temporal Noise Filtering

Before injecting Mem0 memories into the prompt, temporal noise words are stripped:
- "today", "tonight", "this evening", "this morning"
- Specific dates that are no longer relevant
- Duplicate relations (same fact stored multiple times)

This prevents the AI from saying "You mentioned today..." when the memory is from last week.

### Conversation Messages (Supabase)

All messages (inbound and outbound) are stored in the `conversation_messages` table for:
- Karpathy Loop analysis (transcript review)
- Research Engine statistics
- Admin dashboard conversation logs
- Audit trail

### Booking State (Supabase)

The `active_bookings` table replaced Mem0 for booking state after Mem0 stored conflicting values (e.g., both 7pm and 8pm for the same booking). SQL UPDATE semantics guarantee a single source of truth.

---

## 8. Booking System

### active_bookings Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK to clients |
| customer_phone | TEXT | Customer identifier |
| guest_name | TEXT | Booking name |
| booking_time | TEXT | e.g., "7:30 PM" |
| booking_date | TEXT | e.g., "2026-04-05" |
| party_size | INT | Number of guests |
| seating | TEXT | Terrace, indoor, private, etc. |
| dietary | TEXT | Vegetarian, halal, etc. |
| occasion | TEXT | Birthday, anniversary, etc. |
| status | TEXT | active, confirmed, completed, cancelled |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### Auto-Detection from Messages

The AI's responses are scanned for booking details using regex patterns:

| Field | Detection Method |
|-------|-----------------|
| Time | Regex: `7pm`, `7:30 PM`, `19:00`, `half past 8` |
| Date | Regex: `tomorrow`, `Friday`, `April 5` + absolute date conversion (UAE timezone) |
| Name | Regex: multi-word names with hyphens (e.g., "Al-Rahman") |
| Party Size | Regex: `4 people`, `table for 6`, `8 total`, `party of 3` |
| Dietary | Keywords: vegetarian, vegan, halal, gluten-free, nut allergy, dairy-free, pescatarian |
| Occasion | Keywords: birthday, anniversary, engagement, business dinner, celebration, date night |
| Seating | Keywords: terrace, indoor, outdoor, private, garden, rooftop, window |

### Industry-Specific Booking Requirements

The `BOOKING_REQUIREMENTS` dict defines which fields are required per industry:

```python
BOOKING_REQUIREMENTS = {
    "restaurant": ["guest_name", "booking_time", "booking_date", "party_size"],
    "salon":      ["guest_name", "booking_time", "booking_date", "service_type"],
    "real_estate": ["guest_name", "booking_date", "property_type", "budget_range"],
    "healthcare": ["guest_name", "booking_time", "booking_date", "service_type"],
}
```

These are configurable per client via the dashboard's booking settings page. Custom fields can be added (e.g., "preferred therapist" for a spa).

### Auto-Confirmation

When all required fields are collected, the AI automatically confirms the booking without asking "Would you like to confirm?" -- it just confirms. This behavior was added after testing showed that asking for confirmation caused drop-offs.

---

## 9. Onboarding (Phase 3)

### WhatsApp-Based Onboarding

New business owners sign up by chatting with the platform's onboarding bot on WhatsApp. Five questions, two minutes, bilingual (English/Arabic auto-detected).

**Endpoint:** `POST /webhook/onboarding`

### Flow

```
1. "What's your business name?"
   -> "Saffron Kitchen"

2. "What type of business? (restaurant, cafe, salon, clinic, etc.)"
   -> "Restaurant"

3. "What city are you in?"
   -> "Dubai Marina"

4. "Tell me about your business in 2-3 sentences"
   -> "Lebanese restaurant, terrace dining, live oud music on weekends..."

5. "What's your website URL? (or 'skip')"
   -> "saffronkitchen.ae"
```

### What Happens After 5 Questions

1. **Client record created** in Supabase `clients` table
2. **Knowledge base populated** in `business_knowledge` table (business info + industry defaults)
3. **Persona auto-generated** via MiniMax (voice_prompt + persona name)
4. **Agent deployment created** in `agent_deployments` (status: pending, awaiting Kapso WhatsApp number)
5. **Route registration** via `POST /register-route` (dynamic phone_number_id mapping)

### Provisioning API Routes (Dashboard)

| Route | Purpose |
|-------|---------|
| POST `/api/provisioning/trigger` | Triggers full provisioning pipeline |
| POST `/api/provisioning/complete` | Marks provisioning as complete |
| POST `/api/provisioning/register-routing` | Registers phone_number_id -> client_id in prompt-builder |
| POST `/api/provisioning/generate-persona` | Generates AI persona from business data |

---

## 10. Composio + Custom Integrations (Phase 2)

### Composio SDK

- **Version:** 0.7.21 (installed on VPS)
- **API Key:** Configured in systemd environment
- **Available Apps:** 1,034 natively supported
- **Free Tier:** 20,000 tool calls/month (~7,000-10,000 conversations with 2-3 tools each)
- **Upgrade:** $29/mo for 200K calls, $229/mo for 2M calls

### Native Integrations (via Composio)

| Integration | Category | Use Case |
|-------------|----------|----------|
| Google Calendar | Scheduling | Real booking creation |
| Google Sheets | Data | Export customer data, reports |
| Gmail | Communication | Send confirmation emails |
| HubSpot | CRM | Customer data sync |
| Stripe | Payments | Payment processing |
| Zoho CRM | CRM | Customer management (dominant in UAE) |
| Zoho Books | Accounting | Invoice and VAT tracking |
| Zoho People | HR | Employee management |

### Custom Integrations (in `integrations.py`)

**SevenRooms** (Premium restaurant reservations -- 70+ Jumeirah venues)
- OAuth 2.0 authentication
- Create/modify/cancel reservations
- Guest profile sync
- Used by premium restaurants in Dubai

**Tabby** (Buy Now Pay Later -- UAE leader)
- Payment link generation
- Order status tracking
- Settlement webhooks
- Consumer-expected in UAE market

**Tamara** (Buy Now Pay Later -- KSA leader)
- Payment link generation
- Order status tracking
- Settlement webhooks
- Consumer-expected in Saudi market

### Tool Injection

Tool definitions are injected into the LLM system prompt based on the business type and configured integrations. Up to 10 tools per business. Example:

```
[AVAILABLE TOOLS]
- check_calendar: Check available time slots. Usage: [TOOL: check_calendar(date="2026-04-05")]
- create_booking: Create a calendar booking. Usage: [TOOL: create_booking(date="2026-04-05", time="19:00", name="Ahmed")]
- check_payment: Check payment status. Usage: [TOOL: check_payment(order_id="ORD-123")]
```

When the AI responds with `[TOOL: check_calendar(date="2026-04-05")]`, the tool call is:
1. Detected by `parse-tool-calls`
2. Executed via Composio or custom client
3. Result injected back into conversation
4. `[TOOL: ...]` syntax stripped from customer-visible message

---

## 11. Research Engine (Phase 4)

### Endpoint

`GET /research/brief/{client_id}` -- generates a weekly intelligence brief for one client.
`GET /research/all` -- generates briefs for all active clients.

### What the Brief Contains

1. **Customer Statistics**
   - Total bookings this week
   - Unique customers
   - Average party size
   - Most common occasions
   - Most common dietary requirements
   - Drop-off rate (conversations that didn't convert)
   - Name collection rate
   - Repeat customer percentage

2. **Conversation Analysis**
   - Total conversations
   - Average messages per conversation
   - Most asked questions
   - Unanswered questions (knowledge gaps)

3. **AI-Powered Suggestions**
   - Actionable recommendations based on data patterns
   - Example: "Thursday evening bookings increased 30% -- consider extending Thursday hours"
   - Example: "15 customers asked about vegan options -- consider adding a vegan section"

### Language Awareness

- English brief for English-speaking businesses (e.g., Saffron Kitchen)
- Arabic brief for Arabic-speaking businesses (e.g., Jareed Coffee)
- Language detected from the business's `crawl_data.language` field

### Scheduled Execution

Cron: Sunday at 9 AM UAE time (5 AM UTC) -- `0 5 * * 0`

---

## 12. Karpathy Loop (Phase 5)

### Concept

Named after Andrej Karpathy's approach to iterative model improvement. The Karpathy Loop analyzes conversation transcripts nightly, identifies what's working and what isn't, generates behavioral rules in JSON format, and automatically applies them to the AI's prompt.

### Endpoint

`GET /karpathy/{client_id}` -- runs one self-improvement cycle.

### What It Analyzes

1. **Booking outcomes:** Which conversations led to confirmed bookings vs. drop-offs
2. **Conversation transcripts:** Full message history from the past 24-48 hours
3. **Drop-off points:** Where in the conversation customers stopped responding
4. **Customer questions:** What customers ask that the AI couldn't answer
5. **Tone and style:** Whether the AI stayed in character

### How It Works

```
1. Fetch recent conversation transcripts from Supabase
2. Fetch current learned_rules from crawl_data
3. Send transcripts + current rules to MiniMax for analysis
4. MiniMax generates new behavioral rules in JSON format:
   {
     "rule": "Delay upselling until after first order is confirmed",
     "reason": "3 of 8 drop-offs occurred immediately after a promotion was suggested",
     "metric": "drop_off_rate",
     "expected_improvement": "15-20% reduction in mid-conversation exits"
   }
5. Validate rules (JSON schema, no conflicts with existing)
6. Apply to crawl_data.learned_rules in Supabase
7. Rules are injected into prompt as "LEARNED BEHAVIORS" on next conversation
```

### Rule Management

- **Max rules:** 10 active per client (verified first, then by recency)
- **Storage:** `business_knowledge.crawl_data.learned_rules` (JSON array in Supabase)
- **Injection:** Rules appear in the system prompt under a "LEARNED BEHAVIORS" section
- **Format:** Strict JSON schema enforced to prevent data summaries leaking in

**Rule Schema (v2):**

Every rule now carries full lifecycle metadata:

```json
{
  "rule": "Delay upselling until after first order is confirmed",
  "reason": "3 of 8 drop-offs occurred after premature promotion",
  "metric": "drop_off_rate",
  "expected_improvement": "15-20% reduction",
  "status": "verified",
  "metrics_at_add": { "conversion_rate": 0.62, "name_collection_rate": 0.78, "avg_messages": 6.2 },
  "metrics_after": { "conversion_rate": 0.68, "name_collection_rate": 0.80, "avg_messages": 5.8 },
  "expires_at": "2026-04-12T22:00:00Z",
  "parent_rules": []
}
```

**Rule Statuses:** `probation` -> `verified` | `reverted` | `expired` | `merged`

### Conflict Resolution

Detects and resolves contradictory rules automatically.

**Detection methods:**

1. **Antonym conflicts:** Polarity pair matching (always/never, ask/don't ask, upsell/don't upsell) combined with shared keyword detection
2. **Near-duplicates:** 60%+ word overlap between two rules

**Resolution:** Newer rules win (based on fresher conversation data) unless the older rule has status `verified`. Conflicting old rules get status `reverted` and are removed from the prompt.

### Rule Verification (A/B Testing)

New rules are treated as hypotheses that must prove themselves with data.

```
New rule generated
    |
    v
Status: "probation" (3-day trial)
    |
    +-- Performance snapshot captured at creation:
    |   conversion_rate, name_collection_rate, avg_messages
    |
    v
3 days later: metrics re-measured
    |
    +-- Improved by 2+ percentage points -> status: "verified" (kept permanently)
    +-- Declined by 5+ points -> status: "reverted" (removed from prompt)
    +-- Insufficient data after 5 days -> status: "expired"
```

### Rule Bloat Control

Prevents rule accumulation through automatic cleanup.

- Old rules (pre-v2) auto-migrated and grandfathered as `verified`
- Similar rules (60%+ word overlap) auto-merged -- keeps the longest/most detailed version, status becomes `merged`
- Max 10 active rules enforced -- `verified` rules prioritized, then by recency
- Rules expire after 7 days if never verified
- Expired and reverted rules remain in storage for audit but are excluded from the prompt

### New Endpoints (v2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/karpathy/{id}/rules` | View all rules with status, metrics, expiry |
| GET | `/karpathy/{id}/metrics?days=N` | Performance snapshot over N days |

### Real Results

Jareed Coffee: The loop independently discovered that upselling during the ordering process caused drop-offs, and wrote a rule to delay promotions until after the first order is confirmed. This is reasoning, not pattern matching.

### Scheduled Execution

Cron: nightly at 2 AM UAE time (10 PM UTC) -- `0 22 * * *`

---

## 13. Proactive Engine (Phase 6)

### Template Messages

8 pre-approved WhatsApp template messages (4 English, 4 Arabic):

| Template | Language | Trigger |
|----------|----------|---------|
| `reservation_reminder` | English | 2 hours before booking time |
| `reservation_reminder_ar` | Arabic | 2 hours before booking time |
| `feedback_request` | English | 2 hours after booking time |
| `feedback_request_ar` | Arabic | 2 hours after booking time |
| `order_confirmation` | English | Immediately on booking confirmation |
| `order_confirmation_ar` | Arabic | Immediately on booking confirmation |
| `welcome_back` | English | 14 days after last interaction (re-engagement) |
| `welcome_back_ar` | Arabic | 14 days after last interaction (re-engagement) |

### Auto-Scheduling

When a booking is confirmed, the proactive engine automatically schedules:
1. **Reminder:** 2 hours before booking time
2. **Feedback request:** 2 hours after booking time
3. **Re-engagement:** 14 days after last interaction (if no return visit)

Scheduled actions are stored in the `scheduled_actions` Supabase table with `status: pending`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/proactive/process` | Process all pending follow-ups across all clients |
| GET | `/proactive/churn/{client_id}` | Detect at-risk customers (no interaction in 14+ days) |

### WhatsApp 24-Hour Window

WhatsApp Business API rules:
- **Within 24 hours of last customer message:** Free-form messages allowed (any content)
- **After 24 hours:** Only pre-approved template messages allowed (costs money per message)

The proactive engine respects this boundary. Within the 24h window, it sends personalized follow-ups. After 24h, it uses the approved templates.

### Opt-In Tracking

Opt-in signals are detected from conversation content:
- Customer says "remind me" or "send me updates" -> opted in
- Customer says "stop" or "don't message me" -> opted out
- Tracked per customer per client in conversation metadata

### Scheduled Execution

Cron: hourly -- `0 * * * *`

---

## 14. Owner Brain v2 (Phase 7)

### Concept

The Owner Brain is the business owner's private AI assistant, accessible via their personal WhatsApp number. It surfaces actionable intelligence, drafts responses on the owner's behalf, segments guests, detects operational risks, and governs which actions the AI can take autonomously vs. which require human approval.

### SCQA Morning Brief

Daily briefing sent to the owner on WhatsApp using the McKinsey SCQA framework (Situation-Complication-Question-Answer).

**How it works:**

1. **Situation:** Yesterday's key metrics (conversations, bookings, revenue)
2. **Complication:** Variance detection -- compares yesterday's metrics against the 4-week historical average for the same day-of-week
3. **Question:** What should you do about it?
4. **Answer:** Concrete recommended actions

**Key features:**

- Conversion rate tracking: "Only 45% conversion -- 6 chatted but didn't book"
- Guest Intelligence inline: RFM segment counts ("3 VIPs, 5 at risk, 2 lapsed")
- Recommended actions section at the end (ranked by impact)
- Under 3 minutes to read on WhatsApp
- Bilingual (English + Gulf Arabic)

### Google Review Auto-Responder (Draft & Approve Pattern)

AI drafts replies to Google reviews; owner approves on WhatsApp before publishing.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/owner/review/draft/{client_id}` | AI drafts reply based on rating + review text |
| POST | `/owner/review/approve/{client_id}` | Processes owner's response (SEND / EDIT / SKIP) |

**Flow:**

```
New Google review detected
    |
    v
AI drafts reply (MiniMax M2.7, tone calibrated by rating)
    |
    v
Owner receives on WhatsApp:
    "New review from Ahmad (5 stars).
     Drafted reply: '...'
     Reply SEND / EDIT / SKIP"
    |
    +-- SEND -> publish draft as-is
    +-- EDIT -> owner sends revised text, AI confirms
    +-- SKIP -> no reply published
```

**Governance:**

- 4-5 star reviews: can auto-send (owner can still override)
- 1-3 star reviews: always require owner approval before publishing
- All drafts stored in `activity_logs` for audit trail
- Bilingual (English + Gulf Arabic)
- Tone calibration: warm/grateful for 5-star, empathetic/solution-oriented for 1-star

### Guest Intelligence System (RFM Segmentation)

Recency-Frequency-Monetary scoring using conversation data + booking history.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/owner/guests/{client_id}` | Full segmentation data with all customers |
| GET | `/owner/guests/{client_id}/brief` | WhatsApp-friendly summary |

**6 Segments:**

| Segment | Criteria | Recommended Auto-Actions |
|---------|----------|--------------------------|
| Champion | 4+ visits/month | VIP treatment, exclusive previews, loyalty perks |
| Loyal | 2-3 visits/month | Upsell, cross-sell, early access |
| Potential | 1 visit, <14 days ago | Welcome sequence, second visit incentive |
| New | First visit ever | Warm onboarding, preference discovery |
| At Risk | Last visit 30-60 days ago | Re-engagement message, special offer |
| Lapsed | 60+ days since last visit | Win-back campaign, survey |

**Trigger:** Owner texts "guest report" or "أخبار العملاء" to get the brief.

### Proactive Risk Surfacing ("What Am I Missing?")

Detects operational risks the owner might not be aware of.

**Endpoint:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/owner/risks/{client_id}` | Detect unanswered conversations, unreminded bookings, churning VIPs |

**3 Risk Types:**

| Risk | Definition | Severity |
|------|-----------|----------|
| Unanswered | Conversation with no response for 2+ hours | High (red) |
| Unreminded | Upcoming booking with no reminder scheduled | Medium (yellow) |
| VIP Churn | Former regular (Champion/Loyal) going cold | High (red) |

**Trigger:** Owner texts "what am I missing?" or "وش ناقص" to get the risk brief.

Risks are severity-ranked: high (red), medium (yellow), low (green).

### Automation Governance Framework

Determines which actions the AI can execute autonomously vs. which require owner approval.

**`classify_action()` Decision Matrix:**

| Level | Actions | Examples |
|-------|---------|----------|
| **Auto-execute** | Low-risk, reversible | Positive review replies (4-5 star), booking confirmations, reminders, small price changes (<10%) |
| **Approve** | Medium-risk, brand-sensitive | Negative review replies (1-3 star), promos, re-engagement campaigns, large price changes (>=10%), hours changes |
| **Never** | High-risk, irreversible | Staff scheduling, financial transactions, deleting customer data |

**Idempotency:** All commands are idempotent. Duplicate execution within 30 minutes returns "Already done 5m ago" instead of re-executing.

**Default-bias pattern:** The AI pre-drafts actions for owner approval rather than asking what to do. The owner's job is to review and approve, not to think of what needs doing.

---

## 15. Multi-Tenant Routing

### How It Works

```
Kapso webhook payload includes phone_number_id
    |
    v
resolve_client(phone_number_id)
    |
    +-- Check 1: PHONE_TO_CLIENT dict (in-memory, hardcoded + dynamic)
    |   {"1050764414786995": "3bd50557-..."}  # Saffron Kitchen
    |
    +-- Check 2: Supabase agent_deployments table
    |   SELECT client_id FROM agent_deployments WHERE phone_number_id = ?
    |
    +-- Check 3: Return error if no match
```

### PHONE_TO_CLIENT Dict

Hardcoded in `app.py` with known clients. New clients added dynamically via `POST /register-route`.

```python
PHONE_TO_CLIENT = {
    "1050764414786995": "3bd50557-6680-43b9-bb8e-261c7f8a19d2",  # Saffron Kitchen
    # Dynamic entries added at runtime via /register-route
}
```

### Dynamic Registration

`POST /register-route` accepts:
```json
{
    "phone_number_id": "9876543210",
    "client_id": "uuid-here"
}
```

This is called by the provisioning system when a new WhatsApp number is connected via Kapso.

### Tenant Isolation

Each client gets:
- Own knowledge base row in `business_knowledge`
- Own persona (voice_prompt)
- Own booking state in `active_bookings`
- Own conversation history in `conversation_messages`
- Own memory namespace in Mem0 (keyed by `{client_id}_{phone}`)
- Own learned rules (Karpathy Loop)
- Own research briefs
- Own proactive schedules

---

## 16. Client Dashboard (agents.dcp.sa)

### Technology

- **Framework:** Next.js 15 + React 19
- **Styling:** Tailwind CSS 3.4
- **Auth:** Supabase Auth (email + Google OAuth)
- **Deployed:** Vercel (auto-deploy on push to main)
- **Source:** `apps/client-dashboard/`

### Pages

| Path | Description |
|------|-------------|
| `/login` | Email/password login |
| `/signup` | New account registration |
| `/password-reset` | Password reset flow |
| `/update-password` | Password update |
| `/onboarding` | 6-step onboarding wizard (company profile, website scan, KB review, agent selection, industry setup, review & launch) |
| `/dashboard` | Main dashboard -- overview stats, neural brain visualization |
| `/dashboard/whatsapp` | WhatsApp inbox -- conversation list, message view, manual send |
| `/dashboard/reports` | Analytics and intelligence briefs |
| `/dashboard/integrations` | Connect/disconnect integrations (11 tools, 5 categories, OAuth + API key forms) |
| `/dashboard/booking-settings` | Toggle required booking fields, add custom fields |
| `/dashboard/agents` | View deployed agents |
| `/dashboard/agents/[id]` | Individual agent detail |
| `/dashboard/activity` | Activity log stream |
| `/dashboard/support` | Support and help |
| `/demo/saffron` | Live demo of Saffron Kitchen agents |

### Neural Brain Visualization

An animated SVG component that shows an abstract neural mesh growing over time as the AI learns about more customers. The visualization:
- Pulses subtly to feel "alive"
- Grows new connections as memory count increases
- Shows aggregate stats ("Your AI remembers 47 customers across 312 facts")
- Does NOT show raw memory data (privacy concern -- would be creepy)

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/crawl` | POST | Crawl a business website to auto-populate KB |
| `/api/booking-requirements` | GET/POST | Read/update booking field requirements |
| `/api/integrations/save` | POST | Save integration credentials |
| `/api/kapso/status` | GET | Check Kapso connection status |
| `/api/kapso/setup` | POST | Initialize Kapso setup |
| `/api/kapso/conversations` | GET | List WhatsApp conversations |
| `/api/kapso/messages` | GET | Get messages for a conversation |
| `/api/kapso/send` | POST | Send a WhatsApp message |
| `/api/calendar-configs` | GET/POST | Manage calendar integrations |
| `/api/calendar-configs/test` | POST | Test calendar connection |
| `/api/calendar-configs/[id]` | PUT/DELETE | Update/delete calendar config |
| `/api/email/send` | POST | Send email (Resend) |
| `/api/memory/update` | POST | Manual memory update |
| `/api/demo/chat` | POST | Demo chat endpoint |
| `/api/public/book` | POST | Public booking page |
| `/api/public/availability` | GET | Public availability check |
| `/api/stt` | POST | Speech-to-text |
| `/api/webhooks/n8n` | POST | n8n webhook receiver |
| `/api/auth/google` | GET | Google OAuth initiation |
| `/api/auth/google/callback` | GET | Google OAuth callback |
| `/api/auth/signout` | POST | Sign out |

---

## 17. Admin Dashboard (/admin)

### Access Control

Protected by `ADMIN_EMAILS` environment variable in Next.js middleware. Only specified email addresses can access `/admin` routes.

### Pages

| Path | Description |
|------|-------------|
| `/admin` | Overview -- all clients with stats table (status, plan, agent count, created_at) |
| `/admin/clients/[id]` | Client detail -- persona story, agent deployments, interactive memory graph |

### Admin Layout

Dark sidebar navigation with links to overview, client list, and system health.

### Interactive Memory Graph

Per-customer per-client visualization:
- **Technology:** Pure React + SVG (no external libraries like D3)
- **Type:** Force-directed graph
- **Nodes:** Entities (customer, product, place, preference)
- **Edges:** Relationships (orders, prefers, visits, married_to)
- **Data source:** Mem0 API (raw facts -- admin only)
- **Interactive:** Drag nodes, zoom, click for details

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/clients` | GET | List all clients with stats |
| `/api/admin/memory/[phone]` | GET | Get Mem0 memory graph for a customer |

---

## 18. Marketing Website (clear-fjord-96p9.here.now)

### Technology

- **Framework:** Next.js 15
- **Animations:** Framer Motion
- **Theme:** Dark (matches Linear/Vercel aesthetic)
- **Export:** Static
- **Source:** `apps/website/`

### Pages

| Path | Description |
|------|-------------|
| `/` | Homepage -- hero, features, agent showcase, CTA |
| `/services` | Service breakdown by agent type |
| `/process` | How-it-works steps (including persona generation) |
| `/case-study` | Client case study (Saffron Kitchen) |
| `/integrations` | 12 tools across 8 categories with setup guides |
| `/book-audit` | Book an audit / contact form |

### Intelligence Engine Section

Highlights the four "superpowers" that differentiate Project Agent:
1. **Self-Improving AI** -- Karpathy Loop (gets better nightly)
2. **Proactive Follow-Ups** -- Automated reminders and re-engagement
3. **Weekly Intelligence Reports** -- Research Engine briefs
4. **2-Minute Onboarding** -- WhatsApp interview bot

---

## 19. Database Schema (Supabase)

### All Tables (18 total)

#### Original Tables (8) -- Migrations 001-008

| # | Table | Purpose | Key Columns |
|---|-------|---------|-------------|
| 1 | `clients` | Tenant accounts | id, name, email, plan, status, industry, country |
| 2 | `agent_deployments` | Agent instances per client | id, client_id, agent_type, phone_number_id, status |
| 3 | `business_knowledge` | Centralized knowledge base | id, client_id, business_description, business_hours, contact_info, services, faq, crawl_data (JSONB) |
| 4 | `customer_memory` | Long-term customer profiles (legacy, replaced by Mem0) | id, client_id, customer_phone, facts, preferences |
| 5 | `conversation_summaries` | AI-generated conversation index | id, client_id, customer_phone, summary, created_at |
| 6 | `activity_logs` | Event stream | id, client_id, event_type, payload, created_at |
| 7 | `api_keys` | Client API authentication | id, client_id, key_hash, permissions |
| 8 | `calendar_configs` | Encrypted calendar credentials | id, client_id, provider, credentials (encrypted) |

#### Vault Tables (9) -- Migration 009

| # | Table | Purpose | Key Columns |
|---|-------|---------|-------------|
| 9 | `vault_notes` | AI brain (Obsidian-style markdown + pgvector) | id, client_id, path, title, content, tags[], embedding vector(1536) |
| 10 | `conversation_messages` | Full message history per customer | id, client_id, customer_phone, direction, content, message_type, created_at |
| 11 | `outcome_tracking` | Tagged conversation outcomes | id, client_id, customer_phone, outcome (ordered/booked/ghosted/etc.), revenue_aed |
| 12 | `scheduled_actions` | Follow-ups, reminders, proactive outreach | id, client_id, customer_phone, agent, action_type, payload, scheduled_for, status |
| 13 | `research_queue` | Pending research tasks | id, client_id, research_type, query, status, result |
| 14 | `prompt_versions` | System prompt evolution history | id, client_id, version, content, eval_pass_rate, change_description, created_by |
| 15 | `eval_suites` | Test cases for Karpathy Loop | id, client_id, test_cases (JSONB array), version |
| 16 | `customer_locks` | Prevents agent message collisions | customer_phone, client_id (PK), locked_by, expires_at |
| 17 | `agent_action_queue` | Cross-agent coordination | id, client_id, agent, action_type, target, payload, status |

#### Migration 010

| # | Table | Purpose | Key Columns |
|---|-------|---------|-------------|
| 18 | `active_bookings` | Current booking state per customer | id, client_id, customer_phone, guest_name, booking_time, booking_date, party_size, seating, dietary, occasion, status |

### Security

- **RLS:** Enabled on all tables
- **Service role bypass:** `auth.role() = 'service_role'` -- used by prompt-builder and n8n
- **Tenant isolation:** `client_id = auth.jwt().user_metadata.client_id` -- used by dashboard
- **pgvector:** HNSW index on `vault_notes.embedding` for semantic search
- **Helper function:** `search_vault(client_id, query_embedding, limit, tags)` for semantic vault search
- **Helper function:** `cleanup_expired_locks()` for auto-expiring customer locks

---

## 20. Cron Jobs

| Job | Schedule | UTC | UAE Time | Purpose |
|-----|----------|-----|----------|---------|
| Karpathy Loop | `0 22 * * *` | 10:00 PM | 2:00 AM | Nightly self-improvement (analyze transcripts, generate rules, verify probation rules) |
| Proactive Engine | `0 * * * *` | Every hour | Every hour | Process pending follow-ups (reminders, feedback, re-engagement) |
| Research Briefs | `0 5 * * 0` | 5:00 AM Sunday | 9:00 AM Sunday | Weekly intelligence reports per client |
| SCQA Morning Brief | `0 5 * * *` | 5:00 AM | 9:00 AM | Daily SCQA brief sent to owner on WhatsApp (variance detection, guest intelligence, recommended actions) |

All cron jobs are triggered via n8n scheduled workflows that call the prompt-builder API endpoints.

---

## 21. Environment Variables

### VPS (systemd -- prompt-builder.service)

| Variable | Purpose |
|----------|---------|
| `MINIMAX_API_KEY` | MiniMax M2.7 API authentication |
| `COMPOSIO_API_KEY` | Composio tool execution SDK |
| `KAPSO_PLATFORM_API_KEY` | Kapso WhatsApp API |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (bypasses RLS) |
| `PYTHONUNBUFFERED` | Force unbuffered stdout for logging |

### Vercel (Dashboard)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `MEM0_URL` | Mem0 API endpoint |
| `MEM0_API_KEY` | Mem0 authentication |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |
| `KAPSO_PLATFORM_API_KEY` | Kapso API for WhatsApp inbox |
| `MINIMAX_API_KEY` | MiniMax for persona generation |
| `COMPOSIO_API_KEY` | Composio for integration management |
| `RESEND_API_KEY` | Email sending (Resend) |
| `FIRECRAWL_API_KEY` | Website crawling during onboarding |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google Calendar OAuth |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google Calendar OAuth |

### VPS (Mem0 Docker)

| Variable | Purpose |
|----------|---------|
| `MEM0_API_KEY` | Admin key: `brain-mem0-admin-key-2026` |
| LLM config | MiniMax M2.7 via OpenAI-compatible API |
| Embedder config | Ollama nomic-embed-text at `http://172.17.0.1:11434` |

---

## 22. Testing

### Test Infrastructure

- **Endpoint:** `POST /test` on the prompt-builder API
- **Purpose:** Test the full pipeline without WhatsApp (direct message input, returns AI response + booking state + memory)
- **Used by:** Automated stress tests running every 2 minutes

### Test Coverage

| Suite | Scenarios | Pass Rate | Description |
|-------|-----------|-----------|-------------|
| Restaurant (Saffron) | 80 per cycle | 99%+ | Full booking flows, time changes, repeat customers, edge cases |
| Coffee Shop (Jareed) | 707 | 99% | Full Arabic test suite |
| Multi-industry | 28/28 | 100% | Salon, real estate, healthcare, coffee |
| Stress Test | 80 per cycle | 99%+ | 10 unique booking flows + 30 edge cases per cycle, every 2 minutes |
| **Total automated** | **3,000+** | **99%+** | Across all suites |

### What's Tested

- Full booking flows (new customer -> booking confirmed)
- Time changes mid-conversation
- Date changes (tomorrow, specific dates, "this Friday")
- Party size detection (all formats)
- Repeat customer recognition
- Returning customer with active booking
- Name collection and hyphenated names
- Dietary and occasion detection
- Seating preference detection
- Multi-message response splitting
- Persona consistency (stays in character)
- Arabic conversation quality
- Gender detection (habibi/habibti)
- Tool call stripping
- CJK character stripping
- Edge cases: empty messages, very long messages, special characters

### Failure Analysis

All test failures in recent cycles are MiniMax API timeouts (network), not logic bugs. The pipeline itself is deterministic for parsing, routing, and booking state.

---

## 23. Billing (Planned)

### Payment Processor

**Primary:** Tap Payments (tap.company)
- Supports AED + SAR currencies
- Subscription billing
- WhatsApp payment links (send pay link in chat)
- Fee: 2.65% + AED/SAR 1.00 per transaction

**KSA Backup:** Moyasar (moyasar.com)
- Lowest Mada fees (1.5%)
- Best Saudi API
- Fee: 2.4% + SAR 1.00

### Requirements

- Saudi Arabia Commercial Registration (trade license) -- user has this
- No Stripe, no Paddle, no Whop (not suitable for this market)

### Integration Plan

| Tier | Billing Method |
|------|---------------|
| Starter (AED 1,500/mo) | Tap payment link via WhatsApp |
| Professional (AED 8,000/mo) | Tap recurring subscription + VAT invoice |
| Enterprise (AED 30,000+/mo) | Manual invoice + bank wire |

---

## 24. Roadmap Status

### Completed Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Foundation | COMPLETE | VPS infrastructure, Supabase schema (17 tables), Kapso integration, Mem0 deployment, Ollama embeddings, n8n workflows |
| 1 | Stateful Agent | COMPLETE | WhatsApp pipeline, Mem0 memory, persona system, multi-message delivery, conversation history, booking detection |
| 2 | Integrations | COMPLETE | Composio SDK (1,034 apps), custom SevenRooms/Tabby/Tamara clients, tool injection into prompts |
| 3 | Onboarding | COMPLETE | WhatsApp-based 5-question onboarding, auto KB/persona generation, dynamic route registration, provisioning API |
| 4 | Research Engine | COMPLETE | Weekly intelligence briefs, customer stats, AI suggestions, language-aware, cron scheduled |
| 5 | Karpathy Loop | COMPLETE | Nightly self-improvement, behavioral rule generation, auto-apply to prompt, max 10 rules, proven results |
| 6 | Proactive Engine | COMPLETE | 8 template messages, auto-scheduling, churn detection, opt-in tracking, 24h window compliance |
| 7 | Owner Brain v2 + Karpathy v2 | COMPLETE | SCQA morning briefs, Google review auto-responder, RFM guest intelligence, proactive risk surfacing, automation governance framework, Karpathy conflict resolution, rule verification (A/B testing), rule bloat control |

| 8 | Full Platform Build | COMPLETE | Sales Rep (29 functions), Content Engine (34 functions), Loyalty Engine (35 functions), GBP (33 functions), Karpathy v2 (28 functions), Conversion Tracking (10 functions), Gamified Achievements (10 toggleable), Intent Classification (SQOS), Content Learnings, Image Prompt Generator, Onboarding v2 |

### Next Phase

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 9 | Cross-Agent Integration | NEXT | Multiple agents (WhatsApp, Owner Brain, Content Engine, SDR, HR, Finance) coordinate via `agent_action_queue`. Content Engine generates social posts from conversation insights. |

### Future Phases

| Phase | Name | Description |
|-------|------|-------------|
| 10 | Cross-Client Intelligence | Anonymized pattern sharing across clients. "Customers who book Lebanese restaurants on Thursdays also order flowers on Friday." |
| 11 | Agent Marketplace | Pre-built agent templates, community personas, white-label reselling |
| 12 | Autonomous Operations | Agents manage inventory, staff scheduling, marketing campaigns, financial reporting. Full business autopilot. |

### Live Clients

| Client | Business | Persona | WhatsApp | Status |
|--------|----------|---------|----------|--------|
| Saffron Kitchen | Lebanese restaurant, Dubai Marina | Nadia Khoury (34, Lebanese, English) | +1 205-858-2516 | LIVE |
| Desert Bloom / Jareed Coffee | Coffee roastery, Al Quoz / Riyadh | Noor Al-Rashid (Saudi, Arabic) | Pending Kapso setup | KB ready, awaiting number |

---

## Appendix A: Model Routing

All model assignments are centralized in `infrastructure/model-routing.json`.

| Agent | Model | Endpoint | Cost | Reason |
|-------|-------|----------|------|--------|
| WhatsApp Intelligence | MiniMax M2.7 | api.minimax.io | $80/mo plan | Customer-facing, quality critical |
| Owner Brain | MiniMax M2.7 | api.minimax.io | $80/mo plan | Owner-facing, needs quality |
| Content Engine | Qwen 3.6 Plus Preview | OpenRouter | $0 (free) | Creative writing, not customer-facing |
| Financial Intelligence (categorize) | Nemotron 3 Nano 30B | OpenRouter | $0 (free) | Simple classification |
| Financial Intelligence (report) | Qwen 3.6 Plus Preview | OpenRouter | $0 (free) | Analytical writing |
| AI SDR (scoring) | Nemotron 3 Super 120B | OpenRouter | $0 (free) | Strong reasoning for ICP scoring |
| AI SDR (outreach) | Qwen 3.6 Plus Preview | OpenRouter | $0 (free) | Creative personalized emails |
| HR Screening (parsing) | Nemotron 3 Nano 30B | OpenRouter | $0 (free) | Structured extraction |
| HR Screening (scoring) | Nemotron 3 Super 120B | OpenRouter | $0 (free) | Nuanced candidate evaluation |
| Persona Generator (text) | Qwen 3.6 Plus Preview | OpenRouter | $0 (free) | Creative writing, high temperature |
| Persona Generator (images) | MiniMax image-01 | api.minimax.io | $80/mo plan | 200 images/day included |
| Karpathy Loop (eval) | Nemotron 3 Super 120B | OpenRouter | $0 (free) | Consistency for eval runs |
| Karpathy Loop (mutation) | Qwen 3.6 Plus Preview | OpenRouter | $0 (free) | Creative prompt rewriting |
| Auto Research | Qwen 3.6 Plus Preview | OpenRouter | $0 (free) | Analytical summarization |
| Embeddings (Mem0) | nomic-embed-text | Ollama (local) | $0 | 768d, on VPS |
| Embeddings (Graphiti) | text-embedding-3-small | OpenAI | ~$2/mo | 1536d, required for temporal graph |

---

## Appendix B: Project Structure

```
project-agent/
|
+-- apps/
|   +-- client-dashboard/          # Next.js 15 -- deployed at agents.dcp.sa (Vercel)
|   |   +-- src/
|   |       +-- app/
|   |       |   +-- admin/         # Admin dashboard (protected)
|   |       |   +-- dashboard/     # Client dashboard pages
|   |       |   +-- demo/          # Live demo pages
|   |       |   +-- api/           # 20+ API routes
|   |       |   +-- login/
|   |       |   +-- signup/
|   |       |   +-- onboarding/
|   |       +-- middleware.ts      # Auth + admin email check
|   |
|   +-- website/                   # Next.js 15 -- deployed at clear-fjord-96p9.here.now
|       +-- src/
|           +-- app/
|           |   +-- services/
|           |   +-- process/
|           |   +-- case-study/
|           |   +-- integrations/
|           |   +-- book-audit/
|           +-- components/
|           +-- locales/
|
+-- packages/
|   +-- shared-types/              # TypeScript types (Client, Agent, Activity, Knowledge, Memory)
|   +-- provisioning-sdk/          # Docker, n8n, DNS, Kapso Platform SDK
|   +-- calendar-adapter/          # 5-provider calendar connector
|   +-- supabase/                  # SQL migrations + seed data
|
+-- agent-templates/
|   +-- _shared/                   # Shared workflows and system prompts
|   |   +-- owner-brain-system-prompt.md
|   |   +-- owner-brain-n8n-workflow.json
|   |   +-- browser-research-subworkflow.json
|   |   +-- customer-memory-subworkflow.json
|   |   +-- knowledge-base-subworkflow.json
|   |   +-- memory-updater-subworkflow.json
|   |   +-- error-handler-subworkflow.json
|   |   +-- logging-subworkflow.json
|   |   +-- system-prompts/
|   +-- whatsapp-intelligence-agent/
|   +-- ai-sdr-agent/
|   +-- content-engine-agent/
|   +-- hr-screening-agent/
|   +-- financial-intelligence-agent/
|
+-- infrastructure/
|   +-- model-routing.json         # Centralized model assignments
|   +-- docker-compose.master.yml
|   +-- docker-compose.client.template.yml
|   +-- traefik/
|   +-- scripts/
|   +-- local-dev/
|
+-- supabase/
|   +-- migrations/
|       +-- 009_vault_schema.sql   # 9 vault tables + pgvector + RLS
|
+-- scripts/
|   +-- generate-persona.py        # Persona generator (text + images)
|
+-- docs/
|   +-- architecture.md
|   +-- platform-operations-guide.md
|   +-- cost-overview.md
|   +-- kb-templates/
|   |   +-- restaurant-template.json
|   +-- superpowers/
|       +-- specs/
|           +-- 2026-03-30-ai-brain-architecture-design.md
|           +-- 2026-03-31-universal-agent-onboarding-design.md
|
+-- CLAUDE.md                      # Codebase conventions and agent directives
+-- package.json
+-- pnpm-workspace.yaml
+-- turbo.json
+-- tsconfig.base.json
```

---

## Appendix C: Key Identifiers

| Entity | ID / Value |
|--------|-----------|
| Saffron Kitchen client_id | `3bd50557-6680-43b9-bb8e-261c7f8a19d2` |
| Desert Bloom client_id | `07ba246b-dd1c-437d-89c3-e70b69e33938` |
| Saffron Kapso Phone Number ID | `1050764414786995` |
| Saffron WhatsApp Number | +1 205-858-2516 |
| Kapso Project ID | `0bfc4236-a345-4e1d-9a17-079ef910c237` |
| Kapso Account | setup@dcp.sa |
| n8n Workflow ID (legacy) | `diBRXsn1iDFODqeC` |
| VPS IP | 76.13.179.86 |
| Supabase URL | sybzqktipimbmujtowoz.supabase.co |
| Vercel Dashboard | agents.dcp.sa |
| HereNow Website | clear-fjord-96p9.here.now |
| GitHub | github.com/dhnpmp-tech/project-agent |

---

## 25. Appendix: Agency-Agents Research

### Source

Analysis of 120+ agents from the `msitarzewski/agency-agents` repository -- a curated collection of production-grade agent patterns from consulting, finance, operations, and customer intelligence domains.

### Patterns Adopted

| # | Pattern | Source Agent | How We Used It |
|---|---------|-------------|----------------|
| 1 | **Default-Bias / Pre-Draft** | Behavioral Nudge Engine | Owner Brain pre-drafts actions (review replies, risk alerts) for owner approval instead of asking "What should I do?" Reduces owner cognitive load from decision-making to review-and-approve. |
| 2 | **SCQA Framework** | Executive Summary Generator | Morning briefs use McKinsey's Situation-Complication-Question-Answer structure. Keeps WhatsApp briefs structured, scannable, and under 3 minutes to read. |
| 3 | **RFM Segmentation** | Analytics Reporter | Guest Intelligence system scores customers on Recency-Frequency-Monetary axes and assigns 6 segments (Champion through Lapsed) with recommended auto-actions per segment. |
| 4 | **Variance Alerting** | Finance Tracker | Morning brief compares yesterday's metrics against the 4-week average for the same day-of-week. Surfaces anomalies ("Thursday bookings down 30% vs. 4-week Thursday average") rather than raw numbers. |
| 5 | **Automation Governance** | (Cross-cutting pattern) | `classify_action()` framework with three tiers (auto-execute, approve, never). Prevents the AI from taking high-risk actions autonomously while keeping low-risk operations fast. |
| 6 | **Idempotent Commands** | (Cross-cutting pattern) | All owner commands are idempotent. Duplicate execution within 30 minutes returns "Already done 5m ago." Prevents double-sends when WhatsApp delivers the same message twice or the owner taps twice. |

### Why These Patterns

The agency-agents research was conducted to solve specific problems observed in production:

- **Owners ignored raw data briefs** -- SCQA framework made them actionable
- **Owners felt overwhelmed by notifications** -- default-bias pattern reduced decision fatigue
- **No customer segmentation** -- RFM scoring turned conversation data into business intelligence
- **Flat metrics were meaningless** -- variance alerting surfaced what actually changed
- **AI took actions it shouldn't have** -- governance framework drew clear boundaries
- **Duplicate WhatsApp messages caused duplicate actions** -- idempotency solved it

---

## 26. Sales Rep Agent (Phase 8)

### Overview

AI-powered sales agent that handles lead qualification, pipeline management, follow-ups, and upselling across all business types.

### Architecture

**Source file:** `sales_rep.py` (1,322 lines, 17 functions)

### Features

#### Lead Scoring (1-100)

Every conversation is scored across 4 dimensions:

| Dimension | Signals Detected | Max Points |
|-----------|-----------------|------------|
| Intent | "catering for 50", "corporate event", "wedding", "bulk order", "private dining" | 40 |
| Budget | Price mentions, budget ranges, "per person", "per head" | 35 |
| Timeline | "this weekend" (hot), "next month" (warm), "someday" (cold) | 15 |
| Repeat | Previously converted customer | 10 |

Score tiers: Hot (70+), Warm (40-69), Cold (<40)

#### Pipeline Management

6-stage pipeline: `new` → `qualified` → `proposal_sent` → `negotiating` → `won` → `lost`

Industry-specific deal types:
- **Restaurant:** catering, private dining, event booking, corporate account
- **Salon:** bridal package, corporate wellness, group booking
- **Cafe:** office subscription, bulk order, event catering

#### Follow-up Sequences

Automated cadence based on days since last contact:

| Day | Message Type | Example |
|-----|-------------|---------|
| 1 | Thank you | "Thank you for your interest in our private dining..." |
| 3 | Gentle nudge | "Still thinking about the catering? Happy to answer questions..." |
| 7 | Value add | "Wanted to share — we just added a new tasting menu..." |
| 14 | Last chance | "Just checking in one last time about your event..." |

#### Upsell Engine

Detects opportunities from booking context:
- Birthday → celebration package
- Bulk coffee order → office subscription
- Large party → private room upgrade
- Wedding → bridal spa package

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/sales/score/{id}` | Score a lead |
| GET/POST | `/sales/pipeline/{id}` | Pipeline summary / update stage |
| GET | `/sales/hot-leads/{id}` | Hot leads (score >= threshold) |
| POST | `/sales/followup/{id}` | Generate follow-up message |
| POST | `/sales/upsell/{id}` | Suggest upsells |
| GET | `/sales/win-loss/{id}` | Win/loss analysis |
| GET | `/sales/digest/{id}` | WhatsApp sales digest |

---

## 27. Content Engine (Phase 8)

### Overview

AI-powered content generation for social media — calendars, captions, post ideas, hashtag strategies, and trending topic awareness for UAE/KSA markets.

### Architecture

**Source file:** `content_engine.py` (1,291 lines, 20 functions)

### Features

#### Content Calendar

Weekly calendar generated across 3 pillars:
- **Brand Story (33%)** — behind-the-scenes, team spotlights, origin stories
- **Educational (33%)** — tips, how-tos, ingredient features
- **Community (33%)** — UGC, customer spotlights, events

Each entry specifies: platform (Instagram/TikTok/Google Business), format (reel/carousel/stories/post), difficulty level.

#### Caption Generator

3 variants per topic:
- **Casual** — conversational, emoji-light, CTA at end
- **Formal** — professional, brand-forward, sophisticated
- **Storytelling** — narrative arc, emotional, immersive

Each variant includes: caption text, CTA, optimized hashtag set (20-25 tags).

#### Hashtag Strategy

Location-aware, tiered approach:

| Tier | Example | Purpose |
|------|---------|---------|
| High volume | #dubairestaurants, #foodie | Broad reach |
| Medium | #dubaifoodie, #emiratesfood | Targeted |
| Niche | #jumeirahfoodie, #DIFCfood | Hyper-local |
| Arabic | #مطاعم_دبي, #طعام_دبي | Arabic audience |

Supports: Dubai, Abu Dhabi, Riyadh, Jeddah, Sharjah, Doha.

#### Trending Topics

Culturally aware of UAE/KSA calendar:
- Ramadan, Eid Al Fitr, Eid Al Adha
- UAE National Day (Dec 2), Saudi National Day (Sep 23)
- Riyadh Season, Dubai Food Festival
- Day-of-week content angles

#### Instagram Stories

Multi-slide sequence concepts with:
- Visual description per slide
- Text overlay specifications
- Interactive sticker specs (polls, quizzes, sliders)
- Transition and pacing notes

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/content/calendar/{id}` | Weekly content calendar |
| POST | `/content/caption/{id}` | Generate captions |
| GET | `/content/ideas/{id}` | Post ideas |
| GET | `/content/hashtags` | Hashtag strategy |
| GET | `/content/brief/{id}` | Weekly content brief |
| GET | `/content/trending` | Trending topics |
| POST | `/content/story/{id}` | IG Stories sequence |

---

## 28. Morning Brief v3 — The Daily Scorecard

### Format

The morning brief was redesigned as a sports-style daily scorecard:

```
============================
  Saffron Kitchen
  Daily Scorecard — Sunday
============================

  Bookings       12 (+23%)
  Covers         47 (+15%)
  Conversations  18 (steady)
  Conversion     67%
  Avg party      3.9 guests
  (3-day winning streak)

🤖 AI performance:
  Messages       42 in / 38 out
  Name capture   92%
  Stuck bookings 3

📌 Highlights:
  ⭐ Biggest table: Al-Rashidi — 12 guests
  🥗 Dietary requests: Sarah (gluten-free)

📅 Today: 8 bookings / 31 covers
  18:00  Ahmad x4 [Birthday, terrace]
  19:00  Rashid x8 [Anniversary]

👥 Guest base: 124 total
  🏆 8 VIP  |  ⚠️ 12 at risk  |  💤 5 lapsed
  → Reach out: Khalid, Sarah, Omar

🧠 AI brain: 7 rules (5 verified, 2 testing)

📊 Last 7 days: _▂▃▅▃█▅
               MoTuWeThFrSaSu

⚡ Quick commands:
  'guest report' — full guest breakdown
  'what am I missing' — risk alerts
```

### Key Features

- **7-day sparkline chart** using Unicode block characters
- **Streak detection** ("3-day winning streak" or "4-day slide")
- **Day-of-week records** ("Best Saturday this week!")
- **Trend arrows** with percentage change vs same-day average
- **AI performance section** (name capture rate, stuck bookings, message ratio)
- **Guest health inline** (VIP/at-risk/lapsed counts with names)
- **Rule status** (verified vs. testing counts)
- **UAE timezone aware** (UTC+4)

---

## 29. Updated Onboarding (Phase 8)

The WhatsApp onboarding was expanded from 5 to 6 questions:

| Step | Question | Purpose |
|------|----------|---------|
| 1 | Business name | Identity |
| 2 | **Business type** (new) | Drives Sales Rep deal types, Content Engine content pillars, conversation goals |
| 3 | Products/services + prices | Knowledge base |
| 4 | Delivery/service area | Geography |
| 5 | Payment methods | Transaction setup |
| 6 | Contact info | WhatsApp/Instagram/website |

Business type detection supports: numbers (1-6), English text, Arabic text. Maps to: `restaurant`, `cafe`, `salon`, `real_estate`, `healthcare`, `retail`.

Each business type gets tailored:
- Conversation goals (booking vs ordering vs scheduling)
- Category labels (Menu vs Products vs Services)
- Voice prompt personality
- Empty `learned_rules` array for Karpathy Loop

---

## 30. Gamified Achievements (Phase 8)

### Overview

10 toggleable achievement milestones that auto-trigger from customer behavior. Each achievement rewards the customer with points and a bilingual (English/Arabic) congratulation message via WhatsApp.

### Achievements

| # | Achievement | Trigger | Default Points |
|---|-------------|---------|---------------|
| 1 | Welcome Explorer | First visit / first order | 50 |
| 2 | Familiar Face | 3rd visit | 100 |
| 3 | Part of the Crew | 10th visit | 250 |
| 4 | Legend | 25th visit | 500 |
| 5 | Connector | First successful referral | 200 |
| 6 | Social Butterfly | 5th successful referral | 500 |
| 7 | Voice of the People | First Google/social review | 150 |
| 8 | Birthday Star | Birthday month visit | 300 |
| 9 | High Roller | Cumulative spend milestone | 400 |
| 10 | Weekly Regular | 4 consecutive weekly visits (streak) | 350 |

### Configuration

- Owner can enable/disable each achievement via WhatsApp command or dashboard toggle
- Each achievement has: bilingual title (EN/AR), congratulation message, reward points, reward text
- Auto-triggers from visit tracking, referral tracking, review detection, birthday detection, spend milestones, streak detection
- Stored in `crawl_data.achievements_config` per client

---

## 31. Intent Classification — SQOS (Phase 8)

### Overview

Sales Qualification & Opportunity Scoring system that classifies every inbound WhatsApp message across 3 dimensions to route leads to the right follow-up tier.

### Scoring Dimensions

| Dimension | What It Measures | Range |
|-----------|-----------------|-------|
| intent_match | How closely the message matches a buying intent | 1-5 |
| conversion_proximity | How close the customer is to converting | 1-5 |
| value_potential | Estimated deal value / lifetime value | 1-5 |

**Total score range:** 3-15

### Routing Tiers

| Tier | Score Range | Action |
|------|------------|--------|
| Priority | 12-15 | Immediate human handoff or high-touch AI response |
| Nurture | 8-11 | Automated follow-up sequence within 24h |
| Educate | 4-7 | Add to content drip, send relevant info |
| Low | 1-3 | Standard AI response, no escalation |

### N-gram Analysis

Performs unigram, bigram, and trigram analysis on WhatsApp message history to detect:
- **Common intents** — what customers ask for most
- **Pain points** — recurring complaints or friction
- **Upsell opportunities** — patterns that signal higher-value needs
- **FAQ gaps** — questions the AI cannot answer (fed back into knowledge base)

---

## 32. Content Learnings — Self-Improving Intelligence (Phase 8)

### Overview

Persistent learning system that tracks what works and what doesn't across content and conversations. Stored as `learnings.json` per client in `crawl_data.content_learnings`.

### What It Tracks

| Category | Examples |
|----------|---------|
| Best hooks | Opening lines with highest reply rates |
| Best times | Hours/days with highest engagement |
| Best styles | Casual vs formal vs storytelling performance |
| Best topics | Menu items, services, or themes that drive conversation |
| Worst performers | Content patterns that get ignored or negative response |

### Conversation Patterns

| Pattern | Detail |
|---------|--------|
| Peak hours | When customers message most (by hour, by day) |
| Common questions | Top 20 questions ranked by frequency |
| Drop-off triggers | Points in conversation where customers stop responding |
| Conversion phrases | Specific words/phrases that correlate with bookings |

### Integration

`apply_learnings_to_prompt()` generates behavioral rules from accumulated patterns and feeds them into the Karpathy Loop. This creates a closed feedback loop:

```
Conversations → Pattern detection → Learnings stored →
Rules generated → Prompt updated → Better conversations →
More data → Better patterns → ...
```

---

## 33. Conversion Tracking (Phase 8)

### Overview

Server-side conversion tracking integrating Meta Conversions API (CAPI) and GA4 event taxonomy to measure the full funnel from ad click to booking completion.

### Meta Conversions API (CAPI)

- Server-side event posting to Meta for WhatsApp ad attribution
- SHA-256 PII hashing for privacy compliance (phone, email, name)
- Event deduplication via `event_id`
- Supports: Lead, Purchase, InitiateCheckout, CompleteRegistration

### GA4 Event Taxonomy

| Event | Trigger |
|-------|---------|
| `whatsapp_opt_in` | Customer starts first conversation |
| `menu_view` | Customer requests menu / service list |
| `booking_start` | Customer initiates a booking |
| `booking_complete` | Booking confirmed |
| `review_submit` | Customer leaves a review |
| `referral_send` | Customer shares referral link |
| `tier_upgrade` | Customer reaches new loyalty tier |
| `achievement_unlocked` | Customer earns an achievement |

### Conversion Funnel

```
Conversation → Menu View → Booking Start → Booking Complete
    100%          45%          28%              22%
```

### Features

- **Event timeline per customer** — chronological view of all conversion events
- **Analytics dashboard** — trends, sources, peak hours, conversion rates
- **Source attribution** — tracks which WhatsApp entry point (ad, organic, referral) drove each conversion

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/conversions/track/{id}` | Track a conversion event |
| GET | `/conversions/funnel/{id}` | Funnel analysis |
| GET | `/conversions/timeline/{id}/{customer}` | Customer event timeline |
| GET | `/conversions/analytics/{id}` | Analytics dashboard data |
| GET | `/conversions/sources/{id}` | Source attribution breakdown |

---

## 34. Image Prompt Generator (Phase 8)

### Overview

AI-powered image prompt generation for professional business photography. Generates platform-specific prompts with SEO filenames, alt text, and composition guidance.

### Templates

| # | Template | Use Case |
|---|----------|----------|
| 1 | Food Hero | Hero shot of a signature dish |
| 2 | Restaurant Interior | Ambiance and dining room |
| 3 | Coffee Art | Latte art and specialty drinks |
| 4 | Salon Transformation | Before/after beauty transformations |
| 5 | Storefront | Exterior and entrance |
| 6 | Team Photo | Staff and team portraits |
| 7 | Product Flatlay | Retail product arrangements |

### Platform Targets

Generates optimized prompts for: **Midjourney**, **DALL-E**, **Stable Diffusion**, **Flux**, and **General** (platform-agnostic).

### Prompt Structure

Each prompt follows a 5-layer architecture:

1. **Subject** — What is being photographed (dish, interior, person)
2. **Environment** — Setting, background, props, context
3. **Lighting** — Natural, studio, golden hour, moody, bright
4. **Technical** — Camera angle, lens, depth of field, resolution
5. **Style** — Photography style, color grading, mood, reference

### Output Per Prompt

- Platform-optimized prompt text
- SEO filename (e.g., `best-lebanese-shawarma-dubai-marina.jpg`)
- Alt text for accessibility and SEO
- Recommended aspect ratio
- Composition tips

### Batch Generation

`/images/batch/{id}` generates 5 prompts covering all visual needs for a business in one call.

### WhatsApp Commands

- English: `image [subject]` or `generate image [subject]`
- Arabic: `صورة [موضوع]` or `انشئ صورة [موضوع]`

---

## 35. Voice Notes (WhatsApp In & Out)

### Overview

End-to-end voice note support for WhatsApp: customers can send voice notes, the agent transcribes, processes through the normal text pipeline, generates a text reply, and returns a voice note response. Fully bidirectional and transparent to the customer.

### Inbound STT (Speech-to-Text)

- **Engine**: `faster-whisper` (base model) running locally on VPS CPU — no API key needed
- **Media download**: Fetch voice note from Kapso via `GET /meta/whatsapp/v24.0/{media_id}?phone_number_id={id}` which returns a signed `download_url`
- **Format**: Transcribes ogg/opus audio directly (WhatsApp native format)
- **Language**: Auto-detection (supports Arabic + English out of the box)
- **Cost**: $0 (local processing, zero API cost)

### Outbound TTS (Text-to-Speech)

- **Engine**: MiniMax `speech-2.8-hd` model (HD only — turbo variant not available on the Max-Highspeed plan)
- **Endpoint**: `POST https://api.minimax.io/v1/t2a_v2`
- **Audio settings**: Sample rate 32000, MP3 format
- **Encoding gotcha**: Audio is returned **HEX encoded** — NOT base64. Must decode via `bytes.fromhex(audio_raw)`
- **Transcoding**: MP3 converted to ogg/opus via ffmpeg: `-c:a libopus -b:a 32k -ar 48000`
- **Delivery**: Uploaded to Kapso and sent as a native WhatsApp voice note

### Cost Per Voice Exchange

| Component | Cost |
|-----------|------|
| STT (faster-whisper local) | $0 |
| MiniMax TTS | ~$0.012 |
| LLM round-trip | ~$0.001 |
| **Total per exchange** | **~$0.013** |

### Plan Allowance

- 19,000 characters/day ≈ 25 minutes audio/day ≈ 750 minutes/month on $80 MiniMax Max-Highspeed plan

### Voice Selection

- Configured per-client in `crawl_data.persona.voice_id`
- Defaults:
  - Female English: `Calm_Woman`
  - Female Arabic: `female-shaanxi`

### Pipeline Flow

1. Webhook handler detects voice note in inbound Kapso payload
2. STT transcription via faster-whisper
3. Transcript flows through normal text pipeline (memory, persona, brain)
4. Text reply generated and sent immediately
5. Text reply is also synthesized via MiniMax TTS
6. ffmpeg transcodes MP3 to ogg/opus
7. Voice reply uploaded and sent to Kapso as voice note

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/voice/transcribe` | Manual STT endpoint for testing |
| GET | `/voice/voices` | List available MiniMax voice IDs |

---

## 36. Smart Language Routing

### Problem

MiniMax M2.7 is Chinese/English trained — Arabic output is broken and unnatural, often mixing dialects or emitting garbled script. Using it for Arabic customers produces unusable replies.

### Solution

Route messages by detected language at the LLM step:

- **Arabic input** → Claude Haiku via OpenRouter (native Gulf Arabic fluency)
- **English input** → MiniMax M2.7 (cheap, fast, fluent English)
- **Fallback**: If Claude fails, fall back to MiniMax (degraded but available)

### Language Detection Logic

Count Unicode range U+0600-U+06FF characters (Arabic block); if >30% of non-space characters fall in that range, classify as Arabic.

### Implementation

- **Location**: `_whatsapp_pipeline()` in `app.py`, Step 5 (LLM call)
- **Arabic model**: `anthropic/claude-haiku` on OpenRouter
- **English model**: MiniMax M2.7 on native API
- **Shared state**: Same system prompt, same booking state, same memory, same persona — only the LLM changes
- **Transparent**: The customer never sees the routing

### Cost

- Claude Haiku ~$0.25/M input tokens
- Roughly $2-5/month for 100 Arabic conversations/day
- Acceptable uplift vs. the quality gain

---

## 37. Arabic Dialect Rules

Added to the system prompt to enforce natural Gulf Arabic output from Claude Haiku:

### Language Matching

- Always match the customer's language exactly: Arabic in → Arabic out, English in → English out
- Never mix languages mid-message

### Gulf Dialect Expressions

Use authentic Gulf expressions:
- `هلا وغلا` (welcome)
- `تمام` (perfect / okay)
- `حلو` (good / nice)
- `خلني أساعدك` (let me help you)
- `وايد` (a lot / very)
- `زين` (good / fine)
- `شلونك` (how are you)

### Hard Constraints

- Keep Arabic responses short (2-3 sentences) — long responses cause MiniMax/drift issues
- Transliterate English terms to Arabic script: `لامب تشوبس` not `Lamb Chops`
- Never use Egyptian or Levantine dialect — Gulf only
- Never use transliterated Arabic in English replies (no `Ahla w sahla` when replying in English)

---

## 38. Production Fixes & Bug Corrections

Bugs discovered and resolved since April 6:

1. **`crawl_data` JSON string bug** — `loyalty_engine.py` line 2379 used `json.dumps(crawl)`, serializing the dict to a string before a Supabase JSONB column. Fixed: pass the dict directly so Supabase stores it as native JSONB.

2. **Onboarding plan check constraint** — Onboarding wizard set `plan: "trial"` which violated the DB check constraint on `clients.plan`. Changed default to `plan: "starter"`.

3. **Arabic business name slug** — Slug regex stripped all Arabic characters, leaving `"------"` as the slug for Arabic-named businesses. Fallback added: `f"biz-{client_id[:8]}"`.

4. **Kapso media download URL** — Initial implementation used the wrong URL format for media retrieval. Correct endpoint: `GET /meta/whatsapp/v24.0/{media_id}?phone_number_id={phone_number_id}` which returns a `download_url` field containing the signed media URL.

5. **MiniMax TTS model mismatch** — Using `speech-02-turbo` returned "plan not supported". Correct model for the Max-Highspeed plan: `speech-2.8-hd` (HD models only).

6. **MiniMax TTS audio encoding** — MiniMax returns TTS audio as **HEX** encoded, not base64. Use `bytes.fromhex(audio_raw)` instead of `base64.b64decode(audio_raw)`.

7. **Webhook `json` undefined** — A debug logging line used `json.dumps()` but `json` was not imported in that scope, crashing the entire webhook on every inbound message. Removed the debug line.

8. **Double CORS headers** — nginx added `Access-Control-Allow-Origin` while FastAPI middleware also added it, causing browsers to reject duplicates. Removed nginx CORS configuration, kept FastAPI CORS middleware as the single source.

---

## 39. Onboarding Simulation — Bloom Salon Test

On 2026-04-07, a full end-to-end onboarding simulation was run for a test Saudi salon to validate the post-April-6 pipeline:

| Field | Value |
|-------|-------|
| Business name | بلوم صالون آند سبا (Bloom Salon & Spa) |
| Phone | 971558888777 |
| Business type | salon |
| Industry | salon |
| Language | Gulf Arabic |

### Results

- All 7 onboarding steps completed successfully
- Client record created in Supabase (Arabic name slug fallback triggered)
- 7 services loaded with prices
- Gulf Arabic persona generated automatically
- Morning brief generated successfully
- GBP audit completed
- **AI functional test**: Customer sent "Hi, do you do keratin treatments?" — agent correctly identified the service and answered with the 500 AED price
- All system components verified end-to-end (crawl → persona → brain → WhatsApp reply)

### Outcome

Validates that the April 7-11 fixes (Arabic slug fallback, plan constraint, crawl_data JSONB, Arabic language routing) all hold under a realistic Saudi onboarding scenario.

---

## 40. Vercel Deployment Architecture

The client dashboard is deployed on Vercel with Git-integrated CI/CD.

### Project Configuration

| Field | Value |
|-------|-------|
| Project name | `project-agent` |
| Vercel team | `team_n9foqD6MY7lXXaMnZUEaFpiQ` |
| Project ID | `prj_f93jXwgoVYGAGnVafMZJKxQBkxnc` |
| Framework | Next.js |
| Root directory | `apps/client-dashboard` |
| Production URL | https://agents.dcp.sa (custom domain, verified) |
| Aliases | `project-agent-chi.vercel.app`, `project-agent-dc11.vercel.app` |

### CI/CD

- Git integration: deploys automatically on push to `main` branch
- Preview deployments on every non-main branch push

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

*Document generated April 5, 2026. Updated April 11, 2026 with Voice Notes (WhatsApp In & Out), Smart Language Routing, Arabic Dialect Rules, Production Fixes & Bug Corrections, Bloom Salon Onboarding Simulation, and Vercel Deployment Architecture. Previous updates: Owner Brain v2, Karpathy Loop v2, Agency-Agents research, Sales Rep, Content Engine, Morning Brief v3, Onboarding v2, Gamified Achievements, Intent Classification (SQOS), Content Learnings, Conversion Tracking, and Image Prompt Generator.*
