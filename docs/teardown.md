# Public Teardown — `agents.dcp.sa/teardown`

Last updated 2026-05-13 (commit `9a993f9`)

A zero-auth viral acquisition surface. Any prospect pastes a UAE or Saudi SMB
website URL, gets back a multi-section AI analysis of their business in 30-150
seconds, and lands on a shareable permalink page. Every section is **grounded
in real crawl content** and (for the directory section) **verified by Firecrawl
search** — not LLM guesswork.

The teardown is the wedge between cold prospect and dashboard signup. Rami's
outbound DM strategy attaches a pre-generated teardown link. Editors and
investors pasting their own URL see immediately what the platform does.

## What it produces

A `TeardownPackage` written into `public_teardowns` and rendered at
`/teardown/[slug]`. Sections, in order:

| § | Section | Source | What it answers |
|---|---|---|---|
| A | The read | LLM (insight role) | What's distinctive about this business and where the positioning is fragile |
| B | A real reply | LLM (customer-facing) | What the AI WhatsApp concierge would say to a cold inquiry |
| C | The gaps | LLM with evidence field | Five customer questions the site doesn't answer, each citing what IS on site |
| D | The calendar | LLM (content draft) | Three on-brand Instagram captions |
| E | The SEO audit | LLM (technical, grounded) | 5-7 specific findings on title/meta/schema/alt/internal-links/viewport, each labeled good/weak/missing |
| F | The directories — verified | Firecrawl `/v1/search` + LLM enrichment | Confirmed and missing platform listings, each with `ai_take` + `recommendation` + `automation` |
| G | The playbook | LLM (grounded) | Five ship-this-week actions across marketing / seo / ads / ops / social |
| H | The voice mirror | LLM (grounded) | Three voices: founder LinkedIn post, customer 5-star review, WhatsApp first greeting |

§ F is the only section that's evidence-grounded by direct search. The others
are LLM-grounded by the actual crawl corpus (the model receives the page text
and is instructed to quote, not invent).

## URL surface

| URL | What it does |
|---|---|
| `agents.dcp.sa/teardown` | Public form: paste URL, submit, redirect to permalink |
| `agents.dcp.sa/teardown/[slug]` | Permalink page (Server Component); bumps view_count on render; OpenGraph metadata seeded from the insight paragraph |
| `agents.dcp.sa/app/api/teardown` | The POST endpoint the form hits (Vercel-side) |
| `n8n.dcp.sa/web/crawl` | VPS-side multi-page fetch + LLM extraction |
| `n8n.dcp.sa/web/verify-listings` | VPS-side directory verification + per-platform AI enrichment |

The marketing site (`apps/website`) rewrites `/teardown`, `/teardown/:slug`, and
`/api/teardown` to the dashboard project's `/app/*` paths via
`next.config.js`. This keeps the public URL clean (no `/app` prefix visible).

## Architecture

```
                                  agents.dcp.sa/teardown
                                          │
                       form submit POST /api/teardown {url, refresh?}
                                          │
                                          ▼
              ┌─────────────────────────────────────────────────────┐
              │  /app/api/teardown/route.ts  (Vercel function)     │
              │                                                     │
              │   1. 24h URL cache check (public_teardowns)        │
              │   2. IP rate limit (5/hour)                        │
              │   3. country + category inference                  │
              │   4. POST n8n.dcp.sa/web/crawl  ───┐              │
              │   5. 8 parallel tasks:              │              │
              │       - 7× POST .../inference/chat  │ Promise.all  │
              │       - 1× POST .../web/verify-     │              │
              │         listings (with corpus)  ────┘              │
              │   6. Parse JSON / slug-generate / persist          │
              │   7. Return 200 {ok, slug, package}                │
              └────────────────────┬────────────────────────────────┘
                                   │
                                   ▼
                          public_teardowns table  ←  /teardown/[slug] render
                                                     bumps view_count
```

