# AI Business Brain — Complete Architecture Spec

## What We Are Building

A self-improving AI brain that runs a business's customer relationships via WhatsApp. Each business gets a brain that:
- Remembers every customer forever
- Takes actions (orders, bookings, follow-ups)
- Learns which communication converts and which doesn't
- Proactively investigates — researches the business, the market, and the customers
- Feels human, not robotic
- Gets measurably better every day without human intervention

The brain connects to all other agents (Content, Sales, HR, Finance, Owner Brain) as the central intelligence layer.

---

## The Five Systems

### System 1: Memory (Zep + Mem0)

**Zep** handles conversation memory — the thread of every interaction.
**Mem0** handles relationship memory — the graph of facts, preferences, and connections.

Together they answer: "Who is this person, what have we discussed, what do they care about, and how do they connect to other customers and products?"

```
CUSTOMER TEXTS "hey"
         ↓
┌─ Zep returns ──────────────────────────────┐
│  Last 6 conversations (full threads)       │
│  Auto-summaries of older conversations     │
│  Entities mentioned: Ethiopian, Marina,    │
│  decaf inquiry                             │
│  Temporal: "Moved from Sharjah to Marina   │
│  in Feb 2026" (old address superseded)     │
└────────────────────────────────────────────┘
         +
┌─ Mem0 returns ─────────────────────────────┐
│  [Ahmad] --orders_every--> [14 days]       │
│  [Ahmad] --prefers--> [Ethiopian, Colombian]│
│  [Ahmad] --lives_in--> [Dubai Marina T5]   │
│  [Ahmad] --tried_once--> [Brazilian]       │
│  [Ahmad] --did_not_reorder--> [Brazilian]  │
│  [Ahmad] --asked_about--> [decaf]          │
│  [Ahmad] --referred_by--> [social media]   │
│  [Ahmad] --lifetime_value--> [AED 640]     │
│  [Ahmad] --sentiment--> [loyal, promoter]  │
└────────────────────────────────────────────┘
```

**Multi-tenant isolation:**
- Zep: session IDs prefixed with `{client_id}_{customer_phone}`
- Mem0: metadata filter `{"client_id": "desert-bloom-coffee"}`
- One instance of each, serving all businesses

### System 2: Intelligence (MiniMax M2.7 + Vault)

The LLM receives the full context from Zep + Mem0 + the business vault and reasons about:
1. What to say (response)
2. What to do (tool calls)
3. What to remember (memory updates)
4. What stage the customer is at (new → interested → qualified → buyer → repeat → advocate)

**The Vault** is an Obsidian-style collection of interconnected markdown notes stored in Supabase with pgvector embeddings. Each business has:

```
vault_notes table:
  id          | UUID
  client_id   | UUID (RLS filtered)
  path        | TEXT ("products/ethiopian.md")
  title       | TEXT ("Ethiopian Yirgacheffe")
  content     | TEXT (full markdown with [[links]])
  tags        | TEXT[] (["product", "coffee", "bestseller"])
  links_to    | UUID[] (IDs of linked notes)
  embedding   | vector(1536) (for semantic search)
  updated_at  | TIMESTAMPTZ
  updated_by  | TEXT ("agent" | "owner" | "system")
```

**Vault structure per business:**

```
business/         — about, hours, policies, team, personality
products/         — each product/service with pricing, description, popularity
customers/        — auto-generated profiles from Mem0 data
skills/           — learned behaviors (how to handle bulk orders, complaints, etc.)
learnings/        — what converts, weekly reviews, failed patterns
research/         — market research, competitor insights, customer demand signals
pending/          — follow-ups, questions for owner, unresolved issues
prompts/          — system prompt (current) + version history
evals/            — test conversations for the Karpathy Loop
```

### System 3: Actions (Composio)

The AI doesn't just talk — it does. Composio provides 500+ pre-built tool integrations. Each business gets a configured toolbox.

