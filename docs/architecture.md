# Architecture Overview

## Multi-Tenant Model

The platform is a shared-infrastructure SaaS — not Docker-per-client. Tenancy is enforced at the data layer (Supabase Row Level Security) and at the WhatsApp layer (Kapso Platform API allocates a customer + owner number per client).

```
┌──────────────────────────────────────────────────────────────────┐
│                    PLATFORM (shared infrastructure)              │
│                                                                  │
│  Vercel (Next.js)                Hostinger VPS (Docker+Traefik)  │
│  ┌──────────────────────┐        ┌──────────────────────────┐    │
│  │ apps/website         │        │ FastAPI prompt-builder   │    │
│  │ apps/client-dashboard│        │ Mem0 + Graphiti          │    │
│  └──────────────────────┘        │ n8n (owner-brain only)   │    │
│             │                    └──────────────────────────┘    │
│             ▼                                  │                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Supabase (PostgreSQL 17 + Auth + RLS + pgvector) — 21 tbls │ │
│  └─────────────────────────────────────────────────────────────┘ │
│             │                                  │                 │
│             ▼                                  ▼                 │
│  ┌──────────────────┐             ┌──────────────────────────┐   │
│  │ Kapso Platform   │             │ Composio (per-agent vault)│  │
│  │ • customer #     │             │ • OAuth scopes minimized │   │
│  │ • owner #        │             │ • per-tenant tokens      │   │
│  └──────────────────┘             └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

Per-client isolation is achieved through:
- **Supabase RLS** — every row tagged with `client_id`; policies prevent cross-tenant reads
- **Kapso Platform API** — separate customer + owner phone numbers per tenant
- **Composio per-agent vault** — OAuth tokens scoped to a single agent_deployment
- **Vault notes (`vault_notes` table)** — pgvector embeddings filtered by client

## Two-Number WhatsApp Model

Each client gets two numbers via Kapso:
1. **Customer-facing**: AI handles FAQ, booking, complaints, lead qualification
2. **Owner/manager-facing**: AI sends notifications; owner updates the brain conversationally

## Data Flow

- **Customer** sends WhatsApp → Kapso webhook → FastAPI prompt-builder
- **Prompt-builder** assembles context: `business_knowledge` + `vault_notes` (pgvector) + `customer_memory` + booking state
- **Claude Sonnet 4.6** generates response (Haiku 4.5 for classification)
- **Response** flows back through Kapso to customer
- **Activity** logged to `activity_logs`; memory updates batched post-conversation via MiniMax M2.7
- **Owner** receives summaries/approvals on their WhatsApp; replies update knowledge base via owner-brain n8n workflow
- **Dashboard** reads from Supabase (filtered by RLS)

## Intelligence Loop

Customer asks unknown question → Agent can't answer → Brain stores it →
Brain asks owner on WhatsApp → Owner answers → `business_knowledge` updated →
Agent answers next time automatically. Never asks the same question twice.

Nightly: Karpathy rules (behavioral patterns) + GEPA (prompt evolution) refine each agent.

## Customer Memory (SuperMemory-style)

- **Redis**: short-term conversation context (24h TTL)
- **`customer_memory`**: long-term profile (preferences, events, sentiment)
- **`conversation_summaries`**: AI-generated conversation index
- **Kapso**: raw message history (auto-backed up)

## Security

- Supabase RLS on all 21 tables — no cross-tenant leakage
- Composio per-agent OAuth vault with minimum scopes
- Calendar credentials AES-256-GCM encrypted (`calendar_configs`)
- All traffic over HTTPS (Vercel + Traefik auto-SSL)
- Service-role key only used in trusted server routes; never exposed client-side
- Sliding-window IP rate limit on public endpoints (`ceo_chat_rate_limit`)

## Scaling Path

1. **0-50 clients**: Current Vercel + single VPS (FastAPI + Mem0 + n8n owner-brain)
2. **50-200 clients**: Add VPS replicas behind load balancer; scale Supabase to Pro
3. **200+ clients**: Migrate to UAE data residency; per-region Supabase + Kapso pools