### Vercel side: `apps/client-dashboard/src/app/api/teardown/route.ts`

The orchestrator. Reads the URL, normalizes, checks the cache, rate-limits,
infers country (AE/SA) + category (restaurant/beauty/default), calls the VPS
crawl, fans out 8 parallel tasks, parses each, persists, returns.

Key implementation details:
- `db()` bound to a local `const sql = db()` before any `${sql.json(...)}`
  interpolation. Production singletons aren't cached, so two `db()` calls in
  the same query expression return different postgres-js instances and the
  inner `.json()` marker is silently dropped, causing UPDATE no-ops. Bind once.
- `maxDuration = 240` because Firecrawl + 7 LLM tasks frequently exceed
  Vercel's default 60s.
- All 7 LLM tasks share a `groundingBlock` string with explicit "quote, don't
  invent" rules and the full crawl corpus. Without grounding the model
  hallucinates plausible-sounding facts (we caught this on FAQ gaps before
  v2).

### Vercel side: `apps/client-dashboard/src/app/teardown/[slug]/page.tsx`

Server Component. Loads from `public_teardowns` by slug, returns
`notFound()` on miss. Two loads internally:
- `loadTeardown(slug, true)` for the render — runs `UPDATE … SET
  view_count = view_count + 1, last_viewed_at = NOW() WHERE slug=$1
  RETURNING …`
- `loadTeardown(slug, false)` for `generateMetadata` — pure SELECT so
  prerenders don't double-count

OpenGraph title + description seeded from the insight paragraph so share
previews land well on WhatsApp / X / LinkedIn.

### VPS side: `backend/prompt-builder/app.py`

Two endpoints, both reachable through nginx at `n8n.dcp.sa`:

**`POST /web/crawl`** — multi-page fetch + structured extraction.

Two-stage fetcher in `_fetch_page`:
1. **Firecrawl primary** if `FIRECRAWL_API_KEY` is configured. Returns
   cleaner main-content extraction and reaches JS-rendered + Cloudflare-
   protected sites that defeat plain curl.
2. **Subprocess curl fallback.** Real browser headers, Accept-Language
   `en-US,en;q=0.9,ar;q=0.8`, 8s connect / 15s total timeout.

Crawls up to 16 known paths in parallel (`/`, `/about`, `/services`,
`/menu`, `/faq`, `/contact`, `/team`, `/testimonials`, `/reviews`, etc).
Strips HTML, runs ONE LLM extraction pass against the combined content,
returns the structured `CrawlResult` plus the raw `pagesText` corpus.

`pagesText` is what makes downstream grounding work — the LLM tasks get
the actual scraped content, not just the structured fields.

**`POST /web/verify-listings`** — directory verification + AI enrichment.

Input: `{business_name, country, category, business_context?}`.

For each candidate platform in `_DIRECTORY_CATALOG[country][category]`:
- Build a query like `"<business_name>" site:zomato.com`
- POST to Firecrawl `/v1/search`, take top 4 results
- If any result URL contains `match_host` → confirmed, store the URL
- Else → missing

**Google Maps / Business Profile is special-cased.** `site:google.com/maps`
filters fail because Google doesn't expose Maps indexing. The code falls
back to bare-name queries (`"<business_name>"`, then with `Dubai`, then
with `restaurant`) and looks for ANY `maps.google.*` / `google.com/maps` /
`g.page` URL. Still imperfect — Maps verification is the weakest link.

After verification, if `business_context` was supplied, one LLM enrichment
call runs. Input: all confirmed + missing + the crawl corpus. Output: per-
platform `{ai_take, recommendation, automation}`.

The enrichment prompt frames the LLM as the owner sitting at their laptop
deciding what to fix this week. Strict-JSON output via the `json_mode` flag
on `inference.chat`. Failure → returns verification-only (`enriched:false`).

### Database

