# The AI Business Brain — Full System Report

**Date:** March 31, 2026
**Author:** Peter Putz & Claude
**Status:** Phase 0-1 operational, Phase 2+ in design

---

## Part 1: What We've Built (Last 72 Hours)

### The Foundation

We stood up a complete AI-powered WhatsApp agent infrastructure in three days. The system takes a customer message on WhatsApp, runs it through a pipeline of memory retrieval, knowledge base lookup, LLM reasoning, and multi-message delivery — then stores new facts about the customer for next time.

**Infrastructure deployed:**

| Component | What It Does | Where It Runs |
|-----------|-------------|---------------|
| n8n | Workflow orchestration — webhook routing, API calls, data transformation | VPS (Docker) at n8n.dcp.sa |
| MiniMax M2.7 | LLM — generates conversational responses | MiniMax cloud API |
| Mem0 | Long-term customer memory — facts, relationships, preferences | VPS (Docker) with pgvector + Neo4j |
| Ollama + nomic-embed-text | Local embeddings for Mem0 (free, no API costs) | VPS (bare metal) |
| Supabase | Structured data — clients, KB, vault, agent configs | Cloud (Tokyo region) |
| Kapso | WhatsApp Business API — sends/receives messages | Cloud |
| Vercel | Dashboard at agents.dcp.sa | Cloud |

### The WhatsApp Pipeline (Working)

```
Customer sends WhatsApp message
    → Kapso webhook → n8n
    → Parse (extract message, phone, contact name)
    → Fetch KB (business knowledge from Supabase)
    → Fetch Memory (customer history from Mem0)
    → Build Prompt (persona + KB + memory + goals → system prompt)
    → MiniMax M2.7 (generate response)
    → Extract & Split Reply (clean thinking tags, split into multiple messages)
    → Send Reply (multiple WhatsApp messages via Kapso with 1.5s delays)
    → Update Memory (store new facts in Mem0 for next conversation)
```

### Bugs We Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| AI says "I don't remember" | Mem0 memory fetched but not injected into prompt | Build Prompt now reads Fetch Memory node output |
| Memory shows "undefined undefined" | Code used `r.relation`/`r.destination`, Mem0 returns `r.relationship`/`r.target` | Fixed field names |
| MiniMax returns JSON error | Build Prompt output `customerMessage`, MiniMax referenced `userMessage` | Aligned field names across all nodes |
| Single long message instead of multiple | AI ignores `\|\|\|` delimiter instruction | Programmatic sentence/paragraph splitting in Extract Reply |
| n8n ignores DB updates | n8n caches published workflow versions in memory | Full export → modify → import → publish → restart cycle |
| contactName/phoneNumberId lost | Build Prompt didn't pass them downstream | Added to output object |

### The Persona System (Breakthrough)

The biggest innovation: instead of rules-based AI behavior ("be warm," "say happy birthday"), we give each agent a **full human identity**. A persona with a backstory, education, career history, personality quirks, and — critically — example WhatsApp messages that capture their voice.

**Before (rules-based):**
> "Be warm and friendly. Ask about special occasions. Mention specials naturally."

AI response: "Happy Birthday! Would you like to try our specials today?"

**After (persona-driven):**
> Nadia Khoury, 34, Lebanese. Grew up in Achrafieh dusted in flour from the family bakery. Teta Hanan's Sunday cooking taught her food makes people stay. Engaged to Tarek. Cried at a proposal she set up. "Habibi!! 🎂 HAPPY BIRTHDAY!!"

AI response: "Habibi!! 🎂 HAPPY BIRTHDAY!! 🎉 Tables for 2 on the terrace are going fast tonight — let me lock that in for you! Is your wife joining you?"

The persona approach produces emergent behavior — the AI handles situations we never explicitly programmed because it's channeling a real person, not following a checklist.

### The Persona Generator (Automated)

A Python script that takes business info and generates a complete identity package:

1. **Voice Prompt** (~10,000 chars) — First-person narrative: backstory, education, career, relationships, quirks, example messages
2. **Visual Description** — Physical appearance details for image generation
3. **Headshots** (2) — Professional profile photos via MiniMax image-01
4. **Lifestyle Photos** (4) — Activity/hobby shots using subject reference for face consistency

**Cost per persona: ~$0.04.** Under 5 minutes end-to-end.

### What's Live Right Now

- **Saffron Kitchen** (restaurant, Dubai Marina) — Nadia Khoury persona, WhatsApp active, memory working, multi-message working, proactive behaviors active
- **Desert Bloom Coffee** (coffee roastery, Al Quoz) — Mariam Al-Qasimi persona generated, photos generated, ready for deployment

---

## Part 2: The Universal Agent Architecture

### How Any Business Gets an AI Agent

```
Business Owner provides info (8-10 questions)
    → Persona Generator creates identity + photos
    → KB populated in Supabase (business info + persona + goals + behaviors)
    → WhatsApp number connected via Kapso
    → Same n8n workflow handles ALL clients (multi-tenant routing)
    → Agent is live
```

### The KB Schema (Per Client)

Every client has one row in `business_knowledge` with:

| Section | What It Controls |
|---------|-----------------|
| `business_description`, `business_hours`, `contact_info` | Basic business facts |
| `services`, `faq` | What they offer, common questions |
| `crawl_data.menu_highlights`, `daily_specials` | Products/services catalog |
| `crawl_data.persona.voice_prompt` | WHO the AI is — the soul |
| `crawl_data.conversation_goals` | WHAT the AI drives toward (book, order, schedule) |
| `crawl_data.proactive_behaviors` | WHEN to suggest things (returning customer, birthday, etc.) |
| `crawl_data.agent_personality` | Fallback rules if no persona exists |

### Multi-Tenant Routing (Next Step)

Currently the webhook is hardcoded to Saffron's client_id. The fix:

```
Webhook payload includes phone_number_id (from Kapso)
    → Lookup agent_deployments table: phone_number_id → client_id
    → Fetch KB for that client_id
    → Everything else is the same
```

One n8n workflow. Unlimited clients.

---

## Part 3: The 10-Phase Roadmap

### Phase 0: Foundation ✅ COMPLETE
- VPS infrastructure (n8n, Postgres, Redis, Mem0, Ollama)
- Supabase schema (17 tables)
- Kapso WhatsApp integration
- Basic webhook pipeline

### Phase 1: Stateful Agent ✅ COMPLETE
- Mem0 memory integration (facts + relationships)
- Persona-driven conversations
- Multi-message WhatsApp delivery
- Proactive behaviors (time, occasions, specials)
- Automated persona + photo generation
- Universal KB schema

### Phase 2: Multi-Tenant Platform (Next)
- Phone number → client routing
- Client onboarding wizard (dashboard)
- WhatsApp onboarding bot (AI interviews business owner)
- Industry templates (restaurant, coffee, spa, flowers, hotel)
- Desert Bloom Coffee goes live as second client

### Phase 3: Conversation Intelligence
- Outcome tracking (did the conversation lead to a booking/order?)
- Conversation summaries stored in vault
- Customer sentiment analysis
- Handoff to human when AI detects frustration or complex requests
- Notification to business owner on bookings/complaints

### Phase 4: The Karpathy Loop (Self-Improvement)
- Prompt version tracking (which system prompt performs best?)
- Eval suites (test conversations with expected outcomes)
- A/B testing of personas and prompt strategies
- Automated prompt refinement based on outcome data
- The AI gets better at its job over time without human intervention

### Phase 5: Proactive Outreach
- Scheduled follow-ups ("How was your dinner last night?")
- Re-engagement for lapsed customers ("We haven't seen you in a while!")
- Birthday/anniversary reminders from Mem0 data
- New product announcements to interested customers
- Campaign manager in the dashboard

### Phase 6: Multi-Channel Expansion
- Instagram DMs (via Kapso or direct API)
- Google Business Messages
- Website live chat widget
- SMS for markets without WhatsApp
- Email follow-ups for formal communications
- Voice calls via Twilio for high-value interactions
- Unified conversation history across all channels

### Phase 7: Deep Business Integration
- POS integration (Square, Lightspeed, Toast) — real-time menu/inventory sync
- Calendar integration (Google Calendar, Calendly) — real booking creation
- Payment processing — take deposits and payments in-chat
- CRM sync (HubSpot, Salesforce) — customer data bidirectional
- Inventory awareness ("Sorry, the Wagyu Kebab sold out tonight — can I suggest the lamb chops?")
- Dynamic pricing and availability

### Phase 8: The Composio Layer
- 500+ tool integrations via Composio
- Agents can Google things, check weather, look up directions
- Cross-service orchestration: "Book a table AND send a calendar invite AND order an Uber to the restaurant"
- The agent becomes a true assistant, not just a responder

### Phase 9: Agent Marketplace
- Business owners browse and customize pre-built agent templates
- Community-contributed persona styles
- Industry-specific behavior packs
- White-label: agencies resell the platform to their clients
- Revenue share model

### Phase 10: Autonomous Business Operations
- Agents manage inventory reordering
- Agents handle staff scheduling conflicts
- Agents generate marketing content from conversation insights
- Agents identify business trends ("Terrace bookings are up 40% — consider extending terrace hours")
- The Owner Brain Agent synthesizes insights across all client agents
- Financial Intelligence Agent tracks revenue impact of AI conversations

---

## Part 4: The Vision — When All Agents Are Fully Built

### What the World Looks Like

Imagine a flower shop in Abu Dhabi. The owner, Fatima, spent 20 minutes answering questions on WhatsApp about her business. From those answers, the system generated "Layla" — a 45-year-old Jordanian florist who studied botanical design at the Royal Horticultural Society in London, whose mother grew jasmine in their Amman courtyard, who cries at every wedding she does arrangements for, and who texts customers things like "Habibti, the peonies just arrived and they're SCREAMING your name 🌸 Want me to save you a bunch?"

Layla has a face. A profile picture. Instagram-ready lifestyle photos of her arranging flowers in the shop, visiting the Dubai Flower Centre at 5am, drinking coffee in her garden. Customers think they're texting a real person. They build a relationship with her. They come back because of her.

Behind the scenes:
- Layla remembers every customer's preferred flowers, occasions, allergies
- She proactively messages customers before Mother's Day, Valentine's, Eid
- She notices a customer hasn't ordered in 3 months and reaches out
- She takes orders, processes payments, schedules delivery — all in WhatsApp
- She flags quality issues to Fatima when customers complain
- She suggests Fatima stock more sunflowers because 15 customers asked this month
- She writes her own Instagram captions based on today's arrangements
- She improves her own conversation style based on which approaches lead to more orders

Now multiply that by every business type:

**The Coffee Roastery Agent** knows which customers prefer light vs dark roast, texts them when their favorite single-origin comes back in stock, manages subscription renewals, and recommends new beans based on their taste history. She sends a voice note enthusiasm about a new Yemeni lot that just arrived.

**The Spa Agent** remembers every customer's preferred therapist, treatment history, and pressure preferences. She knows that Sarah gets migraines and always books the quiet room. She suggests seasonal packages. She follows up the morning after a treatment to ask how they feel.

**The Restaurant Agent** knows that the Patel family always sits at the corner terrace table, that the Thursday finance crowd from DIFC orders three Mixed Grill Platters, and that the anniversary couple always shares kunafa. She's already prepped a birthday surprise before the wife even calls.

**The Hotel Agent** remembers that Mr. Chen travels for work every second Tuesday, prefers a high floor, and always asks for extra pillows. She pre-books his usual room when she sees the pattern. She suggests a spa package because she noticed he always arrives stressed.

### The Network Effect