**Universal tools (every business):**
- Send WhatsApp reply (via Kapso)
- Send WhatsApp to owner (notifications)
- Schedule follow-up (internal timer)
- Update customer stage
- Create vault note
- Search vault (semantic)
- Web search (Google, for live information)

**Business-type tools:**

| Business Type | Tools |
|---------------|-------|
| Product/E-commerce | Google Sheets (orders), Stripe (payment links), inventory check |
| Restaurant | SevenRooms (reservations), menu management, kitchen alerts |
| Services/Booking | Google Calendar, Outlook, Calendly, appointment management |
| Real Estate | CRM (HubSpot/Pipedrive), property database, lead scoring |
| General | Email (Resend), SMS, social media, Google Business |

**Tool calling flow:**
```
LLM receives message + context + tool definitions
LLM returns: {
  "response": "Great choice! 1x Ethiopian 500g — AED 80...",
  "tool_calls": [
    {"tool": "google_sheets.append_row", "params": {"sheet": "orders", ...}},
    {"tool": "whatsapp.send", "params": {"to": "owner", "text": "New order!"}},
    {"tool": "schedule_followup", "params": {"customer": "ahmad", "days": 14}}
  ],
  "memory_updates": [
    {"type": "fact", "content": "Ahmad ordered Ethiopian 500g"},
    {"type": "stage_change", "from": "new", "to": "buyer"}
  ]
}
```

### System 4: Research Engine (Proactive Intelligence)

This is the system that makes the AI genuinely smart about the business — not just answering questions, but actively investigating, learning, and advising.

**4A: Business Research (learns about the business)**

When a business is onboarded, the AI doesn't just passively accept information. It actively investigates:

```
ONBOARDING RESEARCH (runs once, then periodically)
┌────────────────────────────────────────────────┐
│                                                │
│  WEB CRAWL                                     │
│  - Website (if exists): products, prices,      │
│    team, hours, location, reviews              │
│  - Instagram: recent posts, engagement,        │
│    what content performs, follower count        │
│  - Google Business: reviews, rating, photos,   │
│    Q&A, popular times                          │
│  - TripAdvisor/Zomato (restaurants)            │
│  - Property Finder/Bayut (real estate)         │
│                                                │
│  OWNER INTERVIEWS (via WhatsApp, over days)    │
│  - "How do you make your coffee? What makes    │
│     it special vs others in Dubai?"            │
│  - "Who is your typical customer? Office       │
│     workers? Home brewers? Restaurants?"       │
│  - "What's your biggest challenge right now?"  │
│  - "What do customers complain about most?"    │
│  - "What's your best-selling product and why?" │
│  - "How do you source your beans? Any story    │
│     behind the origin?"                        │
│                                                │
│  The AI asks these questions naturally over     │
│  several conversations, not as a survey.       │
│  Each answer → vault update + Mem0 fact.       │
│                                                │
│  COMPETITIVE RESEARCH                          │
│  - Who else sells coffee in Dubai Marina?      │
│  - What are their prices?                      │
│  - What do their Google reviews say?           │
│  - What are they doing on Instagram?           │
│  → Store in vault/research/competitors.md      │
│                                                │
└────────────────────────────────────────────────┘
```

**4B: Customer Research (learns about the customers)**