```sql
CREATE TABLE public_teardowns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  url             text NOT NULL,
  business_name   text NOT NULL,
  country         text CHECK (country IN ('AE', 'SA')),
  package         jsonb NOT NULL,
  source_ip       inet,
  view_count      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  last_viewed_at  timestamptz
);

CREATE INDEX public_teardowns_url_idx ON public_teardowns (url);
CREATE INDEX public_teardowns_created_at_idx ON public_teardowns (created_at DESC);
CREATE INDEX public_teardowns_source_ip_idx ON public_teardowns (source_ip, created_at DESC);
```

Migration: `supabase/migrations/014_public_teardowns.sql`, also adapted into
`infrastructure/agents-platform/migrations/_transform.py`. Applied to
production Postgres on 2026-05-13.

## The `TeardownPackage` JSON shape

```typescript
interface TeardownPackage {
  // Identity
  business_name: string;
  url: string;
  generated_at: string;
  pages_scanned: number;
  brand_voice: string;

  // Original 4 artifacts (LLM-grounded against the crawl corpus)
  insight: string;
  sample_reply: string;
  social_posts: string[];
  faq_gaps: { question: string; draft_answer: string; evidence?: string }[];

  // Richer sections (LLM-grounded)
  seo_findings: {
    area: string;
    status: "good" | "weak" | "missing";
    detail: string;
    action: string;
  }[];
  quick_wins: {
    category: "marketing" | "seo" | "ads" | "ops" | "social";
    action: string;
    rationale: string;
    estimated_impact: string;
  }[];
  brand_mirror: {
    owner_voice: string;       // founder LinkedIn post
    customer_review: string;   // 5-star review
    whatsapp_greeting: string; // first agent message
  } | null;

  // NEW: directory_strategy — Firecrawl-verified + LLM-enriched (replaces directory_gaps)
  directory_strategy?: {
    confirmed: DirectoryEntry[];
    missing: DirectoryEntry[];
    checked: number;     // how many platforms we searched
    enriched: boolean;   // false → LLM enrichment failed, only data fields populated
  };

  // LEGACY: directory_gaps — kept on the type so older permalinks render
  directory_gaps?: { platform: string; why_it_matters: string; signup_url: string }[];
}

interface DirectoryEntry {
  platform: string;       // "Zomato UAE", "TripAdvisor", etc
  why: string;            // why this platform matters (from catalog)
  signup_url: string;     // claim/signup URL
  evidence_url?: string;  // present on confirmed entries — the listing URL we found
  ai_take: string;        // owner-perspective: what this fact MEANS
  recommendation: string; // owner-perspective: what to do THIS WEEK
  automation: string;     // owner-perspective: what the agent will automate post-signup
}
```

## The grounding contract

Every LLM task gets a `groundingBlock` prepended to its prompt:

```
BUSINESS CONTEXT
================
Business: Arabian Tea House
Country: United Arab Emirates
Description: …
Brand voice: …
…

ACTUAL SITE CONTENT (verbatim crawl)
====================================
<up to 12k chars of raw page text from the crawled pages>

GROUNDING RULES — apply to ALL output below:
- Quote or paraphrase ONLY what's in the site content above.
- If you can't find evidence for a claim, say "(not verified on site)".
- Never invent prices, hours, certifications, awards, or testimonials.
- This is for a UAE/Saudi market.
```

This block is what makes the FAQ gaps cite real questions vs site coverage,
and what makes the insight paragraph name specific dishes / locations /
claims from the site instead of generic restaurant prose.

## Configuration

Environment variables (prompt-builder side, set in
`/etc/systemd/system/prompt-builder.service.d/firecrawl.conf` for the
Firecrawl key):

| Var | Purpose | Where set |
|---|---|---|
| `FIRECRAWL_API_KEY` | Primary fetch via `/v1/scrape`, listing verification via `/v1/search` | systemd drop-in |
| `MINIMAX_API_KEY` | Current LLM provider for every inference role (post OpenRouter rotation) | systemd Environment= |
| `OPENROUTER_API_KEY` | Closed-source roles when the key is valid (currently rotated out) | systemd Environment= |
| `JWT_SECRET` | Auth — used by `agents-auth` container only | docker compose |