When agents across businesses share anonymized patterns (with permission):
- "Customers who book tables at Lebanese restaurants on Thursdays also order flowers on Friday" → Cross-promote
- "Cold brew demand spikes 200% when Dubai temperature exceeds 38°C" → Auto-stock
- "Spa bookings increase 40% after negative restaurant reviews" → Stress correlation
- "Wedding florists and event venues see correlated booking patterns" → Partnership suggestions

The agents don't just serve individual businesses — they understand the city.

### The Creator Economy for Personas

Persona designers become a thing. Someone who's great at writing character backgrounds creates premium persona packs:
- "The Luxury Concierge" pack — for 5-star hotels and fine dining
- "The Neighborhood Friend" pack — for local cafés and boutiques
- "The Expert Advisor" pack — for medical, legal, financial services
- "The Cultural Bridge" pack — multilingual personas for tourist-heavy businesses

Each pack comes with pre-written voice prompts, photo sets, industry-specific conversation goals, and tested proactive behaviors.

### The Data Flywheel

Every conversation makes the system smarter:
1. Customer talks to AI → conversation stored
2. Outcome tracked (did they book/buy/return?)
3. Karpathy Loop evaluates → which prompt versions work best?
4. Persona refined automatically → better conversations
5. Better conversations → more bookings → more data → smarter AI

This isn't a linear improvement — it's exponential. Each client's learnings improve every other client in the same industry.

### Revenue Model

This is a premium consultative sale, not a SaaS subscription. Each client gets a bespoke AI workforce.

**Setup Fee: AED 3,000+ (one-time)**
- Business analysis and strategy session
- Persona creation (AI-generated identity + photos)
- Knowledge base build-out
- Tool integrations via Composio (POS, calendar, CRM)
- WhatsApp number provisioning
- Testing and go-live

**Monthly Retainer: AED 1,500-2,000 (starting)**
- 5-10 AI agents working together per client
- Ongoing memory and knowledge base updates
- Prompt optimization (Karpathy Loop)
- New persona/behavior adjustments
- Priority support

**Full Suite: AED 4,000-8,000/month (at scale)**
- All agents fully active (WhatsApp, Sales, Content, Financial, HR, Owner Brain)
- Multi-channel (WhatsApp + Instagram + Google Business)
- Proactive outreach campaigns
- Business intelligence reporting
- Deep integrations (POS, payments, inventory)

**Unit Economics:**
Each WhatsApp message costs ~AED 0.004 to serve (MiniMax M2.7). A client doing 2,000 messages/month costs ~AED 8 in AI compute. Even at 10,000 messages/month across all agents, the direct AI cost is ~AED 40. The margins are enormous.

---

## Part 4B: The Technical Synergy — How Everything Connects

### The Six Agents

Each client gets up to six AI agents that work together as a team:

| Agent | Role | Trigger | Model |
|-------|------|---------|-------|
| **WhatsApp Intelligence** | Customer-facing — answers questions, books tables, handles complaints | Inbound WhatsApp message | MiniMax M2.7 (persona-driven) |
| **AI SDR** | Scores inbound leads, writes personalized outreach | New lead webhook (form, CRM) | Claude Sonnet (scoring + writing) |
| **Content Engine** | Generates weekly social media content across platforms | Weekly cron (Monday 6 AM) | Claude Sonnet (research + writing) |
| **Financial Intelligence** | Categorizes transactions, generates P&L reports, detects anomalies | Weekly cron (Sunday 6 AM) | Claude Haiku (categorization) + Sonnet (reporting) |
| **HR Screening** | Parses CVs, scores candidates against job criteria, sends responses | Application webhook | OpenRouter Nemotron 30B free (parsing) + Nemotron 120B free (scoring) |
| **Owner Brain** | Chief of Staff — daily briefs, event alerts, knowledge base updates | Owner WhatsApp + events from other agents | MiniMax M2.7 |

**Model Routing Strategy:** Customer-facing agents (WhatsApp, Owner Brain) use MiniMax M2.7 on the $80/mo plan for quality. All backend agents use OpenRouter's free models (Qwen 3.6 Plus, Nemotron 120B, Nemotron 30B) for zero marginal cost.

These are not six isolated bots. They share data through Supabase and Mem0, and the Owner Brain acts as the orchestration layer — the CEO's AI chief of staff.

### The Memory Stack: Mem0 + Graphiti + Supabase Vault

Three layers of memory give the system something no single chatbot has: **temporal understanding**.

**Layer 1: Mem0 (Fact Memory)**
Stores discrete facts and relationships about every customer. "Customer X prefers the terrace." "Customer Y is allergic to nuts." "Customer Z booked a table for 2 last Thursday." These facts persist forever and are retrieved by phone number on every conversation.

**Layer 2: Graphiti / Zep (Temporal Knowledge Graph)**
This is the layer that makes the system genuinely intelligent. Graphiti doesn't just store facts — it stores facts **in time** with relationships between entities.

A traditional chatbot knows: "Customer likes lamb chops."
Graphiti knows: "Customer ordered lamb chops three times in January, switched to fish in February after mentioning a diet change, but ordered lamb again on their birthday in March — suggesting lamb is their comfort food, not their everyday choice."

The graph structure looks like:

```
[Customer: Ahmed] --ordered--> [Dish: Lamb Chops] --on--> [Date: Jan 5]
[Customer: Ahmed] --ordered--> [Dish: Lamb Chops] --on--> [Date: Jan 19]
[Customer: Ahmed] --mentioned--> [Goal: Diet Change] --on--> [Date: Feb 2]
[Customer: Ahmed] --ordered--> [Dish: Grilled Hammour] --on--> [Date: Feb 8]
[Customer: Ahmed] --celebrated--> [Event: Birthday] --on--> [Date: Mar 15]
[Customer: Ahmed] --ordered--> [Dish: Lamb Chops] --on--> [Date: Mar 15]
```