```
CUSTOMER INTELLIGENCE (continuous)
┌────────────────────────────────────────────────┐
│                                                │
│  WHERE ARE CUSTOMERS COMING FROM?              │
│  - Track: "How did you hear about us?"         │
│    (ask naturally in first conversation)       │
│  - Instagram? Friend referral? Google?         │
│    Walk-in? WhatsApp forward?                  │
│  → vault/research/acquisition-channels.md      │
│                                                │
│  WHAT DO CUSTOMERS ACTUALLY WANT?              │
│  - Track every product inquiry                 │
│  - Track what people ask about that we         │
│    don't have (decaf, subscription, gift sets) │
│  - Track what objections come up (price,       │
│    delivery time, minimum order)               │
│  → vault/research/demand-signals.md            │
│                                                │
│  CUSTOMER SEGMENTATION (auto-discovered)       │
│  - The AI notices patterns across customers:   │
│    Segment A: "Office bulk buyers" — order     │
│    2kg+ monthly, price-sensitive, care about   │
│    delivery reliability                        │
│    Segment B: "Home enthusiasts" — order 500g  │
│    every 2 weeks, try new origins, care about  │
│    story and quality                           │
│    Segment C: "Gifters" — order around         │
│    holidays, want nice packaging, ask about    │
│    gift options                                │
│  → vault/research/customer-segments.md         │
│  → Each segment gets tailored communication    │
│                                                │
│  CHURN PREDICTION                              │
│  - Track order intervals per customer          │
│  - If Ahmad usually orders every 14 days and   │
│    it's been 20 days → proactive outreach      │
│  - If sentiment drops across conversations     │
│    → flag for owner attention                  │
│  → vault/research/churn-risk.md                │
│                                                │
└────────────────────────────────────────────────┘
```

**4C: Market Research (learns about the market)**

```
MARKET INTELLIGENCE (weekly)
┌────────────────────────────────────────────────┐
│                                                │
│  REVIEW MONITORING                             │
│  - Crawl Google Business reviews weekly        │
│  - Crawl competitor reviews                    │
│  - What are customers praising? Complaining?   │
│  - "Competitor X got 3 negative reviews about  │
│     delivery this week — opportunity to        │
│     emphasize our fast delivery"               │
│  → vault/research/market-intelligence.md       │
│                                                │
│  TREND DETECTION                               │
│  - "4 customers asked about cold brew this     │
│     month — this is trending in Dubai"         │
│  - "Subscription coffee boxes are growing —    │
│     3 competitors launched them"               │
│  - "Ramadan is in 2 weeks — expect gift        │
│     orders to spike, prepare inventory"        │
│  → vault/research/trends.md                    │
│                                                │
│  PRICE INTELLIGENCE                            │
│  - Track competitor pricing changes            │
│  - "Competitor Y raised Ethiopian from AED 42  │
│     to AED 48 — we're now cheaper at AED 45"  │
│  → vault/research/pricing-landscape.md         │
│                                                │
│  ALL RESEARCH → OWNER WEEKLY BRIEF             │
│  "Here's what I learned about your market      │
│   this week: [insights]. Here's what I         │
│   recommend: [actions]."                       │
│                                                │
└────────────────────────────────────────────────┘
```

### System 5: Self-Improvement (Karpathy Loop + Hermes-style Skills)

**5A: The Karpathy Loop (nightly prompt optimization)**

```
EVERY NIGHT AT 2 AM, PER BUSINESS:

INPUT:
  - Today's conversations (from Zep)
  - Outcomes tagged: ordered / booked / ghosted / complained
  - Current system prompt (from vault/prompts/system-prompt.md)
  - Current eval suite (from vault/evals/test-cases.json)

STEP 1: OUTCOME ANALYSIS
  LLM reviews conversations and tags outcomes:
  "12 conversations today. 8 converted (67%).
   2 ghosted after price mention. 1 complained about
   delivery. 1 asked about decaf (unknown product)."

STEP 2: PATTERN EXTRACTION
  "Conversations where I mentioned 'most popular' before
   listing products had 80% conversion. Conversations
   where I listed all products equally had 50%."

  "Arabic-language customers who got Arabic responses
   had 2x longer conversations than those who got English."

  "Customers who were asked 'same address?' (returning)
   converted in 1 message vs 3 for full address collection."

STEP 3: PROMPT MUTATION
  Current prompt snippet:
    "List products with prices when asked about menu."

  Proposed mutation:
    "Lead with the most popular product and its price.
     Mention it's the best-seller (social proof). Then
     briefly list alternatives. If customer speaks Arabic,
     respond in Arabic throughout."

STEP 4: EVAL
  Run mutated prompt against 20 test conversations.
  Pass rate: 95% (was 90%) → KEEP

  Git commit: "improvement: lead with bestseller,
  conversion pattern from Mar 30 data"

STEP 5: VAULT UPDATE
  vault/learnings/what-converts.md updated
  vault/learnings/weekly-review-w13.md created
  vault/prompts/system-prompt.md updated (version 14)
```

