# Ask Rami Chat Widget — Design Spec

**Date:** 2026-04-22
**Status:** Design approved by founder, ready for plan
**Owner:** Rami Mansour (CEO Persona) — public voice surface
**Depends on:** `ceo_persona.py` (deployed), `assets/rami-identity/` (v2 photos in flight)

---

## 1. Goal

A public chat widget on the marketing site (`apps/website`) that lets visitors converse with **Rami Mansour**, Project Agent's AI Co-Founder. Rami acts as a founder proxy, a live demonstration of the product's capabilities, and an organic lead qualifier. **No human handoff** — Rami IS the demo. If the widget convinces, the visitor reaches out via existing channels (`/book-audit`, `/pricing`).

Success = a prospect leaves the conversation convinced that (a) the AI is real and impressive, (b) Project Agent does what it claims, (c) it's worth their time to book an audit.

## 2. Non-Goals

- No live human handoff (no WhatsApp escalation, no calendar booking inline, no email-to-founder).
- No CRM push, no marketing email capture, no drip sequences.
- No multi-tenant chat widget for clients (that's a separate product surface — `/chat/*` endpoints already exist for that).
- No voice or video. Text only.
- No payment, billing, or onboarding flows in the widget.

## 3. Architecture

```
Marketing site (apps/website)
  └─ <RamiWidget /> mounted in src/app/layout.tsx
      ├─ Pulses bottom-right after 60s dwell
      ├─ Opens with page-aware greeting (server-rendered)
      └─ POST /ceo/chat → SSE stream

FastAPI on VPS (/opt/prompt-builder)
  └─ ceo_chat.py (new, ~250 LOC)
      ├─ POST /ceo/chat              ← public, rate-limited, SSE
      ├─ GET  /ceo/chat/greeting     ← page-aware opener (cached 5min)
      ├─ GET  /ceo/chat/history/:sid ← session resume
      ├─ POST /ceo/chat/identify     ← bind name/company/email mid-convo
      └─ POST /ceo/chat/forget/:sid  ← PDPL/GDPR delete-me
  └─ ceo_chat_tools.py (new, ~150 LOC) — public-safe wrappers + sanitizer
  └─ ceo_kb.json — hand-curated product knowledge base
  └─ Reuses ceo_persona._llm_generate (MiniMax → OpenRouter fallback)

Supabase (migration 011)
  ├─ ceo_chat_sessions
  ├─ ceo_chat_messages
  └─ ceo_chat_rate_limit (sliding-window counters per IP/bucket — no Redis dependency)
```

The widget is a single React component dropped into the existing site layout. The backend is a new FastAPI module that **reuses** `_llm_generate` and the data-feed aggregator from `ceo_persona.py` — no duplication. Memory and identity live in Supabase, not localStorage, so the same person is recognized across devices once they re-identify.

## 4. Conversation Flow

### 4.1 Page load
- Widget mounts silent — small floating dot, brand-emerald accent.
- `/ceo/chat/greeting?path=/pricing&lang=en` is prefetched server-side (Next.js Route Handler proxies to FastAPI, 5-min cache).

### 4.2 Activation
- After 60s dwell on page **or** manual click on the pill: pill pulses gently for 2s, then expands to greeting card.
- Greeting is page-aware **and** browser-language-aware. **Browser language wins for the initial paint** (before any user message); per-message language detection in 4.3 takes over from the first user turn onward.
  - `/pricing` (en): "AED 3K setup, 1.5–8K/mo. Want me to walk you through what fits your industry?"
  - `/services` (ar): "هلا. شفت الـcontent engine؟ يكتب 30 بوست بالشهر لمطعمكم بالعربي. تحب أوريك؟"
- Greeting card shows 2–3 quick-reply chips appropriate to the page.

### 4.3 Conversation
- Visitor types → `POST /ceo/chat` with `{ session_id, message, page_url }` → SSE stream of tokens.
- Per turn: detect language of the **user's message**, respond in that language. Code-switching mid-conversation is allowed (Gulf style).
- Rami can call internal tools mid-response (Section 5).
- Responses streamed token-by-token via SSE.
- Manual EN/AR toggle in the widget header overrides auto-detect when the user wants.

### 4.4 Identity binding (organic, never gated)
- Each user message gets a cheap Haiku-class NER pass:
  - Input: "btw I'm Ahmad from Riyadh Real Estate, my whatsapp is +966…"
  - Output: `{ name, company, email, whatsapp, confidence: "confirmed" | "inferred" }`
- "confirmed" = explicit ("I'm X", "we're Y", "my email is Z").
- "inferred" = implicit ("we run a salon in Jeddah") → store as a tag, do **not** bind PII.
- If a session already has `identity_email` and a new email appears: Rami asks "wait — is this still Ahmad, or someone else on your team?" before overwriting.
- **No name/email forms ever.** He's the demo.

### 4.5 End states
- Visitor closes tab → session row stays warm 30 days, cookie keeps the id.
- Visitor returns later → "Welcome back, Ahmad. Last we talked about lead routing for Riyadh Real Estate. Anything change?"
- Rami may organically drop links (`/book-audit`, `/pricing`, `/services`) when contextually relevant — but never as a hard CTA.
- He does NOT collect emails to email later. No CRM push. No human handoff.

### 4.6 Cross-device merge
- If a returning visitor on a NEW device gives an email matching an existing session, the two sessions merge: messages get rewritten to the older `session_id`, `first_seen` is preserved, the new cookie now points to the merged id.
- **Merge must run before any UPDATE that would set `identity_email` on a session whose email would collide with an existing row** — otherwise the `UNIQUE` constraint in 6.2 throws an error instead of triggering merge. Implementation: identity-bind path checks `SELECT id FROM ceo_chat_sessions WHERE identity_email = $1` first; if found and different from current session, run merge transaction.
- **Field-level merge precedence:** older session wins for `identity_name`, `identity_company`, `identity_whatsapp` if both rows have a value. New session's value fills any gaps. `tags` are unioned. `summary` is regenerated from the merged message history on next turn.

## 5. Live Data Feeds

Tools the LLM may call mid-response. Each is a thin wrapper over `ceo_persona.py` internals with a public-safe sanitizer.

```
get_live_metrics()                     ← cached 5min, public-safe aggregates
  Returns: { active_clients, conversations_last_30d (rounded to 10k),
             languages_supported, industries_live, avg_resolution_rate,
             karpathy_rules_active }

get_saffron_demo_snapshot()            ← cached 5min, real numbers
  Returns: { convos_24h, most_asked_question, avg_response_seconds,
             languages_handled, sample_resolved }

get_latest_karpathy_insight()          ← cached 1h, anonymized
  Returns the most recent rule the system learned across the fleet.
  Source: iterate top 5 most recently active clients
    (SELECT id FROM clients ORDER BY updated_at DESC LIMIT 5),
  call karpathy_loop.get_rule_status(client_id) for each, pick the
  rule with the most recent created_at across all returned rules.
  Then pass through the sanitizer to strip any client_id / business names.
  The widget does NOT re-derive rules — it only reads existing ones.

get_product_fact(topic)                ← static KB, no cache
  topics: pricing | stack | timeline | industries | onboarding | competitors
  Returns a short factual paragraph from /opt/prompt-builder/ceo_kb.json.

get_recent_shipped()                   ← cached 30min, real
  Last 3 shipped features from the changelog.
```

### 5.1 Sanitizer (single source of truth — `ceo_chat_tools.sanitize()`)
- Real client names → only **Saffron Demo Restaurant** passes through.
- Real client metrics → bucketed/rounded for any non-Saffron client.
- Revenue, MRR, churn, costs → never exposed.
- Founder personal info → never exposed.

### 5.2 LLM tool wiring
- Tool definitions are passed to the LLM as JSON-schema function specs on each turn.
- System prompt instructs Rami to use them **for credibility, not to spam numbers**.
- Tool calls render inline in the UI as a small pill ("🔍 checking live metrics…") that resolves into the data, not as a separate bubble.

## 6. Memory & Identity

### 6.1 Cookie
- `ceo_session_id = <uuid>` — 1y, HttpOnly, SameSite=Lax, Secure.

### 6.2 Schema (Supabase migration 011)

```sql
CREATE TABLE ceo_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_name TEXT,
    identity_company TEXT,
    identity_email TEXT UNIQUE,                    -- unique-when-set
    identity_whatsapp TEXT,
    identity_confidence TEXT CHECK (identity_confidence IN ('inferred','confirmed')),
    browser_lang TEXT CHECK (browser_lang IN ('ar','en')),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    last_page TEXT,
    total_messages INT DEFAULT 0,
    summary TEXT,                                  -- Rami's running brief, refreshed every 10 turns
    tags TEXT[] DEFAULT '{}'                       -- e.g. ["restaurant_owner","ksa","cost_sensitive"]
);

CREATE TABLE ceo_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ceo_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
    content TEXT NOT NULL,
    language TEXT,
    page_url TEXT,
    llm_model TEXT,
    tokens INT,
    tool_call JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ceo_chat_sessions_email ON ceo_chat_sessions(identity_email)
    WHERE identity_email IS NOT NULL;
CREATE INDEX idx_ceo_chat_messages_session ON ceo_chat_messages(session_id, created_at DESC);

ALTER TABLE ceo_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ceo_chat_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON ceo_chat_messages FOR ALL USING (auth.role() = 'service_role');
```

### 6.3 Context window management
Per turn, Rami sees:
- System prompt (persona + tool defs + language rules + sanitizer rules).
- `session.summary` (his own running brief).
- Last 8 messages verbatim.
- Identity row (if present).

Older messages are summarized into `session.summary` every 10 turns and dropped from the prompt to keep cost predictable.

### 6.4 Privacy controls (visible in widget footer)
- "Memory: ON · what does Rami remember?" → opens identity panel, shows the row + summary.
- "Forget me" → confirms, then `DELETE FROM ceo_chat_sessions WHERE id = $1` (cascades to messages), drops cookie.
- Footer links to a privacy page mentioning UAE PDPL and KSA PDPL.

## 7. Rate Limiting, Abuse, & Cost Control

### 7.1 Rate limits (per IP, sliding window in Supabase — no Redis dependency)
- 5 messages / 60 seconds — burst limit, friendly throttle message.
- 30 messages / hour — sustained limit.
- 100 messages / 24h — sets cooldown until next day.
- Whitelist (founder IP, dev IP) bypasses all of the above.
- Implementation: `ceo_chat_rate_limit` table with composite key `(ip, bucket_start_minute)`, atomic `INSERT … ON CONFLICT DO UPDATE SET count = count + 1`. Sliding-window check sums the last N rows. Old buckets pruned via daily cron `DELETE WHERE bucket_start_minute < NOW() - INTERVAL '25 hours'`.

### 7.2 Per-session limits
- 50 messages total per session.
- At 40 messages, Rami suggests "we've covered a lot — drop me your WhatsApp if you want to keep going async" (gentle exit, still no human handoff).

### 7.3 Prompt injection defense
- User input is never spliced into instructions; it's passed as a discrete `<user_message>` turn with strict role boundaries.
- Pattern detector for common injection markers ("ignore previous", "you are now", `system:`, `[INST]`, etc.) → Rami responds in character ("Nice try, brother. Won't work on me.") and the turn counts as **3 messages against all three rate-limit buckets** (60s, hour, 24h).
- Output filter: if the model attempts to leak the system prompt or claim a non-Rami identity, the response is rewritten via the OpenRouter fallback path.

### 7.4 Content filter (cheap Haiku pre-pass on user input)
- Slurs / hate / explicit sexual content → 24h IP block, polite session end.
- Self-harm signals → Rami breaks character briefly, links a hotline appropriate to KSA/UAE (Estijaba 920033360 for KSA, 800 HOPE for UAE), ends conversation.
- Off-topic spam (crypto pumps, scrapers) → silent 429.

### 7.5 Cost ceiling
- Hard daily ceiling: `CEO_CHAT_DAILY_USD_CEILING=5.00` (env-configurable).
- 50% reached → WhatsApp ping to founder.
- 80% reached → WhatsApp ping + Rami switches to MiniMax-only (no Claude fallback) and drops streaming for one-shot responses.
- 100% reached → WhatsApp ping + widget shows "Rami's catching up on briefs — back in a few hours. Try `/book-audit` in the meantime." Page does not break.

### 7.6 Budget math (rough)
- MiniMax M2.7: ~$0.0008 / turn (incl. reasoning tokens).
- Identity-extraction Haiku pass: ~$0.0001 / turn.
- Live-data tool calls: free (cached aggregates).
- Average session ≈ 8 turns → ~$0.007 / session.
- $5/day ceiling ≈ ~700 sessions/day before throttle.

## 8. Visual Design

### 8.1 Pill (closed)
- Bottom-right, 16px from edges, mobile-safe.
- 56×56 circle, brand-emerald (`#10b981`) accent on dark backdrop.
- Avatar inset: Rami headshot v2 (the new face), cropped circle.
- After 60s dwell: subtle 2s breathing pulse, twice, then idle.
- Tiny green dot top-right of pill = "Rami is online" (always green; he's an AI).
- ARIA label: `"Open chat with Rami"` / `"افتح المحادثة مع رامي"`.

### 8.2 Card (open)
- 380px × 600px on desktop, full-screen sheet on mobile.
- Dark theme matching site (`#0a0a0a` bg, `#18181b` panels, emerald accents).
- **Header:** avatar (40px) + "Rami Mansour" + caption "Co-Founder, AI" + live dot ("● Online · using live data") + lang toggle (EN/AR) + minimize + close.
- **Greeting card** (pinned top, dismissable): page-aware hook + 2–3 quick-reply chips.
- **Message stream:**
  - User: right-aligned, emerald-tinted background.
  - Rami: left-aligned, neutral panel, avatar on first message in sequence.
  - Tool-call indicator: inline pill ("🔍 checking live metrics…") that resolves into the data inline.
  - Numbers in mono font for emphasis.
  - Streaming cursor while tokens arrive.
- **Input:** auto-grow textarea (max 4 lines), Send button (emerald), Cmd/Ctrl+Enter to send, RTL flips automatically when input is Arabic, "powered by Project Agent" link bottom-left.
- **Footer (collapsed by default):** "Memory: ON · what does Rami remember?", "Forget me", privacy + PDPL link.

### 8.3 Design principles
- Dark theme, emerald accent, no mascots, Linear/Vercel-grade restraint.
- Inter for UI, mono for numbers, no playful illustrations.
- Motion is purposeful: fade+slide for messages, no bounce, no spinners — skeletons only.
- Respects `prefers-reduced-motion`.

### 8.4 States
- **Idle** (offline / cost-ceiling hit): pill shows "Back soon" tooltip on hover, card disabled.
- **Throttled:** friendly inline message in card, input disabled with countdown.
- **Errored:** "Hiccup on my end, try again in a sec" in Rami's voice, retry button.

## 9. Module Layout

### 9.1 Backend (`/opt/prompt-builder/`)
```
ceo_chat.py              ← NEW (~250 LOC)
    FastAPI router, SSE streaming, cookie session resolution,
    identity NER pass, rate-limit guard, injection pre-pass,
    cost-ceiling check.

ceo_chat_tools.py        ← NEW (~150 LOC)
    Public-safe wrappers around ceo_persona internals + sanitizer.
    Each tool exposed as a JSON-schema function definition for the LLM.

ceo_kb.json              ← NEW
    Hand-curated product knowledge base.
    Topics: pricing | stack | timeline | industries | onboarding | competitors.

ceo_persona.py           ← UNCHANGED behavior; verify _llm_generate threads
                           tool definitions correctly to MiniMax + OpenRouter.

app.py                   ← +1 line: include ceo_chat router.
```

### 9.2 Frontend (`apps/website/`)
```
src/components/rami-widget/
    index.tsx             ← <RamiWidget /> mounted in layout.tsx
    pill.tsx              ← closed state + dwell timer + pulse
    card.tsx              ← open state shell, header, footer
    greeting.tsx          ← page-aware opener with quick-reply chips
    stream.tsx            ← SSE consumer + token rendering
    input.tsx             ← auto-grow textarea, RTL detection, lang switch
    message.tsx           ← user/assistant/tool-call bubbles
    identity-panel.tsx    ← "what does Rami remember?" + forget me
    use-session.ts        ← cookie + session bootstrap hook
    use-stream.ts         ← SSE hook with abort handling
    tokens.ts             ← color/spacing constants matching site theme

src/app/layout.tsx        ← REPLACE existing n8n widget script with <RamiWidget />
src/app/api/rami-greeting/route.ts ← Next.js Route Handler proxy (CORS + cache)
```

### 9.3 Supabase
```
supabase/migrations/011_ceo_chat.sql ← schema in Section 6.2
```

### 9.4 Config (`/etc/systemd/system/prompt-builder.service.d/ceo.conf`)
```
CEO_CHAT_DAILY_USD_CEILING=5.00
CEO_CHAT_RATE_LIMIT_WHITELIST=1.2.3.4,5.6.7.8   # comma-separated IPs (founder, dev, office)
# Rate-limit storage is Supabase (ceo_chat_rate_limit table) — no Redis required.
```

## 10. Integration Choices

1. **Existing n8n widget gets ripped out** of `apps/website/src/app/layout.tsx` (legacy Nadia widget, line 34). One-line removal in the same PR.
2. **Rate limiting uses Supabase** (`ceo_chat_rate_limit` table, see Section 7.1) — no Redis or new infra.
3. **`/ceo/chat/greeting` is server-rendered and cached 5 min** so the pill greeting feels instant; no LLM call on initial paint, just a templated hook from the KB.

## 11. Testing

### 11.1 Backend (pytest)
- Identity extraction: English, Arabic, mixed, edge cases (no PII, ambiguous, conflict with existing identity).
- Sanitizer: no real client name leaks, no revenue/MRR leaks, Saffron whitelist works.
- Rate limiter: burst limit, sustained limit, daily limit, whitelist bypass.
- Injection patterns trigger in-character refusal and burn 3 rate-limit slots.
- Cost ceiling: 50/80/100% paths each fire correct behavior.
- Session merge on email match across cookies preserves older `first_seen` and rewrites message `session_id`.
- `/forget/:sid` cascades to messages and returns clean.

### 11.2 Frontend (vitest + React Testing Library)
- Pill renders, pulses after 60s, opens on click.
- Greeting matches page+lang.
- SSE stream renders tokens in order, handles disconnect, retries.
- Language auto-detect on user message switches Rami's response language.
- RTL flips correctly when typing Arabic; toggle override works.
- Identity panel shows server state; "forget me" clears and drops cookie.
- `prefers-reduced-motion` respected — no pulse, no slide animations.

## 12. Out-of-Scope Deferred Items

These are deliberately not in v1 to keep scope tight:
- Voice or video.
- Multi-tenant (this widget is for the marketing site only).
- File / image attachments from visitors.
- Analytics dashboard for chat conversions (covered later by the CEO admin view, separate spec).
- A/B testing greeting variants.
- Rami initiating outbound (he only responds, never reaches out unprompted).

## 13. Success Criteria

- Widget loads on every marketing page without measurable LCP regression.
- First token from Rami in &lt; 1.5s p50 on a typical visitor session.
- 100% of visitor messages stored in `ceo_chat_messages`, 100% of identity bindings stored in `ceo_chat_sessions`.
- Sanitizer test suite passes — no real client name or revenue figure ever appears in a chat response.
- Cost stays under `CEO_CHAT_DAILY_USD_CEILING` for 30 consecutive days post-launch.
- Founder can read any conversation transcript by querying Supabase or via the (forthcoming) CEO admin view.