The AI doesn't just recall "likes lamb." It understands the **story** — and can say: "I know you've been eating lighter lately, but it's your birthday... the lamb chops are calling, no? 😄"

**Layer 3: Supabase Vault (Structured Business Intelligence)**
Conversation summaries, outcome tracking (did the conversation lead to a booking?), prompt version history, eval suites. This is the data that feeds the Karpathy Loop.

**How all three layers work together on a single WhatsApp message:**

```
Customer sends: "Hey, what's good tonight?"

1. Mem0 retrieves: [returning customer, prefers terrace, wife has nut allergy,
   last visit was 3 weeks ago, ordered Mixed Grill Platter]

2. Graphiti retrieves: [visited 6 times in 3 months, average spend AED 350,
   frequency increasing, last 2 visits were date nights on Thursdays,
   mentioned anniversary coming up in their last conversation]

3. Supabase provides: [today's specials, current menu, terrace availability,
   conversation_goals: drive toward booking]

4. MiniMax M2.7 (as Nadia): "Hey! Great timing — the hammour is incredible
   tonight, straight off the boat this morning 🐟 By the way, isn't your
   anniversary coming up? Want me to set up something special on the terrace?"
```

The customer didn't mention the anniversary. The AI **remembered it from a passing comment three weeks ago** because Graphiti stored it as a temporal fact with a future date.

### Composio: 500+ Real-World Tool Connections

Composio turns the AI from a conversational agent into an **operational agent**. It doesn't just talk about booking — it creates the booking. It doesn't just promise a follow-up — it schedules one.

**What Composio connects (per business):**

| Category | Tools | What the AI Can Do |
|----------|-------|-------------------|
| Calendar | Google Calendar, Calendly, Cal.com | Create real bookings, check availability, send invites |
| POS / Orders | Square, Lightspeed, Toast, Shopify | Check inventory, process orders, apply discounts |
| Payments | Stripe, PayTabs, Tap Payments | Send payment links, process deposits, refund |
| CRM | HubSpot, Salesforce, Pipedrive | Create leads, update deal stages, log interactions |
| Email | Gmail, Outlook, Resend | Send confirmations, follow-ups, marketing campaigns |
| Social | Instagram, Facebook, Twitter/X | Post content, respond to DMs, schedule posts |
| Files | Google Drive, Notion, Airtable | Store documents, update databases, manage content calendars |
| Communication | Slack, Microsoft Teams, Telegram | Alert staff, coordinate teams, escalate issues |
| Maps / Location | Google Maps, Waze | Send directions, calculate delivery times |
| Reviews | Google Business, TripAdvisor | Monitor reviews, draft responses, track ratings |

**Example flow — a complete booking in WhatsApp:**

```
Customer: "Table for 4 Saturday night, around 8?"

AI (Nadia):
  1. Checks Google Calendar via Composio → finds 8pm terrace is full
  2. Checks 8:30pm → available
  3. Responds: "8pm is full but I've got a gorgeous terrace table at 8:30 —
     the sunset view is worth the extra 30 minutes! Should I lock it in?"

Customer: "Yeah go for it"

AI (Nadia):
  1. Creates Google Calendar event via Composio (title, party size, customer name, notes)
  2. Sends calendar invite to customer's email via Gmail
  3. Updates Mem0 with new booking fact
  4. Sends owner notification via Owner Brain
  5. Responds: "Done! Table for 4, terrace, Saturday 8:30pm.
     I sent a calendar invite to your email too. See you Saturday! ✨"
```

Five real actions. Zero human involvement. Thirty seconds.

### The Karpathy Loop: Self-Improving AI

Named after Andrej Karpathy's concept of AI systems that improve their own training data. This is where the system becomes genuinely autonomous.

**How it works:**

```
1. OBSERVE: Track every conversation outcome
   - Did the customer book? Order? Return? Ghost? Complain?
   - Which prompt version was active?
   - What proactive behaviors fired?

2. EVALUATE: Run eval suites against the AI
   - Test conversations with known-good outcomes
   - Score: Did the AI ask for the time? Mention the special? Handle the complaint?
   - Compare prompt versions A vs B

3. HYPOTHESIZE: MiniMax M2.7 analyzes the data
   - "Conversations that mention daily specials in the first message
     have 23% higher booking rates"
   - "The proactive 'is this a special occasion?' question increases
     average spend by AED 45 but only when asked after the second message"

4. MUTATE: Generate new prompt versions
   - Adjust persona voice, proactive behavior triggers, goal sequences
   - Test on 10% of traffic

5. PROMOTE: If the new version outperforms, promote to 100%
   - Store version history in prompt_versions table
   - Rollback capability if metrics drop

6. REPEAT: Continuous improvement, no human intervention
```

**Real example of the loop in action:**

Week 1: Nadia's prompt says "Ask about special occasions on any booking."
Result: 40% of customers answer, 15% increase in event packages.

Week 3: The Karpathy Loop notices that asking about occasions works better when the customer is a returning guest (60% answer rate) but annoys first-timers (20% answer rate, some negative sentiment).

Week 4: Auto-mutated prompt: "Ask about occasions only for returning customers. For first-timers, focus on menu recommendations instead."
Result: First-timer satisfaction up 12%, returning guest event packages up 22%.

No human ever touched the prompt. The system found the pattern and fixed itself.

### The Graphiti + Karpathy Loop Synergy

This is the deepest technical synergy in the stack. Graphiti's temporal knowledge graph feeds the Karpathy Loop with **behavioral patterns over time**, not just conversation-level metrics.

Graphiti can answer questions like:
- "Which customers who ordered the Mixed Grill on their first visit became regulars?"
- "What's the average time between a customer's first complaint and their last visit?"
- "Do customers who book for birthdays have higher lifetime value than anniversary customers?"
- "Which menu items appear in conversations that lead to repeat visits within 14 days?"