**5B: Skill Building (Hermes-style)**

```
WHEN THE AI HANDLES SOMETHING NEW:

Example: First time a customer asks for a bulk/wholesale order.
The AI figures it out (asks owner for pricing, creates custom
quote, handles negotiation).

AFTER SUCCESS:
  AI creates: vault/skills/handle-bulk-order.md

  ---
  name: Handle Bulk Order
  trigger: customer asks about bulk, wholesale, large quantity
  learned_from: conversation with Omar, Mar 28
  success_rate: 1/1
  ---

  ## Steps
  1. Confirm they want bulk (5kg+ or 10+ bags)
  2. Check vault for wholesale pricing
  3. If no wholesale pricing exists, ask owner via WhatsApp
  4. Quote: 2kg = AED 350 (12% discount), 5kg = AED 800 (20%)
  5. Offer free delivery for bulk
  6. Get delivery details + payment preference
  7. Confirm with owner before finalizing

  ## What worked
  - Mentioning per-cup cost ("that's about AED 3.50 per cup")
    made the price feel reasonable
  - Offering a sample of a different blend with bulk order
    led to future variety orders

NEXT TIME bulk order comes up → AI loads this skill
instead of figuring it out from scratch.

Skills accumulate. After 3 months, the AI has 30+ skills
covering every scenario the business encounters.
```

**5C: Cross-Business Learning**

```
PLATFORM-LEVEL INSIGHTS (monthly)

The self-improvement loop runs per business. But patterns
that work across businesses become PLATFORM SKILLS:

"Across all restaurant clients:
 - Mentioning dietary accommodations proactively increases
   booking completion by 35%
 - Responding within 30 seconds doubles conversion
 - Saturday 6-8 PM has highest booking demand"

"Across all product businesses:
 - 'Most popular' framing outsells 'cheapest' 2:1
 - Offering 'same as last time?' to returning customers
   converts 85% of the time
 - Free delivery thresholds increase average order 40%"

These become default skills for NEW businesses:
vault/skills/_platform/restaurant-defaults/
vault/skills/_platform/ecommerce-defaults/
vault/skills/_platform/services-defaults/

New coffee shop gets the learnings from ALL coffee shops.
New restaurant gets the learnings from ALL restaurants.
The platform gets smarter with every business added.
```

---

## Why Multi-Agent Matters — Two Business Cases

**Case 1: Any business doing outbound (retention + upsell machine)**

The Sales Agent doing proactive outreach — reorder reminders, bulk buyer offers, lapsed customer win-back — requires the Financial Agent's data to know WHO to target and the WhatsApp Agent's memory to know HOW to approach them. None of those agents work at full value in isolation. Together they run a complete retention and upsell machine:

- Financial Agent: "Ahmad's LTV is AED 640, orders every 14 days, last order was 16 days ago"
- WhatsApp Agent memory: "Ahmad likes Ethiopian, tried Colombian, open to suggestions, casual tone"
- Sales Agent combines both: sends a personalized reorder nudge in the right tone, mentioning the right product, at the right time

Single agent can't do this. It requires shared intelligence.

**Case 2: Any business with a content/social presence**

Content Engine fed by real sales data — what actually sold, what customers actually asked about — produces content that performs. Content Engine working from a content calendar someone made up produces generic posts. The intelligence layer is what separates them:

- WhatsApp Agent: "5 customers asked about cold brew this week"
- Financial Agent: "Ethiopian outsells everything 3:1"
- Content Engine combines both: creates an Instagram post about Ethiopian being the bestseller, mentions cold brew is coming soon

The content is grounded in real business data, not guesswork. That only exists because WhatsApp Agent and Financial Agent feed the shared brain.