Dashboard side (Vercel env):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | `postgres://agents_app:…@db.agents.dcp.sa:5433/agents?sslmode=require` |
| `PROMPT_BUILDER_URL` | `https://n8n.dcp.sa` (defaults to this; only set if proxying differently) |
| `JWT_SECRET` | Session cookie validation |

The directory catalog `_DIRECTORY_CATALOG` is in `backend/prompt-builder/app.py`
and is **code-not-config** today. Adding a new market or category means a code
change + a prompt-builder restart. That's intentional — these lists need to be
curated, not LLM-generated.

## How to extend a section

Adding a new richer section follows a pattern:

1. **Define the data shape** as a TypeScript interface in
   `apps/client-dashboard/src/app/api/teardown/route.ts`.
2. **Add the field** to `TeardownPackage` as optional (so older permalinks
   keep rendering).
3. **Decide the grounding mode:**
   - LLM-only with corpus grounding → add an `inferenceJsonChat(...)` task
     inside `Promise.all([…])`. Re-use `groundingBlock`. Define the JSON
     schema in the prompt explicitly.
   - Verified by external data → write a new endpoint on prompt-builder
     (e.g., `/web/lookup-reviews`), call it from the parallel block via a
     thin async helper like `fetchDirectoryStrategy`.
4. **Parse defensively.** Every JSON-output task should pipe through
   `jsonSliceOrNull(...)` and a schema validator before populating the field.
   On parse failure, leave the field undefined — the renderer hides it.
5. **Render in `teardown-report.tsx`.** Add a `{pkg.your_field && <Section
   …/>}` block. Use existing components (`Block`, `VoiceCard`) where
   shapes match. Maintain the eyebrow / serif title / paper background look.

For sections that need the owner-perspective AI enrichment (AI take +
recommendation + automation), the cleanest pattern is:
- A verification or extraction step produces structured data
- A SINGLE LLM enrichment call takes all the structured data + the corpus
  and adds the three fields per item

That keeps prompts focused (one job each) and the LLM cost predictable.

## Known limitations

- **Firecrawl search variance.** Top-N results vary per query — same query
  can return the platform listing in one run and travel-blog mentions in
  the next. Mitigations: `limit=4` could be bumped to `8`, query variations
  can be retried. Today this manifests as ~10-15% of platform statuses
  flipping between runs.
- **Google Maps / Business Profile detection is the weakest link.** Google
  doesn't expose Maps to search engine indexing. The fallback bare-query
  pattern catches some Maps URLs but not all. Maps verification will
  always be best-effort until we wire the Google Places API directly.
- **MiniMax-only inference today.** OpenRouter key was rotated out 2026-05
  and the closed-source roles failover to MiniMax M2.7. JSON-output
  quality is meaningfully lower than Claude Sonnet on schema-heavy tasks
  (5-7% JSON parse failures vs ~0% on Claude). Restoring the OpenRouter
  key + reverting the `was: …` markers in `ROUTING` lifts quality
  immediately.
- **Crawl reach.** Some UAE/Saudi sites (Cloudflare-protected restaurant
  chains, JS-only React apps) still fail both Firecrawl and curl. The
  fail-soft path returns `{error: "crawl_failed"}` with a 422 to the form
  — the form shows the specific error message back to the user.
- **No category override on the public form.** The form infers category
  from crawl keywords. A business that doesn't crawl cleanly may land in
  the `default` category which has fewer platform candidates. The
  endpoint accepts a `category` body field; the UI doesn't expose it yet.

## Caching + cost

- **24h URL cache.** Same URL within 24h returns the existing slug +
  package, zero LLM cost, identical shareable URL. The `refresh:true` body
  flag bypasses for manual regeneration.