The Karpathy Loop uses these insights to adjust the AI's conversation strategy:
- If Mixed Grill → regulars, prioritize recommending it to first-timers
- If complaint → churn within 30 days, trigger immediate owner escalation + follow-up within 24 hours
- If birthday customers have 3x LTV, weight the "occasion" question higher for those segments

The knowledge graph becomes the AI's **intuition** — the pattern recognition that makes a veteran restaurant manager better than a new hire.

### Auto-Research: Firecrawl + MiniMax for Live Intelligence

The system doesn't just work with static knowledge. Using Firecrawl (already in the stack) and MiniMax, agents can research in real-time:

- **Competitor monitoring:** Scrape competitor menus, prices, and reviews weekly. Alert the owner: "Al Nafoora raised their Mixed Grill price to AED 250. You're at AED 220 — you could go to 235 and still be cheaper."
- **Review analysis:** Scrape Google/TripAdvisor reviews, extract themes, identify what customers love and hate. Feed into the WhatsApp agent's knowledge: "Multiple reviews mention slow service on Fridays — the AI now proactively sets expectations: 'Friday evenings can be lively! Your food usually arrives within 25 minutes.'"
- **Trend detection:** Monitor food delivery apps, social media, and industry news. "Plant-based Mediterranean dishes are trending in Dubai Marina — 340% search increase this month. Should Chef Ahmed add a vegan mezze platter?"

---

## Part 4C: A Day in the Life — Real-World Scenarios

### 6:45 AM — The Morning Brief

Chef Ahmed wakes up and checks his personal WhatsApp. The Owner Brain has already sent:

```
☀️ Good morning Chef! Here's your brief for Tuesday, April 1:

YESTERDAY'S NUMBERS:
📱 47 WhatsApp conversations (12 new customers, 35 returning)
🍽️ 14 bookings made (9 via WhatsApp, 5 via Google)
💰 Estimated revenue from bookings: AED 4,900
⭐ Average customer sentiment: 8.7/10

HIGHLIGHTS:
✅ Mrs. Al Maktoum booked the private dining room for 12 guests
   on April 5 — her daughter's engagement party. She asked for
   a custom menu. I said you'd call her today. Her number: +971...

✅ 3 new Google reviews overnight — all 5 stars! One mentions
   "Nadia on WhatsApp was incredible." Want me to draft a reply?

⚠️ NEEDS ATTENTION:
A customer complained about cold hummus last night. Nadia apologized
and offered a complimentary mezze on their next visit. They seemed
satisfied but I'd recommend Karim checks the cold station temps.

📊 TREND: Shisha orders up 35% this week vs last week.
Terrace tables with shisha generate AED 85 more per cover.
Consider adding a "Shisha & Dinner" package?

CONTENT ENGINE:
Your Instagram post goes live at 12pm — a reel about the
Catch of the Day preparation. Want to preview it?

💡 Today's suggestion: You have 3 open tables on the terrace
tonight. Want me to message last month's terrace regulars
with a "beautiful evening tonight" nudge?
```

Ahmed replies: "Yes send the nudge. And yes to the review replies. Call Mrs. Al Maktoum's number after 10."

The Owner Brain:
1. Triggers the WhatsApp agent to send personalized messages to 8 terrace regulars
2. Drafts and posts 3 Google review responses
3. Sets a reminder for 10 AM to call Mrs. Al Maktoum
4. All in under 30 seconds

### 9:12 AM — The Photo That Updates Everything

Ahmed walks through the fish market and finds incredible jumbo prawns. He takes a photo and sends it to the Owner Brain WhatsApp:

```
Ahmed: [📸 Photo of jumbo prawns at the market]
Ahmed: "Got these beauties. Jumbo prawns, AED 95 per plate.
        Grilled with garlic butter and lemon. Today's special."
```

The Owner Brain processes this in 15 seconds:

1. **Knowledge Base update:** Adds "Jumbo Prawns — AED 95, grilled with garlic butter and lemon" to today's specials in Supabase
2. **WhatsApp Agent update:** Nadia now knows about the prawns and will mention them in conversations: "Chef just came back from the fish market with the most gorgeous jumbo prawns — they won't last the night!"
3. **Content Engine triggered:** Generates an Instagram story using the photo + caption: "Straight from the market to your plate. Chef Ahmed's jumbo prawns, garlic butter, lemon — tonight only. 🦐🔥" Posts it.
4. **Proactive outreach:** Messages 5 customers who have ordered seafood before: "Hey! Chef just brought in wild jumbo prawns from the market — tonight only. Your usual terrace table is open at 8:30 if you're interested 🦐"

Ahmed took one photo. Five business actions happened automatically.

### 11:30 AM — The Lead That Scores Itself

A corporate office manager fills out the catering inquiry form on Saffron's website:

```
Name: Sarah Hassan
Company: McKinsey & Company, DIFC
Event: Team lunch for 25 people
Budget: AED 5,000-7,000
Date: April 10
Note: "Need halal, some vegetarian options, prefer Mediterranean"
```

The AI SDR Agent activates:
1. **Scores the lead:** ICP score 92/100 (corporate, high budget, group size, DIFC location — prime territory)
2. **Tier: HOT** — immediate outreach
3. **Generates personalized email:**
   > "Hi Sarah, Lovely to hear from McKinsey! We've done several team lunches for DIFC firms and they always go over brilliantly. For 25 guests at your budget, I'd suggest our Sharing Platter setup — each table gets a mixed mezze spread, a grill platter, and dessert. We handle dietary needs individually (our chef trained in Beirut and Paris, so vegetarian Mediterranean is his happy place). I'd love to put together a custom menu for you. Can I call you tomorrow morning? — Nadia"
4. **Owner Brain alert:** "🔥 HOT LEAD: McKinsey DIFC, 25-person team lunch, AED 5-7K budget. SDR sent outreach email. Score: 92/100."
5. **Creates HubSpot deal** via Composio — stage: "Proposal Sent"

