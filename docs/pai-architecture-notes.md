# PAI · Personal AI Infrastructure — architecture notes for Rami's brain

Reference: [danielmiessler/Personal_AI_Infrastructure](https://github.com/danielmiessler/Personal_AI_Infrastructure) (★13k, TS).

These are the patterns from PAI worth adopting (or explicitly rejecting) for Project Agent's Rami persona and the per-tenant agent brain. Not direct code reuse — PAI is single-user; we're multi-tenant. But the structural patterns are the right starting point.

## Repo structure (the directories matter more than the code)

```
Personal_AI_Infrastructure/
├── Packs/         # Reusable capability bundles (similar to how Composio bundles integrations per-agent)
├── Tools/         # Discrete tool implementations
├── PLATFORM.md    # The contract docs — what an agent expects + provides
└── Releases/      # Versioned packs
```

The **Packs / Tools split** maps onto our existing architecture:
- **Packs** = the agent templates (`agent-templates/whatsapp-intelligence-agent/`, `ai-sdr-agent/`, etc.) — reusable capability bundles.
- **Tools** = the per-role inference functions in `inference.py` + the Composio tool whitelist per agent.

## Patterns worth lifting

### 1. UFC framework — Understanding-First-Context

PAI's UFC pattern: every agent invocation starts by **collecting all the context the agent has** about the user/situation, BEFORE acting. The agent never operates on the user's prompt alone — it always pulls:
- user profile + preferences + history
- recent calendar + email signal
- ongoing project state
- last N interactions

For Project Agent this maps onto: every `inference.chat()` call for a customer-facing role should be prepended with a **grounding block** containing tenant business context (KB), customer memory (Mem0 fact graph), recent conversation summary, and active booking/order state. We already do this for some roles in `prompt_builder` — the gap is making it the default for ALL roles, not optional.

**Concrete next step:** add an optional `tenant_context: dict` param to `inference.chat()` that, when present, automatically inserts a UFC-style grounding header (Business + KB + customer profile + recent interaction).

### 2. Fabric-style prompt templates

PAI heavily uses [Fabric](https://github.com/danielmiessler/fabric) prompt patterns — discrete, versioned, single-purpose prompt files (`/Packs/*/prompts/*.md`). Each is composable.

Our equivalent today: prompts are inline in Python/TS files. Hard to version, A/B test, or improve in isolation.

**Concrete next step:** extract every LLM prompt from `app.py`, `karpathy_loop.py`, `owner_brain.py`, etc. into `backend/prompt-builder/prompts/<role>/<task>.md` files. Load at module init. Lets us:
- Track prompt evolution in git
- A/B-test prompts via GEPA without code changes
- Have a non-engineer (Rami or operations) edit a prompt and ship it

### 3. Persona memory layers

PAI separates persona-level memory (who the user is, what they value, immutable preferences) from session memory (this conversation) from working memory (next 5 minutes of action). Three concentric rings.

We have this fragmented across:
- `clients` table → tenant immutables
- `business_knowledge` → tenant + KB (mixed)
- `customer_memory` + `conversation_summaries` → per-customer
- Redis short-term → working

**Concrete next step:** formalize as three columns of an `agent_memory` view: tenant_persona (immutable), customer_persona (per-customer immutable), session_state (this conversation). The UFC grounding block reads from this view.

### 4. Capability declarations (PLATFORM.md as a contract)

PAI's PLATFORM.md declares: "An agent MUST provide X, Y, Z. An agent MAY provide…". The cleanness comes from being explicit about what an agent IS vs what it's optional.

We don't have this. Adding it would make agent-template authoring 10× clearer.

**Concrete next step:** write `agent-templates/_shared/AGENT_CONTRACT.md` describing the MUST-have (`handle_customer_message`, `handle_owner_command`, `daily_brief`) vs MAY-have (`fetch_reviews`, `auto_post_social`, `book_via_calendar`).

## What NOT to lift

PAI is built for **one user** — Daniel Miessler. The whole "your life operating system" framing assumes a single human's data. Our multi-tenant model means we can't:
- Use a single vector store (we'd leak tenant data across customers)
- Use a single agent identity (each tenant has their own AI persona — Nadia for Saffron, etc.)
- Share memory across tenants (forbidden)

The hardest single difference: PAI assumes the agent acts ON BEHALF of the user; our agent acts ON BEHALF of the SMB owner, talking to that SMB's customers. Two layers of identity, not one.

## Concrete deliverables from PAI patterns

In priority order:
1. **UFC grounding block** baked into `inference.chat()` — biggest quality lift for the same model weights
2. **Prompts extracted to `.md` files** — lets us improve them without code deploys
3. **`agent_memory` view** — single source of truth for what the agent knows about (tenant, customer, session)
4. **`AGENT_CONTRACT.md`** — explicit must/may capability list per agent type

The first two are 1-day each; the latter two are 2-3 day refactors.

## When to revisit

This document is a snapshot from reading PAI on 2026-05-13. PAI ships releases roughly every 2 weeks; check `Releases/` for new patterns when:
- Considering a new agent type (the contract has likely evolved)
- Working on Rami's brain orchestration (multi-agent coordination patterns appear/disappear here)
- Refactoring inference.py (UFC framework details may have moved)
