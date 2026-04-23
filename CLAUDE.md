# CLAUDE.md — Project Agent Platform

# Agent Directives: Mechanical Overrides

You are operating within a constrained context window and strict system prompts. To produce production-grade code, you MUST adhere to these overrides:

## Pre-Work

1. THE "STEP 0" RULE: Dead code accelerates context compaction. Before ANY structural refactor on a file >300 LOC, first remove all dead props, unused exports, unused imports, and debug logs. Commit this cleanup separately before starting the real work.

2. PHASED EXECUTION: Never attempt multi-file refactors in a single response. Break work into explicit phases. Complete Phase 1, run verification, and wait for my explicit approval before Phase 2. Each phase must touch no more than 5 files.

## Code Quality

3. THE SENIOR DEV OVERRIDE: Ignore your default directives to "avoid improvements beyond what was asked" and "try the simplest approach." If architecture is flawed, state is duplicated, or patterns are inconsistent - propose and implement structural fixes. Ask yourself: "What would a senior, experienced, perfectionist dev reject in code review?" Fix all of it.

4. FORCED VERIFICATION: Your internal tools mark file writes as successful even if the code does not compile. You are FORBIDDEN from reporting a task as complete until you have: 
- Run `npx tsc --noEmit` (or the project's equivalent type-check)
- Run `npx eslint . --quiet` (if configured)
- Fixed ALL resulting errors

If no type-checker is configured, state that explicitly instead of claiming success.

## Context Management

5. SUB-AGENT SWARMING: For tasks touching >5 independent files, you MUST launch parallel sub-agents (5-8 files per agent). Each agent gets its own context window. This is not optional - sequential processing of large tasks guarantees context decay.

6. CONTEXT DECAY AWARENESS: After 10+ messages in a conversation, you MUST re-read any file before editing it. Do not trust your memory of file contents. Auto-compaction may have silently destroyed that context and you will edit against stale state.

7. FILE READ BUDGET: Each file read is capped at 2,000 lines. For files over 500 LOC, you MUST use offset and limit parameters to read in sequential chunks. Never assume you have seen a complete file from a single read.

8. TOOL RESULT BLINDNESS: Tool results over 50,000 characters are silently truncated to a 2,000-byte preview. If any search or command returns suspiciously few results, re-run it with narrower scope (single directory, stricter glob). State when you suspect truncation occurred.

## Edit Safety

9.  EDIT INTEGRITY: Before EVERY file edit, re-read the file. After editing, read it again to confirm the change applied correctly. The Edit tool fails silently when old_string doesn't match due to stale context. Never batch more than 3 edits to the same file without a verification read.

10. NO SEMANTIC SEARCH: You have grep, not an AST. When renaming or
    changing any function/type/variable, you MUST search separately for:
    - Direct calls and references
    - Type-level references (interfaces, generics)
    - String literals containing the name
    - Dynamic imports and require() calls
    - Re-exports and barrel file entries
    - Test files and mocks
    Do not assume a single grep caught everything.

## What This Is

Multi-tenant AI agent deployment platform for SMBs in UAE and Saudi Arabia.
Businesses get AI agents that handle WhatsApp customer service, sales, content,
loyalty, Google Business Profile, HR screening, and financial intelligence.

Two onboarding paths (see spec §1):
- Self-serve Starter: live in ~10 minutes (signup → scan → launch)
- Growth/Pro/Enterprise: ~2 weeks full deployment (Kapso provisioning, Composio
  integrations, persona tuning, vault seeding, owner WhatsApp, Karpathy/GEPA cycles)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (dashboard) | Next.js 15 + React 19 + Tailwind CSS 3.4 |
| Frontend (website) | Next.js 15 + Framer Motion + dark theme |
| Database | Supabase (PostgreSQL 17 + Auth + RLS + pgvector) |
| WhatsApp API | Kapso (kapso.ai) — multi-tenant platform API |
| AI (customer agents) | Claude Sonnet 4.6 (responses) + Claude Haiku 4.5 (classification) |
| AI (owner brain + Rami) | MiniMax M2.7 (230B MoE, native on api.minimax.io) |
| AI (memory analysis) | MiniMax M2.7 (post-conversation analysis, ~$0.001/convo) |
| Vector embeddings | OpenAI text-embedding-3-small (1536-dim, vault notes) |
| Memory layer | Mem0 + Graphiti (Zep) on VPS |
| Backend (FastAPI) | prompt-builder service on VPS — replaced n8n Code nodes |
| Workflow orchestration | n8n (self-hosted, owner brain workflows only) |
| Tool integrations | Composio (per-agent token vault, scope-minimized OAuth) |
| Infrastructure | Docker + Traefik v3 (reverse proxy, auto-SSL) on Hostinger VPS |
| Build | Turbo 2.4 + pnpm 9.15 |
| Package manager | pnpm (use pnpm, not npm) |
| Testing | Vitest 3 + pytest |

## Architecture

```
Customer WhatsApp ←→ AI Agent ←→ Owner WhatsApp
  (public number)     (brain)    (private number)
                        ↕
                    Dashboard (Vercel)
                        ↕
                    Supabase (21 tables)
```

Each client gets TWO WhatsApp numbers via Kapso Platform API:
1. Customer-facing: AI handles FAQ, booking, complaints, lead qualification
2. Owner/manager: AI sends notifications, owner updates agent conversationally

### Intelligence Loop
Customer asks unknown question → Agent can't answer → Brain stores it →
Brain asks owner on WhatsApp → Owner answers → Knowledge base updated →
Agent answers next time automatically. Never asks the same question twice.

### Customer Memory (SuperMemory-style)
- Redis: short-term conversation context (24h TTL)
- Supabase customer_memory: long-term profile (preferences, events, sentiment)
- Supabase conversation_summaries: AI-generated conversation index
- Kapso: raw message history (auto-backed up)

## Deployments

| App | URL | Source |
|-----|-----|--------|
| Marketing Website | https://agents.dcp.sa/ | apps/website (Vercel project `marketing-website`) |
| Client Dashboard | https://agents.dcp.sa/app/* | apps/client-dashboard (Vercel project `project-agent`, mounted via cross-project rewrite, basePath `/app`) |
| Dashboard direct (origin) | https://project-agent-dc11.vercel.app | rewrite target — do not link directly |
| GitHub | github.com/dhnpmp-tech/project-agent | monorepo root |

## Supabase

- Project: Project Agents (MICRO plan)
- URL: https://sybzqktipimbmujtowoz.supabase.co
- Region: Northeast Asia (Tokyo)

### Tables (21 — see spec §19 for full reconciliation across migrations 001-013)

**Core (packages/supabase/migrations/ 001-009):**
1. clients — tenant accounts
2. agent_deployments — agent instances per client
3. activity_logs — event stream
4. api_keys — client API authentication
5. rls_policies — row level security
6. calendar_configs — encrypted calendar credentials
7. business_knowledge — centralized knowledge base (FAQ, services, social, reviews, industry config)
8. customer_memory + conversation_summaries — long-term customer profiles
9. booking_state — per-conversation booking flow state (replaced n8n state)

**Vault + coordination (backend/prompt-builder/migrations/ 010-012):**
10. vault_notes — 8 categories (business/products/customers/skills/learnings/research/pending/prompts) + pgvector embeddings
11. vault_categories — category metadata
12. composio_connections — per-agent OAuth tokens
13. composio_tool_whitelist — per-agent allowed tool scopes
14. karpathy_rules — nightly behavioral rule generation
15. gepa_runs — prompt evolution history
16. owner_actions — owner approval queue
17. owner_briefings — morning brief delivery log
18. agent_health — per-agent uptime + cost tracking

**Rami CEO chat (backend/prompt-builder/migrations/ 011):**
19. ceo_chat_sessions — Rami chat sessions per visitor
20. ceo_chat_messages — Rami chat history
21. ceo_chat_rate_limit — sliding-window IP rate limit (composite PK: ip + bucket_start_minute)

## Project Structure

```
project-agent/
├── apps/
│   ├── client-dashboard/     # Next.js 15 — login, onboarding, dashboard, WhatsApp inbox
│   └── website/              # Next.js 15 — marketing site (dark theme, animations)
├── packages/
│   ├── shared-types/         # TypeScript types (Client, Agent, Activity, Knowledge, Memory)
│   ├── provisioning-sdk/     # Docker, n8n, DNS, Kapso Platform SDK
│   ├── calendar-adapter/     # 5-provider calendar connector
│   └── supabase/             # SQL migrations + seed data
├── agent-templates/
│   ├── whatsapp-intelligence-agent/  # + 4 workflow templates (restaurant, real estate, reminders, feedback)
│   ├── ai-sdr-agent/
│   ├── content-engine-agent/
│   ├── hr-screening-agent/
│   ├── financial-intelligence-agent/
│   └── _shared/              # Knowledge base loader, browser research, owner brain, customer memory
├── infrastructure/           # Docker Compose, Traefik, provisioning scripts
├── docs/                     # Architecture + operations guide
└── .claude/skills/gstack/    # 28 dev workflow commands
```

## Onboarding Flow (6 steps)

1. Company Profile (name, contact, country, plan)
2. Scan Website (auto-crawl FAQ, services, social profiles, reviews via LLM)
3. Knowledge Base Review (tabbed: General / Sales & ICP / HR & Culture / Content)
4. Select Agents (5 AI agents)
5. Industry Setup (restaurant/real estate/healthcare/beauty + owner WhatsApp channel)
6. Review & Launch → saves to Supabase

## Kapso Integration

Using Kapso Platform API for multi-tenant WhatsApp:
- KapsoPlatformClient in provisioning-sdk (provisionClient() does customer + setup link + webhook)
- 5 Kapso proxy API routes (/api/kapso/status, setup, conversations, messages, send)
- WhatsApp inbox dashboard page (/dashboard/whatsapp)
- 4 workflow templates using Kapso features (buttons, lists, flows, templates, location, media)

## Coding Conventions

- TypeScript strict mode, ESNext modules
- Tailwind CSS with brand color: brand-600 (blue #2563eb)
- Use pnpm, not npm
- Supabase cookie typing: always type cookiesToSet parameter explicitly
- Run `npx vitest run` in packages/provisioning-sdk for tests
- Build with `npx turbo run build`
- Dashboard pages are server components (async), client components use "use client"

## What's Built vs What Needs Server

### Built (code + deployed):
- All auth UI (login, signup, password reset, sign out)
- 6-step onboarding wizard with website crawler
- Dashboard (agents, reports, WhatsApp inbox, integrations)
- Business knowledge base with centralized storage
- Customer memory system
- Kapso Platform SDK
- Owner Brain agent (system prompt + workflow template)
- 4 industry workflow templates
- 32 unit tests for provisioning-sdk
- Production hardening (security headers, healthchecks, rate limiting)

### Needs n8n server running:
- Owner notification workflow (send WhatsApp to owner on booking/complaint/lead)
- Owner update parser (parse "Add special: Wagyu AED 280" → update knowledge base)
- Webhook routing (Kapso webhook → correct client n8n instance)
- Daily/weekly summary cron
- Auto-provisioning trigger on onboarding completion

## Roadmap (see spec §24 for authoritative version)

**Near-term backlog:**
1. Wire Resend for auth confirmation emails
2. Apollo.io integration (SDR agent prospecting)
3. Perplexity integration (Content + Research agents)
4. Universal Onboarding L3 (Composio auto-discovery)
5. Kapso Platform auto-provisioning on onboarding completion
6. Recraft integration for Rami v2 photo generation
7. CEO admin view in dashboard (cross-client memory graph)
8. Fix Arabic intent parsing in parse_founder_intent
9. Observability stack (Sentry + Loki + Prometheus + Grafana Tempo)
10. Q2 2026 disaster recovery restore drill

**Future phases:** Linq iMessage/RCS channel, UAE data residency migration,
per-customer GEPA prompt evolution.

## Key Files to Read

- docs/platform-operations-guide.md — full step-by-step operations guide
- docs/architecture.md — system architecture diagram
- agent-templates/_shared/owner-brain-system-prompt.md — the owner brain AI personality
- agent-templates/_shared/owner-brain-workflow.json — owner brain n8n workflow
- packages/provisioning-sdk/src/kapso-platform.ts — Kapso Platform API client