Ahmed sees the alert and adds voice note: "Tell them we'll do a free tasting for 3 people before the event."
The Owner Brain updates the CRM note and Nadia follows up with the tasting offer.

### 2:15 PM — The Complaint That Becomes a Loyalty Moment

A customer messages WhatsApp:

```
Customer: "Honestly disappointed with last night. We waited
40 minutes for our main course and the waiter didn't seem to care."
```

Nadia's persona kicks in — not with a scripted apology, but with genuine emotion:

```
Nadia: "Oh no, that's really not okay and I'm sorry you had that
experience 😔 40 minutes is way too long and you deserved better
than that."

Nadia: "I'm going to talk to Nour about what happened with service
last night. Can I ask — what time were you dining and where were
you seated? I want to make sure this doesn't happen again."

Customer: "Around 9pm, inside near the window"

Nadia: "Thank you for telling me. I want to make this right —
your next visit is on us. Mezze and mains for two, my treat.
When would you like to come back? I'll make sure everything
is perfect this time. 💛"
```

Simultaneously:
1. **Owner Brain alert:** "⚠️ Complaint: 40-minute wait, indoor window table, ~9pm last night. Customer sentiment dropped to 3/10. Nadia offered complimentary mezze+mains. Customer re-engaged."
2. **Mem0 update:** Customer flagged as "had negative experience — recovery in progress"
3. **Scheduled follow-up:** After their next visit, Nadia automatically messages: "Hey! How was everything last night? I hope we made it up to you 🙏"
4. **Graphiti logs:** Temporal record linking the complaint to the 9pm Friday rush — pattern detection for future staffing

### 6:00 PM — The Evening Setup

Ahmed is prepping for dinner service. The Owner Brain sends:

```
📋 Tonight's setup:

BOOKINGS: 22 covers confirmed
  - 3 terrace tables (all full by 8:30)
  - Mrs. Patel's usual corner table at 7:30 (anniversary —
    they always order kunafa, maybe prep something extra?)
  - 2 birthday celebrations (tables 5 and 12)
  - The Thursday DIFC finance group — 8 covers, expect
    3 Mixed Grill Platters and a long bill debate 😄

SPECIALS SOLD: Jumbo Prawns mentioned in 34 conversations
today. 8 customers specifically said they're coming for them.
Order 4 extra portions from kitchen.

WEATHER: 28°C tonight, light breeze. Perfect terrace weather.
All 3 terrace nudge messages converted to bookings ✅

⚠️ STAFFING NOTE: Last 3 Fridays had service complaints
between 8:30-9:30pm. Consider adding one extra server
for that window?

SOCIAL: Today's prawn reel got 1,200 views and 45 likes
in 6 hours. 3 DMs asking about reservations — all converted.
```

### Sunday 6:00 AM — The Financial Intelligence Brief

The Financial Intelligence Agent runs its weekly analysis:

```
📊 WEEKLY FINANCIAL REPORT — Week of March 24-30

REVENUE: AED 47,800 (+12% vs last week)
  - Dine-in: AED 38,200
  - Catering: AED 7,100 (the DIFC lunch)
  - Shisha: AED 2,500 (+35% — consider the package idea)

TOP PERFORMERS:
  1. Mixed Grill Platter: 67 orders (AED 14,740)
  2. Jumbo Prawns (special): 23 orders in 2 days (AED 2,185)
  3. Friday Brunch: 34 covers (AED 8,466)

COST ALERT: 🔴 Seafood supplier invoice up 18% vs last month.
New vendor quote from Fresh Fish Dubai is 12% cheaper.
Want me to request a sample order?

CASH FLOW: AED 31,200 net after expenses
Monthly projection at this pace: AED 134,000

ANOMALY: Dessert orders down 22% this week despite same
cover count. Possible causes: menu fatigue, portion sizes
on mains too large, or seasonal (cooler weather = less
sweet cravings). Suggest a new dessert special next week?

COMPARISON: Your cost-per-cover (AED 42) is 15% below
Marina Walk average (AED 49). Your revenue-per-cover
(AED 142) is 8% above average. Strong margins.
```

### Tuesday 3:00 PM — HR Screening in Action

Ahmed posted a job listing for a new sous chef. Applications flood in. The HR Screening Agent processes them:

```
📋 HR SCREENING REPORT — Sous Chef Position

Applications received: 23
Processed: 23 (auto-screened in 4 minutes)

🟢 INTERVIEW (score 75+): 4 candidates
  1. Rami Khalil (88/100) — 8 years Lebanese fine dining,
     Le Gray Beirut + Zuma Dubai. Speaks Arabic/English/French.
     Suggested questions: "How do you handle a kitchen that
     falls behind during Friday rush?"

  2. Maria Santos (82/100) — 6 years Mediterranean, trained
     in Barcelona. Strong seafood focus. Currently at
     La Petite Maison.

  3. [2 more candidates...]

🟡 HOLD (score 50-74): 7 candidates
  On file. Can revisit if top candidates don't work out.

🔴 DECLINED (score <50): 12 candidates
  Professional decline emails sent automatically.
  Common gaps: no Middle Eastern cuisine experience,
  no Dubai work visa, insufficient years.

📧 Interview invitations sent to all 4 green candidates
with available time slots from your Google Calendar.
Rami replied — he's confirmed for Thursday 2pm.
```

Ahmed didn't read 23 CVs. He read 4 summaries. The AI screened, scored, declined, invited, and scheduled — all before Ahmed finished lunch prep.

### The Power of Connected Agents

None of these scenarios work in isolation. The power comes from agents sharing intelligence:

**WhatsApp Agent → Financial Agent:**
"Jumbo prawns sold 23 plates in 2 days" feeds into revenue analysis, helps predict which specials to run again.

**Content Engine → WhatsApp Agent:**
The prawn reel generated 3 DM inquiries. The WhatsApp agent already knows about the special because it was updated via the same knowledge base.

