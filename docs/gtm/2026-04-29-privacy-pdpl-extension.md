# Privacy page extension — PDPL coverage for product (not just chat widget)

**Date:** 2026-04-29
**Status:** Draft for human review before going live on `/privacy`
**Scope:** Add 5 sections to `apps/website/src/app/privacy/page.tsx`. Existing "Ask Rami chat widget" + "Your rights" stay. New sections sit between them and the Arabic mirror.

---

## Why this matters

Current `/privacy` covers only the Ask Rami chat widget. It says nothing about the actual product (the customer-facing AI agent on a client's WhatsApp). Any UAE/KSA restaurant doing legal scrub before signing will reject silence on:

- Where customer messages live
- Who else processes them (sub-processors)
- How long they're kept
- Data residency options
- Breach notification SLA
- End-customer deletion rights (the *restaurant's customers*, not just the restaurant)

This is the deal-blocker for the "founding 5" outreach. Without it, no legal-savvy owner signs.

---

## SECTION 1 — Customer WhatsApp data

> **What we capture, on behalf of our client (the business owner):**
> - Inbound and outbound WhatsApp messages between the client's customers and the AI agent
> - Customer name and phone number (provided by Meta via WhatsApp)
> - Preferences and facts the AI extracts from conversation (e.g., "prefers terrace seating", "nut allergy")
> - Booking, order, and complaint history tied to the customer phone number
> - Sentiment scores and engagement segments (VIP, Loyal, At Risk, Lapsed)
>
> **What we never capture:**
> - Payment card numbers (we hand off to the client's payment system)
> - Photos or attachments beyond what the customer sends
> - Location beyond what the customer volunteers
> - Browsing behavior outside WhatsApp
>
> **Who owns this data:**
> The client business is the **data controller** for their customer data. Project Agent (DCP) acts as the **data processor** under a Data Processing Agreement (DPA). The client decides retention, deletion, export — we execute.
>
> **Retention defaults:**
> - Active conversations: indefinite while the client account is active
> - Customer profile: indefinite while the client account is active
> - On client off-boarding: 30-day soft delete, then permanent erasure (excluding what we are legally required to retain)
> - Per-customer opt-out: the AI agent honors any "stop", "حذف", or "delete my data" request from an end-customer within 24h, and notifies the client owner
>
> **Encryption:**
> - In transit: TLS 1.3 between WhatsApp ↔ Kapso ↔ our backend
> - At rest: AES-256 in Supabase (managed encryption); vault notes additionally encrypted application-side

---

## SECTION 2 — Sub-processors

> We use a small number of vetted sub-processors. Each receives only the data needed to perform its specific function.
>
> | Sub-processor | Purpose | Data sent | Region |
> |---|---|---|---|
> | **Anthropic** (Claude Sonnet 4.6 + Haiku 4.5) | Customer-facing AI replies + intent classification | Conversation context, persona prompt | US (with regional EU option on roadmap) |
> | **MiniMax** (M2.7) | Owner Brain replies, memory analysis, Rami CEO chat | Conversation context, vault notes | China-routed (UAE residency option on roadmap for Enterprise) |
> | **OpenAI** (text-embedding-3-small) | Vault note vector embeddings | Note text | US |
> | **Kapso** | WhatsApp Business API multi-tenant gateway | All WhatsApp messages | US (Meta data residency rules apply per Meta's terms) |
> | **Supabase** | Primary database, Auth, Postgres + pgvector | All client + customer data | Asia-Northeast 1 (Tokyo). UAE residency: roadmap. |
> | **Composio** | Per-agent OAuth tool integrations | Scope-minimized tokens only, no message bodies | US |
> | **Vercel** | Marketing site + dashboard hosting | Page requests, no PII at the edge | Global edge with EU + US primary |
> | **Hostinger VPS** | FastAPI prompt-builder, Mem0, n8n | Conversation context for prompt assembly | Netherlands (EU) |
> | **Resend** | Transactional auth emails | Email address only | EU + US |
>
> We will publish updates to this list at least 30 days before adding a new sub-processor that touches client data.

---

## SECTION 3 — Data residency

> **Default region:** Asia-Northeast 1 (Tokyo) for primary data storage (Supabase).
>
> **UAE residency option (Enterprise):** Available on Enterprise tier. Includes:
> - Supabase project provisioned in UAE region (when generally available, currently roadmap)
> - LLM calls routed via region-locked Anthropic / MiniMax endpoints
> - VPS workloads migrated to a UAE-based provider
> - Signed addendum to the DPA confirming residency
>
> **Why not UAE by default today:** Supabase has not yet generally released a UAE region. We track this and will migrate Enterprise customers as soon as it is available. Tokyo is the closest currently available region for our stack and provides sub-300ms latency for Gulf users.

---

## SECTION 4 — Breach notification

> If we detect or are notified of a personal data breach affecting a client's data:
>
> - **Within 24h** of confirming the breach, we notify the client account owner via email and WhatsApp
> - The notification includes: nature of the breach, categories of data affected, approximate number of records, our investigation status, and recommended actions for the client
> - We will support the client in any onward notification to UAE PDPL authorities or KSA SDAIA as required
> - We retain a public incident log on `agents.dcp.sa/security/incidents` (currently empty)
>
> Our SLA target is faster than the 72h required by UAE PDPL Article 9.

---

## SECTION 5 — Deletion on request

> **The client (business owner) can:**
> - Export all their data via the dashboard at any time
> - Request full deletion via email — we complete within 30 days, with confirmation
> - Receive a signed certificate of deletion on request
>
> **An end-customer of a client can:**
> - Send "stop", "حذف", "delete my data", or any equivalent intent to the AI agent on WhatsApp — the agent honors it within 24h and notifies the client owner
> - Email `privacy@dcp.sa` directly — we will route to the appropriate client and confirm completion
> - Request a copy of what we hold about them — we provide within 30 days
>
> **What we cannot delete:**
> - Records we are legally required to retain (tax, regulatory)
> - Aggregated and anonymized analytics where the individual cannot be re-identified

---

## SECTION 6 — Arabic mirror (extension)

The existing Arabic block at the bottom of `/privacy` only covers the Ask Rami widget. It needs an addition mirroring the above sections at a high level:

```
نتعامل مع بيانات عملاء عميلنا (المنشأة) كـ "مُعالج بيانات" وفقاً لاتفاقية معالجة البيانات (DPA). المنشأة هي "مراقب البيانات" — هي اللي تحدد فترة الاحتفاظ والحذف والتصدير. نستخدم عدد محدود من مزودي الخدمات (Anthropic, MiniMax, OpenAI, Kapso, Supabase) — كل واحد يستلم فقط البيانات اللازمة لأداء دوره. منطقة التخزين الافتراضية: طوكيو. خيار الإقامة في الإمارات متاح في خطة Enterprise. في حال أي خرق للبيانات نخبرك خلال 24 ساعة. عملاء عميلنا يقدرون يطلبون الحذف بإرسال "حذف" أو "stop" للوكيل في واتساب — يُنفّذ خلال 24 ساعة.
```

---

## Open questions for the human reviewer

Before I port this to the live page, please confirm:

1. **Email address.** Current page uses `privacy@project-agent.ae`. Above I switched to `privacy@dcp.sa` (consistent with the rest of the site). Which is real and monitored?
2. **Sub-processor list — accurate?** I listed what's in the technical spec. Did I miss any (Sentry, posthog, etc.)? Any to remove?
3. **MiniMax China-routed.** Is this still accurate, or has the M2.7 endpoint moved? This is the most likely deal-blocker for security-conscious buyers.
4. **24h breach notification.** Achievable operationally? UAE PDPL requires 72h; 24h is a marketing commitment we have to keep. If 48h is more honest, say so now.
5. **Incident log URL** (`agents.dcp.sa/security/incidents`). Should I create the page (currently empty)? Or remove the line?
6. **DPA template.** Do we have one? A founding-5 customer will ask for it. If not, we need a 1-page template. I can draft that next.
7. **Public sub-processor change-log SLA** (30 days notice). Is that the commitment you want? Some vendors do 14, some 30.

---

## Proposed delivery

Once you approve (or correct), I will:

1. Edit `apps/website/src/app/privacy/page.tsx` to add the 5 new English sections + extend the Arabic mirror
2. Add a "Last updated: 2026-04-29" line at the top
3. Bundle into the same commit as the subagent's Phase 5-7 work (single Vercel deploy)

Total page length will roughly double, from ~90 LOC to ~200 LOC.