- **5/IP/hour rate limit.** Bounds the cost of any single visitor or bot
  hammering the form. Sliding window via `SELECT COUNT(*) … WHERE
  source_ip=$1 AND created_at > NOW() - interval`.
- **Per-teardown LLM cost.** 7 inference tasks (typical 800-2000 tokens
  each) + 1 enrichment task. On MiniMax M2.7 at current pricing, ~$0.04
  per fresh teardown. Repeats inside the 24h window are free.
- **Per-teardown Firecrawl cost.** 1 scrape (the home page) + 10-16
  page fetches (the path enumeration) when curl fails over to Firecrawl +
  10 verification searches. Typical: 20-25 Firecrawl credits per fresh
  teardown.

## Operational runbook

**Backfill an existing tenant's teardown.** Use the admin endpoint:
```
POST https://agents.dcp.sa/app/api/admin/day-one/<client_id>
```
This re-runs the full day-one package, not the public teardown. To
promote an existing day-one package into a public teardown row, see
the inline SQL in `infrastructure/agents-platform/migrations/_transform.py`
referenced by the `saffron-kitchen-demo` + `jareed-coffee-demo` slugs.

**Force-regenerate a permalink.** POST `/api/teardown` with the same URL
and `refresh:true`. The new generation overwrites in-place (the slug is
preserved? — actually creates a new slug; the old one stays for
backward links).

**Check Firecrawl key.** SSH to VPS, `cat
/proc/$(pgrep -f 'app:app --host 0.0.0.0 --port 8200' | head -1)/environ |
tr '\0' '\n' | grep FIRECRAWL`.

**Check verification works.** Direct curl:
```
curl -X POST https://n8n.dcp.sa/web/verify-listings \
  -H 'Content-Type: application/json' \
  -d '{"business_name":"Arabian Tea House","country":"AE","category":"restaurant"}'
```

**View recent teardowns.** Direct SQL on prod:
```
SELECT slug, business_name, view_count, created_at
FROM public_teardowns
ORDER BY created_at DESC
LIMIT 20;
```

## Demo URLs

| URL | Source |
|---|---|
| https://agents.dcp.sa/teardown/saffron-kitchen-demo | Promoted from internal Saffron day-one package |
| https://agents.dcp.sa/teardown/jareed-coffee-demo | Promoted from internal Jareed day-one package |
| https://agents.dcp.sa/teardown/arabianteaho-5hqtsw | Live-generated 2026-05-13 with verified directory section + AI enrichment |

## What's next

Backlog after this rollout:
- **Variance fix on directory verification.** Bump search `limit=4` → `8` +
  add a second query variation when the first returns zero matches.
- **Same 4-part shape on other sections.** SEO findings, quick wins, and FAQ
  gaps could each get `ai_take` + `recommendation` + `automation` per item
  — the directory section pattern is the template.
- **Google Places API for GBP.** Eliminates the Maps verification weak link.
- **Real review mining.** Scrape Google Reviews / TripAdvisor reviews per
  outlet and surface 1-star / 3-star sentiment with a per-complaint draft
  response. Highest-leverage section we don't have. Open-source
  candidates: `gosom/google-maps-scraper` (★4k), `gaspa93/googlemaps-scraper` (★504).
- **News + social mentions via SearXNG.** Self-hosted meta-search aggregator
  (★29k). Adds `"<business_name>" site:linkedin.com OR site:instagram.com
  OR …` to surface off-site mentions of the business.
- **Competitor radar.** Pass business lat/lng to `gosom/google-maps-scraper`,
  return 20-50 nearby competitors with hours, ratings, contact info. Adds a
  full new section.
- **Public showcase on the marketing homepage.** `SELECT FROM
  public_teardowns WHERE view_count > N ORDER BY created_at DESC LIMIT 6` —
  social proof for new visitors.