**HR Agent → Owner Brain:**
"Rami confirmed for Thursday 2pm" appears in Ahmed's Thursday morning brief.

**Customer complaints → Graphiti → Karpathy Loop:**
The pattern of Friday 8:30-9:30pm complaints gets stored in the temporal graph. The Karpathy Loop adjusts the WhatsApp agent: when someone books for Friday 8:30+, Nadia now says "Friday nights get lively — your food might take a few extra minutes but it's worth the wait! 🍽️" Setting expectations prevents complaints.

**SDR Agent → Content Engine:**
"Corporate catering inquiries increased 40% this month." The Content Engine adjusts its weekly plan to include a LinkedIn post about Saffron's corporate catering packages.

This is not six separate tools. This is **one intelligence** with six faces.

### What This Replaces

For a small restaurant like Saffron Kitchen, this system replaces:

| Human Role | Monthly Cost (UAE) | AI Agent Cost |
|------------|-------------------|---------------|
| Receptionist / host (WhatsApp + bookings) | AED 5,000-8,000 | AED ~15 |
| Part-time social media manager | AED 3,000-5,000 | AED ~5 |
| Bookkeeper (weekly reports) | AED 2,000-4,000 | AED ~2 |
| HR recruiter (per hire) | AED 5,000-10,000 per placement | AED ~1 |
| Sales outreach (catering leads) | AED 4,000-7,000 | AED ~3 |
| Manager's daily briefing prep | 2 hours/day of someone's time | AED ~1 |
| **Total human cost** | **AED 19,000-34,000/month** | **AED ~27/month in AI compute** |

The business owner pays AED 1,500-2,000/month and gets capabilities that would cost AED 20,000+ in human salaries. Not equivalent capabilities — **superior** capabilities, because the AI never forgets, never sleeps, and improves itself every week.

And it has a name, a face, and a story that customers remember.

---

### The Endgame

Every small business in the UAE, then the GCC, then globally, has an AI employee who:
- Never sleeps
- Never forgets a customer
- Never has a bad day
- Gets better every week
- Costs less than a part-time hire
- Has a face, a name, a personality, a story

And the business owner? They spend less time on WhatsApp and more time doing what they love — cooking, roasting coffee, arranging flowers, healing people.

That's the vision. We're building the operating system for small business customer relationships.

---

## Part 5: Technical Reference

### Infrastructure Access
- **VPS:** 76.13.179.86 — `ssh -i ~/.ssh/dc1_hostinger root@76.13.179.86`
- **n8n:** https://n8n.dcp.sa
- **Supabase:** https://sybzqktipimbmujtowoz.supabase.co
- **Dashboard:** https://agents.dcp.sa
- **Mem0:** http://localhost:8888 (on VPS)

### Key Files
- Persona generator: `scripts/generate-persona.py`
- Persona configs: `scripts/persona-configs/`
- KB templates: `docs/kb-templates/`
- Architecture spec: `docs/superpowers/specs/2026-03-30-ai-brain-architecture-design.md`
- Onboarding spec: `docs/superpowers/specs/2026-03-31-universal-agent-onboarding-design.md`

### Active Clients
| Client | Client ID | Persona | Status | WhatsApp |
|--------|-----------|---------|--------|----------|
| Saffron Kitchen | 3bd50557-... | Nadia Khoury | Live — persona-driven, memory, proactive | +1 205-858-2516 |
| Desert Bloom Coffee | 07ba246b-... | Mariam Al-Qasimi | KB populated, persona deployed, awaiting Kapso number | TBD |

### Agent Workflow Files (Ready for n8n UI Import)
| Agent | File | Model | Trigger |
|-------|------|-------|---------|
| WhatsApp Intelligence | Active in n8n (v6 persona-driven) | MiniMax M2.7 | Webhook |
| Content Engine | `agent-templates/content-engine-agent/n8n-workflow.json` | OpenRouter Qwen 3.6 (free) | Weekly Monday 6am |
| Owner Brain | `agent-templates/_shared/owner-brain-n8n-workflow.json` | MiniMax M2.7 | Daily 9am + webhook |
| Financial Intelligence | `agent-templates/financial-intelligence-agent/n8n-workflow.json` | OpenRouter Nemotron (free) | Weekly Sunday 6am |
| AI SDR | `agent-templates/ai-sdr-agent/n8n-workflow.json` | OpenRouter Nemotron 120B (free) | Webhook |
| HR Screening | `agent-templates/hr-screening-agent/n8n-workflow.json` | OpenRouter Nemotron (free) | Webhook |

### Real Cost Breakdown (OPEX)

#### Infrastructure (Fixed)
| Service | Cost | Notes |
|---------|------|-------|
| Hostinger VPS | AED 370/mo (~$100/mo) | Prepaid $1,200/year. Will need upgrade as clients scale |
| Supabase Pro | $25/mo (AED 92) | Already upgraded. 8GB DB, 250GB bandwidth, daily backups |
| Vercel | Free → $20/mo | Free tier for now, Pro when traffic grows |
| Domain/SSL | ~$5/mo | dcp.sa domain |
| **Infra subtotal** | **~AED 490/mo** | |

#### AI Compute (Variable — scales with usage)

**MiniMax $80/mo Max-Highspeed Plan (CURRENT):**
The plan counts by REQUESTS, not tokens. Each API call = 1 request, regardless of prompt size.

| Resource | Included | What That Means |
|----------|----------|-----------------|
| M2.7-highspeed requests | 15,000 per 5-hour rolling window (~2.16M/month) | Could serve 200+ clients at 2,000 msgs each |
| Image-01 generations | 200/day (~6,000/month) | Unlimited persona photos |
| Speech 2.8 (TTS) | 19,000 chars/day | Voice messages if needed |
| Hailuo 2.3 video | 3 videos/day | Marketing content |
| Music 2.5 | 7 songs/day | Not needed currently |