---

## How The Brain Connects To Other Agents

The brain is the central intelligence. Every other agent reads from it and writes to it.

```
                    ┌──────────────┐
                    │  THE BRAIN   │
                    │              │
                    │  Vault       │
                    │  Mem0        │
                    │  Zep         │
                    │  Composio    │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐ ┌────────────┐ ┌──────────────┐
   │  WhatsApp   │ │  Owner     │ │  Content     │
   │  Agent      │ │  Brain     │ │  Engine      │
   │             │ │            │ │              │
   │  Talks to   │ │  Talks to  │ │  Posts to    │
   │  customers  │ │  owner     │ │  social      │
   │             │ │  Reports   │ │  media       │
   │  READS:     │ │  READS:    │ │  READS:      │
   │  customer   │ │  all vault │ │  products,   │
   │  memory,    │ │  data,     │ │  customer    │
   │  products,  │ │  analytics,│ │  favorites,  │
   │  skills,    │ │  pending   │ │  trending    │
   │  learnings  │ │  questions │ │  topics      │
   │             │ │            │ │              │
   │  WRITES:    │ │  WRITES:   │ │  WRITES:     │
   │  customer   │ │  owner     │ │  content     │
   │  facts,     │ │  decisions,│ │  performance │
   │  orders,    │ │  policy    │ │  metrics     │
   │  outcomes   │ │  changes   │ │              │
   └─────────────┘ └────────────┘ └──────────────┘
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐ ┌────────────┐ ┌──────────────┐
   │  Sales      │ │  HR        │ │  Financial   │
   │  Agent      │ │  Agent     │ │  Agent       │
   │             │ │            │ │              │
   │  Qualifies  │ │  Screens   │ │  Tracks      │
   │  leads,     │ │  CVs,      │ │  revenue,    │
   │  outreach,  │ │  schedules │ │  anomalies,  │
   │  follow-up  │ │  interviews│ │  forecasts   │
   │             │ │            │ │              │
   │  READS:     │ │  READS:    │ │  READS:      │
   │  lead       │ │  hiring    │ │  order       │
   │  scores,    │ │  criteria, │ │  history,    │
   │  customer   │ │  calendar  │ │  customer    │
   │  segments   │ │  slots     │ │  LTV         │
   │             │ │            │ │              │
   │  WRITES:    │ │  WRITES:   │ │  WRITES:     │
   │  qualified  │ │  candidate │ │  financial   │
   │  leads,     │ │  scores,   │ │  reports,    │
   │  pipeline   │ │  interview │ │  alerts      │
   │  updates    │ │  results   │ │              │
   └─────────────┘ └────────────┘ └──────────────┘
```

**Example cross-agent flow:**

```
1. WhatsApp Agent takes an order for AED 160
   → Writes to Brain: order logged, customer = repeat buyer

2. Financial Agent reads the order
   → Updates: daily revenue AED 980 → AED 1,140
   → Notices: Ahmad's LTV crossed AED 500 → flags as VIP

3. Owner Brain reads the VIP flag
   → Sends morning brief: "Ahmad is now a VIP customer
      (AED 640 lifetime). Consider offering him a loyalty
      discount or first access to new products."

4. Content Engine reads the product performance data
   → Sees Ethiopian outsells everything 3:1
   → Creates Instagram post: "Our Ethiopian Yirgacheffe —
      Dubai's favorite. There's a reason it outsells
      everything else 3 to 1."
   → Sends to owner for approval

5. Sales Agent reads customer segments
   → Identifies "Office bulk buyer" segment (5 customers)
   → Drafts outreach: "Running low on office coffee?
      We do bulk at 20% off for orders over 2kg."
   → Schedules for Monday morning (highest open rate)

All agents share the same brain. No data silos.
```

### Agent Coordination Protocol

The architecture assumes all agents share the same vault. But sharing data is not the same as coordinating actions. When 6 agents are live, collisions happen:

- Sales Agent wants to send a reorder nudge to Ahmad while WhatsApp Agent is mid-conversation with him
- Content Engine drafts an Instagram post about a product that Financial Agent flagged as out of stock
- Owner Brain sends a morning brief at the same time HR Agent sends an interview notification
- Two agents both try to update the same customer's vault note simultaneously

**The solution: a coordination layer with three mechanisms.**

**Mechanism 1: Customer Locks (prevents message collisions)**

```
Supabase table: customer_locks

  customer_phone  | TEXT (unique per client)
  client_id       | UUID
  locked_by       | TEXT ("whatsapp_agent" | "sales_agent" | ...)
  locked_at       | TIMESTAMPTZ
  expires_at      | TIMESTAMPTZ (auto-expire after 30 min)
  conversation_id | TEXT (Zep session ID, if active)

Rules:
  - Before any agent sends a message to a customer, it checks for a lock
  - If WhatsApp Agent is mid-conversation → lock exists → Sales Agent queues its message
  - Locks auto-expire after 30 minutes of inactivity
  - WhatsApp Agent (inbound) ALWAYS wins priority — customer initiated, respond immediately
  - Outbound agents (Sales, Proactive) defer to active conversations

Priority order:
  1. WhatsApp Agent (customer-initiated — highest)
  2. Owner Brain (owner-initiated)
  3. Sales Agent (proactive outreach)
  4. Content Engine (never sends to customers directly)
  5. HR Agent (candidate communication)
  6. Financial Agent (never sends to customers directly)
```

**Mechanism 2: Action Queue (prevents conflicting actions)**

```
Supabase table: agent_action_queue

  id              | UUID
  client_id       | UUID
  agent           | TEXT ("content_engine" | "sales_agent" | ...)
  action_type     | TEXT ("send_message" | "create_post" | "update_vault" | ...)
  target          | TEXT (customer phone, or "instagram", or vault note path)
  payload         | JSONB (the action details)
  status          | TEXT ("pending" | "approved" | "blocked" | "executed")
  blocked_reason  | TEXT (why it was blocked, if applicable)
  created_at      | TIMESTAMPTZ
  executed_at     | TIMESTAMPTZ

Rules:
  - Content Engine submits posts to queue → checked against Financial Agent's
    inventory data before publishing (no promoting out-of-stock items)
  - Sales Agent submits outreach to queue → checked against customer_locks
    and recent conversation history (no spamming)
  - Any action that affects a customer who was contacted in the last 24h
    gets a cooldown flag — the coordinator batches or defers it
```

**Mechanism 3: Vault Write Coordination (prevents data conflicts)**

```
Rules for vault note writes:
  - Each vault note has an updated_by field and updated_at timestamp
  - Agents append to notes, they don't overwrite (additive only)
  - Customer notes use a structured format:
    ## Facts (Mem0 writes here)
    ## Conversation Log (Zep writes here)
    ## Sales Notes (Sales Agent writes here)
    ## Orders (Financial Agent writes here)
  - Each section is "owned" by one agent — other agents read but don't write
  - The nightly self-improvement loop is the only process that rewrites
    the full note (consolidation pass)
```

**When to build this:** Before Phase 7 (cross-agent integration), not after. The coordination tables should be created in Phase 6, tested with WhatsApp Agent + Sales Agent (the most common collision), then extended to all agents in Phase 7.

---

## Storage Architecture

### One Supabase Project — All Clients

```sql
-- Core tables (RLS on client_id)
clients                 -- business accounts
vault_notes             -- the brain (markdown + embeddings)
orders                  -- all orders/bookings across all businesses
outcome_tracking        -- tagged conversation outcomes
eval_suites             -- per-business test cases for Karpathy Loop
prompt_versions         -- git-style system prompt history
composio_configs        -- per-business tool configurations
scheduled_actions       -- follow-ups, reminders, proactive outreach
research_queue          -- pending research tasks

-- Auth
users                   -- business owners (Supabase Auth)

-- RLS policy (every table)
CREATE POLICY "tenant_isolation" ON vault_notes
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
```

