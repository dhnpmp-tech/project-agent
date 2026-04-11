# Universal AI Agent Onboarding System

**Date:** 2026-03-31
**Status:** Phase 1 deployed (Saffron Kitchen), Phase 2-3 planned

## Problem

Every new business client requires manual setup: writing a custom system prompt, configuring conversation flows, and hardcoding business-specific behavior into the n8n workflow. This doesn't scale.

## Solution: 3-Layer Architecture

### Layer 1: Enriched KB Schema (DEPLOYED)

The `business_knowledge` table in Supabase already holds per-client data. We enriched the `crawl_data` jsonb field with three new sections that drive all AI behavior:

```
crawl_data: {
  // Existing fields (industry, menu, specials, etc.)
  ...

  // NEW: Agent Personality
  agent_personality: {
    name: "Saffron",              // Agent's display name
    tone: "Warm, casual...",      // How it speaks
    language: "English",          // Primary language
    escalation: "If angry...",    // When to hand off to human
    never_say: ["I'm an AI"],    // Banned phrases
    always_do: ["Use name..."]   // Required behaviors
  },

  // NEW: Conversation Goals
  conversation_goals: {
    primary_goal: "Get customer to book/order",
    goal_sequence: [
      { step: 1, action: "Greet warmly..." },
      { step: 2, action: "Understand need..." },
      { step: 3, action: "Ask for details..." },
      { step: 4, action: "Suggest specials..." },
      { step: 5, action: "Confirm and close..." }
    ],
    fallback: "If not ready, leave them feeling good"
  },

  // NEW: Proactive Behaviors
  proactive_behaviors: [
    {
      trigger: "customer_is_returning",
      action: "Reference last visit...",
      priority: "high"
    },
    {
      trigger: "booking_without_time",
      action: "Ask what time...",
      priority: "high"
    },
    ...
  ]
}
```

**Supported triggers for proactive_behaviors:**
- `customer_is_returning` — Mem0 has memory for this phone number
- `first_time_customer` — No memory found
- `any_conversation` — Always fires (for specials, new items)
- `booking_without_time` — Customer wants to book but hasn't specified time
- `booking_without_occasion` — Booking without mentioning why
- `large_party` — 6+ guests
- `weekend_booking` — Friday/Saturday booking

### Layer 2: Generic Build Prompt (DEPLOYED)

The n8n Build Prompt node is now 100% data-driven. It reads:

1. `business_knowledge` fields (description, hours, FAQ, services, contact)
2. `crawl_data.agent_personality` → tone, name, rules
3. `crawl_data.conversation_goals` → goal sequence, primary goal
4. `crawl_data.proactive_behaviors` → filtered by context (returning vs new customer)
5. `crawl_data.menu_highlights` + `daily_specials` → product/service catalog
6. Mem0 memory → customer history, relations

**To onboard a new client:** Insert a row into `business_knowledge` with their data. The same n8n workflow handles everything.

### Layer 3: Automated Onboarding (PLANNED)

Two paths to collect business information:

#### Path A: WhatsApp Onboarding Bot
A separate n8n workflow where the business owner chats with an onboarding AI:

```
Business Owner WhatsApp → Onboarding Webhook → AI Interview → KB Generator → Supabase INSERT
```

The AI asks:
1. "What's your business name and type?" → `company_name`, `industry`
2. "Describe your business in a sentence" → `business_description`
3. "What are your hours?" → `business_hours`
4. "What do you sell/offer?" → `menu_highlights` or `services`
5. "What should the AI help customers do?" → `conversation_goals.primary_goal`
6. "Any specials or promotions right now?" → `daily_specials`
7. "How should the AI sound? Formal or casual?" → `agent_personality.tone`
8. "When should it hand off to a human?" → `agent_personality.escalation`

After the interview, the AI structures this into the KB schema and inserts it.

#### Path B: Web Dashboard Form
The Vercel dashboard at agents.dcp.sa gets an onboarding wizard:

1. Business details form (name, type, hours, contact)
2. Products/services editor (add items with prices)
3. AI behavior configurator (goals, proactive behaviors from templates)
4. Preview & test (send test message, see how AI responds)
5. Go live (connect WhatsApp number via Kapso)

#### Industry Templates

Pre-built KB templates for common business types:

| Industry | Primary Goal | Key Proactive Behaviors |
|----------|-------------|------------------------|
| Restaurant | Book a table | Ask time, occasion, suggest specials, mention terrace/view |
| Coffee/Retail | Take an order | Suggest pairings, mention new arrivals, offer delivery |
| Spa/Wellness | Book appointment | Ask preferred therapist, suggest packages, mention offers |
| Flower Shop | Take order + delivery | Ask occasion, suggest arrangements, confirm delivery time |
| Hotel | Book a room | Ask dates, party size, suggest upgrades, mention amenities |

Each template pre-fills `conversation_goals`, `proactive_behaviors`, and `agent_personality` with sensible defaults that the business owner can customize.

## Data Flow

```
[Business Owner]
      |
      v
[Onboarding (WhatsApp or Dashboard)]
      |
      v
[Supabase: business_knowledge + clients]
      |
      v
[n8n: Generic Webhook Workflow]
      |
      ├── Fetch KB (per client_id)
      ├── Fetch Memory (per customer phone, from Mem0)
      ├── Build Prompt (generic, reads KB + memory)
      ├── LLM (MiniMax or other)
      ├── Extract & Split Reply
      ├── Send via WhatsApp (Kapso)
      └── Update Memory (Mem0)
```

## Multi-Tenant Routing

Currently: one webhook URL for Saffron Kitchen (client_id hardcoded in Fetch KB).

**Next step:** The webhook payload from Kapso includes `phone_number_id`. Map this to a `client_id` via the `agent_deployments` table:

```
Webhook → Parse phone_number_id → Lookup client_id in agent_deployments → Fetch KB for that client
```

This makes the single n8n workflow serve ALL clients.

## Current Status

- [x] Layer 1: Enriched KB with goals/behaviors/personality (Saffron Kitchen live)
- [x] Layer 2: Generic Build Prompt deployed and tested
- [ ] Layer 3a: WhatsApp onboarding bot
- [ ] Layer 3b: Dashboard onboarding wizard
- [ ] Multi-tenant routing (phone_number_id → client_id)
- [ ] Industry templates (restaurant, coffee, spa, flowers, hotel)
- [ ] Client #2: Desert Bloom Coffee onboarding