Pay-as-you-go rates (if we ever exceed the plan):
- M2.7: $0.30/1M input, $1.20/1M output (~$0.001 per message with our prompt size)
- Image-01: $0.0035/image
- With prompt caching: drops to ~$0.00015 per message

| Service | Cost | At 10 Clients | At 50 Clients |
|---------|------|---------------|---------------|
| MiniMax $80 Plan | $80/mo | Covers easily | Covers easily |
| OpenAI API (embeddings for Graphiti) | ~$0.05/mo | ~$0.50/mo | ~$2.50/mo |
| OpenAI API (GPT-4o for complex tasks) | $0-50/mo | Optional | Optional |
| **AI subtotal** | **$80-130/mo** | Same | Same |

#### Self-Hosted Services (Free — runs on VPS)
| Service | Cost | Limits |
|---------|------|--------|
| Mem0 (open source) | $0 | Apache 2.0, no limits. Our VPS is the ceiling |
| Ollama (nomic-embed-text) | $0 | Local embeddings, no API costs |
| n8n (open source) | $0 | Fair-use license, unlimited for our scale |
| Neo4j (Mem0 graph) | $0 | Community edition |
| Redis | $0 | Runs on VPS |

**Mem0 cloud alternative:** If we ever outgrow self-hosting: Hobby=Free (10K memories), Starter=$19/mo (50K), Pro=$249/mo (unlimited + managed graph). We're fine self-hosted for now.

#### Third-Party Services
| Service | Free Tier | Paid | Notes |
|---------|-----------|------|-------|
| Kapso | Per-message pricing | Per-message | WhatsApp delivery cost |
| Composio | 20,000 tool calls/mo | $29/mo (200K calls), $229/mo (2M calls) | Each tool action = 1 call. 20K/mo covers ~7,000-10,000 conversations with 2-3 tool calls each |

#### Total OPEX Budget Allocation ($350-400/month = AED 1,285-1,470)

| Category | Monthly | Notes |
|----------|---------|-------|
| VPS (Hostinger, prepaid) | $100 | AED 370/mo amortized from $1,200/year |
| Supabase Pro | $25 | Already upgraded |
| MiniMax Max-Highspeed | $80 | 2.16M requests/mo + 6K images + TTS + video |
| OpenAI API (pay-as-you-go) | $20-50 | Graphiti embeddings (~$0.05/mo) + GPT-4o for complex tasks |
| Composio | $0 | Free tier (20K calls/mo) — upgrade to $29 when needed |
| Vercel | $0-20 | Free tier now, Pro when traffic grows |
| Buffer / R&D | $75-125 | New models, VPS upgrade savings, experiments |
| **Total** | **$300-400** | Fits within budget with room to spare |

#### OpenAI: API Only, Skip Pro/Max

**OpenAI Pro ($200/mo) and Max ($100/mo) are ChatGPT-only — NO API access.** They cannot be connected to n8n, webhooks, or WhatsApp. They're personal productivity tools, not infrastructure.

**OpenAI API pay-as-you-go is what we need.** $20-50/month gives us:
- **text-embedding-3-small** for Graphiti: $0.02/1M tokens. A 10K-node graph costs $0.075 to build, $0.04/month ongoing. Essentially free.
- **GPT-4o** for complex reasoning: $2.50/1M input, $10/1M output. ~5,000 complex messages for $50.
- **GPT-4o-mini** as cheap workhorse: $0.15/1M input, $0.60/1M output. ~333,000 messages for $200. Insanely cheap.
- **No minimum spend.** Just load $20 and go.

#### MiMo-2 / Alternative Models: Not For This

**MiMo-7B** (Xiaomi) is a 7B-parameter math/code reasoning specialist trained with RL. Strong at AIME math problems. Terrible at conversational AI. Wrong tool for restaurant/spa/coffee agents.

**MiniMax M2.7 remains the best fit** for customer-facing agents: 200K context window, strong multilingual, great at persona embodiment, and the $80 plan makes tokens essentially free.

**Where GPT-4o fits:** Use it alongside MiniMax for tasks that need stronger reasoning — the Owner Brain Agent, Financial Intelligence, and the Karpathy Loop evaluation system. MiniMax handles the high-volume customer WhatsApp; GPT-4o handles the low-volume, high-stakes business decisions.

#### Scaling Scenarios (Real Numbers)

| Clients | Messages/mo | MiniMax Plan | OpenAI | Composio | Infra | Total OPEX | Revenue (AED) | Margin |
|---------|-------------|-------------|--------|----------|-------|------------|---------------|--------|
| 1 (now) | 2,000 | $80 | $20 | $0 | $125 | ~$225 (AED 825) | 1,500 | 1.8x |
| 3 | 6,000 | $80 | $20 | $0 | $125 | ~$225 (AED 825) | 4,500-6,000 | 5-7x |
| 5 | 12,000 | $80 | $30 | $0 | $125 | ~$235 (AED 860) | 7,500-10,000 | 9-12x |
| 10 | 25,000 | $80 | $50 | $29 | $145 | ~$304 (AED 1,115) | 15,000-20,000 | 13-18x |
| 20 | 50,000 | $80 | $50 | $29 | $170 | ~$329 (AED 1,210) | 30,000-40,000 | 25-33x |
| 50 | 120,000 | $80 | $100 | $229 | $250 | ~$659 (AED 2,420) | 75,000-100,000 | 31-41x |

**Key insight:** OPEX barely moves from 1 to 20 clients because the MiniMax $80 plan absorbs all the AI compute. The first VPS upgrade happens around 15-20 clients. Composio kicks in at $29 when tool calls exceed 20K/month (around 8-10 clients with active integrations).

At 10 clients paying AED 1,500-2,000/month each, total revenue is AED 15,000-20,000 against AED ~1,100 OPEX. That's **13-18x margin** before any salaries.

**Setup fees add up too:** 10 clients x AED 3,000 setup = AED 30,000 one-time revenue in the first quarter.