### Zep (Self-Hosted Docker)

```
Sessions: {client_id}_{customer_phone}
  └── Messages (full thread, auto-summarized)
  └── Entities (extracted people, products, places)
  └── Facts (temporal, deduped)
```

### Mem0 (Self-Hosted Docker)

```
Memories per user_id (customer phone), filtered by client_id metadata
  └── Facts: "prefers Ethiopian"
  └── Relationships: [customer] --ordered--> [product]
  └── Graph traversal: "customers who like X also like Y"
```

### pgvector Embeddings (in Supabase)

```sql
-- Semantic search across vault notes
CREATE INDEX ON vault_notes USING hnsw (embedding vector_cosine_ops);

-- Search function
SELECT title, content, 1 - (embedding <=> query_embedding) as similarity
FROM vault_notes
WHERE client_id = $1
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

---

## Infrastructure

```
VPS (Hostinger — already running)
├── n8n (webhook routing + cron jobs)
├── Zep (conversation memory — Docker)
├── Mem0 (relationship memory — Docker)
├── Composio (tool execution — Docker)
├── Redis (short-term cache)
└── Traefik (reverse proxy + SSL)

Supabase Cloud (one project, Pro plan)
├── PostgreSQL + pgvector
├── Auth + RLS
├── Realtime (dashboard)
└── Storage (uploaded files)

Kapso (WhatsApp API)
└── Multi-tenant, one project, multiple numbers

External APIs
├── MiniMax M2.7 (LLM — conversations + analysis)
├── OpenAI text-embedding-3-small (embeddings)
├── Firecrawl (web crawling for research)
└── Google APIs (search, maps, calendar)
```

**Monthly cost:**

| Component | Cost |
|-----------|------|
| Supabase Pro | $25 |
| MiniMax M2.7 (~10K conversations) | $15 |
| OpenAI embeddings | $2 |
| Karpathy Loop (nightly) | $5 |
| Firecrawl (research crawling) | $10 |
| Zep, Mem0, Composio, n8n (self-hosted) | $0 |
| VPS (already running) | $0 |
| **Total** | **~$57/mo** |
| **Per-business marginal cost** | **~$2/mo** (LLM usage only) |

---

## Implementation Roadmap (Chronological)

### Phase 0: Foundation — Get the brain schema right

What happens:
- Design and create the Supabase vault_notes table with pgvector
- Design outcome_tracking, scheduled_actions, research_queue tables
- Set up RLS policies for multi-tenant isolation
- Deploy Zep on the VPS (Docker)
- Deploy Mem0 on the VPS (Docker)
- Test: store a conversation in Zep, extract facts to Mem0, write a vault note, search with pgvector

Depends on: nothing (start here)

### Phase 1: Stateful WhatsApp Agent — Make it remember

What happens:
- Rebuild the n8n webhook handler to use Zep + Mem0 instead of raw Supabase
- On each message: retrieve conversation history from Zep, facts from Mem0, business knowledge from vault
- Pass full context to MiniMax M2.7
- After each conversation turn: store in Zep, extract facts to Mem0, update vault note for customer
- Test with Saffron Kitchen: have a multi-turn conversation, close WhatsApp, come back hours later — AI remembers everything

Depends on: Phase 0

### Phase 2: Actions — Make it do things

What happens:
- Deploy Composio on the VPS (Docker)
- Define universal tool set (WhatsApp reply, owner notification, schedule follow-up, web search)
- Add tool definitions to the LLM prompt so MiniMax can request tool calls
- Build the tool execution layer: LLM returns tool calls → n8n executes via Composio
- Test with coffee business: customer orders → AI creates order in Google Sheets, notifies owner, schedules follow-up

Depends on: Phase 1

### Phase 3: Onboarding — Teach the AI about a business

What happens:
- Build the conversational onboarding flow (WhatsApp-based)
- AI asks questions, accepts photos/PDFs/voice, builds the vault
- Integrate Firecrawl for website + Instagram + Google Business crawling
- Build the owner interview system (asks about the secret sauce, typical customer, challenges)
- Test: onboard the coffee business from scratch via WhatsApp only

Depends on: Phase 1 + Phase 2

### Phase 4: Research Engine — Make it investigate

What happens:
- Build the business research workflow (competitive analysis, review monitoring, price tracking)
- Build customer research tracking (acquisition channels, demand signals, segmentation)
- Build the weekly market intelligence report
- Store all research in vault/research/ notes
- Owner gets weekly insight brief via WhatsApp

Depends on: Phase 3

### Phase 5: Self-Improvement — The Karpathy Loop

What happens:
- Build the outcome tagging system (after each conversation, tag: ordered/booked/ghosted/complained)
- Build the nightly analysis cron (pattern extraction from today's conversations)
- Implement the Karpathy Loop: mutate system prompt → eval against test suite → keep or revert
- Build the skill creation system (Hermes-style: formalize successful new behaviors into skill files)
- Test: run for 2 weeks, measure if conversion rate improves

Depends on: Phase 4

### Phase 6: Proactive Engine — Make it take initiative

What happens:
- Build the follow-up scheduler (checks pending actions every hour)
- Build the reorder prediction (tracks customer order intervals, proactive outreach)
- Build the churn detection (sentiment drops, longer gaps between contacts)
- Build the upsell/cross-sell engine (based on customer segments and product affinities)
- Test: AI proactively texts Ahmad when he's due for reorder

Depends on: Phase 5

### Phase 7: Cross-Agent Integration — Connect the brain to all agents

What happens:
- Owner Brain reads from the vault, sends morning briefs, accepts owner commands
- Content Engine reads product performance + customer favorites, creates social content
- Sales Agent reads customer segments + lead scores, does outbound qualification
- HR Agent reads from shared calendar, screens candidates
- Financial Agent reads order history, generates revenue reports
- All agents write back to the vault — shared intelligence

Depends on: Phase 6

### Phase 8: Cross-Business Learning — Platform intelligence

What happens:
- Build the platform-level pattern extraction (what works across ALL restaurants, ALL coffee shops)
- Create platform skill templates (default skills for new businesses by industry)
- New businesses get a head start — learnings from every business before them
- Build the industry benchmark system ("your conversion rate is 67% vs industry average 55%")

Depends on: Phase 7

### Phase 9: Dashboard + Admin — Make it manageable

What happens:
- Rebuild the client dashboard to show vault data, conversation analytics, agent performance
- Build admin dashboard (all clients, system health, revenue, platform metrics)
- Add payment gate (Stripe) between onboarding and activation
- Build the plan enforcement layer (Starter: 1 agent, Professional: 5 agents, Enterprise: unlimited)

Depends on: Phase 7

### Phase 10: Scale — Multi-business production

What happens:
- Load test with 50+ simulated businesses
- Optimize Supabase queries (index tuning, connection pooling)
- Add monitoring (error rates, response times, conversion tracking)
- Set up automated backups for Zep + Mem0 data
- Document the full system for team onboarding
- Launch

Depends on: Phase 9

---

## What Success Looks Like

**Month 1 (after Phase 3):** Coffee business is live. AI takes orders, remembers customers, notifies owner. Owner manages everything via WhatsApp.

**Month 2 (after Phase 5):** AI has run 30+ self-improvement cycles. Conversion rate improved measurably. AI has 15+ skills it built from experience.

**Month 3 (after Phase 7):** All 6 agents work together. Owner gets morning briefs with insights. Content Engine creates posts based on what sells. Sales Agent follows up with cold leads.

**Month 6 (after Phase 8):** 10+ businesses on the platform. New businesses onboard in 10 minutes and immediately benefit from learnings of all previous businesses. The platform is measurably smarter than any individual business could be.

**The AI doesn't just answer questions. It runs the business.**
