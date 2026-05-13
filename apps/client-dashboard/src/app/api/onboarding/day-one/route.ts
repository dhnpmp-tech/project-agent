// POST /api/onboarding/day-one
//
// Generates the "day-1 deliverables" package right after a new tenant
// completes onboarding. Returns four AI-generated assets the owner can
// see on their first dashboard load:
//
//   1. Business insight — one paragraph showing the agent "noticed" them
//   2. Three social posts — pre-drafted in the brand voice
//   3. Sample WhatsApp customer reply — a believable, on-brand response
//   4. Welcome message — what the agent will say to the owner's first customer
//
// All four go through the central inference router on the prompt-builder
// service (which knows how to route to DCP-served open-source models vs
// vendor APIs per role). Results land in
// business_knowledge.crawl_data.day_one and surface on the dashboard.
//
// Fire-and-forget from the onboarding submit handler; this endpoint
// completes in 5–30 seconds depending on which roles route to DCP.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

interface KnowledgeRow {
  business_description: string | null;
  brand_voice: string | null;
  business_hours: string | null;
  services: string[] | null;
  faq: { question: string; answer: string }[] | null;
  contact_info: Record<string, unknown> | null;
  crawl_data: Record<string, unknown> | null;
}

interface CompanyRow {
  company_name: string;
  company_name_ar: string | null;
  country: "AE" | "SA";
}

interface GbpAuditSummary {
  score: number;
  max_score: number;
  grade: "A" | "B" | "C" | "D";
  composio_connected: boolean;
  top_wins: { field: string; recommendation: string }[];
  audited_at: string;
}

interface FaqGap {
  question: string;
  draft_answer: string;
}

interface DemoTranscriptTurn {
  speaker: "customer" | "agent";
  text: string;
}

interface DemoTranscript {
  scenario: string;        // e.g. "A first-time visitor asks about Friday dinner"
  resolution: string;      // e.g. "Booking confirmed for 8pm Friday, table for 4"
  turns: DemoTranscriptTurn[];
}

interface OwnerBriefBullet {
  emoji: string;           // 1-char emoji, e.g. "📊"
  label: string;           // short label, e.g. "Bookings today"
  detail: string;          // 1 line, e.g. "5 confirmed, 2 waitlist"
}

interface OwnerBriefPreview {
  greeting: string;        // e.g. "Good morning Chef Sami — yesterday wrapped up strong."
  bullets: OwnerBriefBullet[];   // 4–6 bullets
  decision: string;        // the one question the AI is escalating: "Should I confirm Friday's 12-top for the Khalifa party?"
  closer: string;          // signoff line: "Just say 'yes' or 'no' — I'll take it from there."
}

interface DayOnePackage {
  generated_at: string;
  insight: string;
  social_posts: string[];
  sample_customer_reply: string;
  customer_welcome: string;
  gbp_audit: GbpAuditSummary | null;
  faq_gaps: FaqGap[];
  demo_transcript: DemoTranscript | null;
  owner_brief: OwnerBriefPreview | null;
}

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL || "https://n8n.dcp.sa";

async function inferenceChat(role: string, prompt: string): Promise<string> {
  // Calls the prompt-builder's inference router by hitting a thin chat
  // endpoint. Returns the assistant reply text.
  try {
    const res = await fetch(`${PROMPT_BUILDER_URL.replace(/\/$/, "")}/inference/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error(`[day-one] inference role=${role} HTTP ${res.status}`);
      return "";
    }
    const data = await res.json();
    return typeof data?.text === "string" ? data.text : "";
  } catch (e) {
    console.error(`[day-one] inference role=${role} failed:`, e);
    return "";
  }
}

// Fetch GBP audit from prompt-builder. Best-effort — if the audit endpoint
// fails or the tenant has no crawl data, we return null and the day-one
// card just hides this section. We summarize the audit aggressively (top 3
// wins only) because the on-dashboard card is a teaser, not the full report.
async function fetchGbpAudit(clientId: string): Promise<GbpAuditSummary | null> {
  try {
    const res = await fetch(
      `${PROMPT_BUILDER_URL.replace(/\/$/, "")}/gbp/audit/${encodeURIComponent(clientId)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      console.warn(`[day-one] gbp audit HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (typeof data?.score !== "number") return null;
    const recs = Array.isArray(data.recommendations_en) ? data.recommendations_en : [];
    const top_wins = recs
      .slice(0, 3)
      .map((r: { field: string; recommendation: string }) => ({
        field: String(r.field || ""),
        recommendation: String(r.recommendation || ""),
      }));
    const grade: GbpAuditSummary["grade"] = ["A", "B", "C", "D"].includes(data.grade)
      ? data.grade
      : "D";
    return {
      score: Math.round(data.score),
      max_score: typeof data.max_score === "number" ? data.max_score : 100,
      grade,
      composio_connected: Boolean(data.composio_connected),
      top_wins,
      audited_at: typeof data.audited_at === "string"
        ? data.audited_at
        : new Date().toISOString(),
    };
  } catch (e) {
    console.warn("[day-one] gbp audit fetch failed:", e);
    return null;
  }
}

function brandContext(company: CompanyRow, kb: KnowledgeRow | null): string {
  const parts: string[] = [];
  parts.push(`Business: ${company.company_name}${company.company_name_ar ? ` (${company.company_name_ar})` : ""}`);
  parts.push(`Country: ${company.country === "AE" ? "United Arab Emirates" : "Saudi Arabia"}`);
  if (kb?.business_description) parts.push(`Description: ${kb.business_description}`);
  if (kb?.brand_voice) parts.push(`Brand voice: ${kb.brand_voice}`);
  if (kb?.business_hours) parts.push(`Hours: ${kb.business_hours}`);
  if (kb?.services?.length) parts.push(`Services: ${kb.services.join(", ")}`);
  if (kb?.faq?.length) {
    parts.push(
      "Sample FAQ:\n" +
        kb.faq
          .slice(0, 3)
          .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
          .join("\n\n"),
    );
  }
  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.clientId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Allow callers to pass a clientId (e.g. /api/onboarding/submit calling
  // immediately after the JWT was reissued — both paths converge here).
  const body = (await req.json().catch(() => ({}))) as { clientId?: string };
  const clientId = body.clientId || session.clientId;

  // Pull company + KB in one round-trip
  const [companyRows, kbRows] = await Promise.all([
    db()<CompanyRow[]>`
      SELECT company_name, company_name_ar, country
      FROM clients
      WHERE id = ${clientId}
      LIMIT 1
    `,
    db()<KnowledgeRow[]>`
      SELECT business_description, brand_voice, business_hours,
             services, faq, contact_info, crawl_data
      FROM business_knowledge
      WHERE client_id = ${clientId}
      LIMIT 1
    `,
  ]);
  const company = companyRows[0];
  if (!company) {
    return NextResponse.json({ error: "client_not_found" }, { status: 404 });
  }
  const kb = kbRows[0] ?? null;
  const context = brandContext(company, kb);

  // Six tasks in parallel — five LLM drafts plus a GBP audit fetch.
  // Audit is independent (no LLM call inside, just KB read + scoring), so
  // it can race alongside the inference calls without slowing them down.
  const existingFaqStr =
    kb?.faq?.length
      ? kb.faq.slice(0, 20).map((f) => f.question).join("\n- ")
      : "(no FAQ extracted from your website)";

  const [
    insight,
    postsRaw,
    reply,
    welcome,
    gbp_audit,
    faqGapsRaw,
    transcriptRaw,
    ownerBriefRaw,
  ] = await Promise.all([
    inferenceChat(
      "rami_research",
      `You are an analyst looking at this UAE/Saudi SMB for the first time.

${context}

Write ONE paragraph (3–5 sentences) — your honest first impression of this business. What's distinctive? What's the strongest reason a customer chooses them over a competitor? Be specific, no marketing fluff. Output the paragraph only — no preamble, no headings.`,
    ),
    inferenceChat(
      "content_draft",
      `You are a social-content writer for ${company.company_name}, a ${company.country === "AE" ? "Dubai" : "Saudi"} SMB.

${context}

Draft THREE Instagram captions for this business. Each caption: 2–4 sentences, no hashtags, brand-voice consistent, written so a real customer would want to visit/book. Vary the angles (one about food/service quality, one about atmosphere, one about a specific signature offering).

Output as three captions separated by exactly "---" on its own line. No numbering, no headings, no extra commentary.`,
    ),
    inferenceChat(
      "customer_response_en",
      `You are Nadia, the AI WhatsApp concierge for ${company.company_name}.

${context}

A first-time customer just messaged: "Hi, is the restaurant open tonight? My wife and I want to celebrate our anniversary."

Reply as Nadia would — warm, on-brand, confident, with a clear next step. 2–4 sentences. No emoji overuse. Output the reply only.`,
    ),
    inferenceChat(
      "rami_draft",
      `You're drafting the very first WhatsApp message that ${company.company_name}'s AI agent will send to a brand-new customer who reaches out for the first time.

${context}

Write ONE opening message — warm, welcoming, lands the brand voice immediately, ends with a soft question that invites them to keep talking. 2–3 sentences. No emoji explosions. Output the message only.`,
    ),
    fetchGbpAudit(clientId),
    inferenceChat(
      "rami_research",
      `You are auditing the customer-question coverage of a ${company.country === "AE" ? "UAE" : "Saudi"} SMB.

${context}

Existing FAQ topics covered on their website:
- ${existingFaqStr}

Your task: identify FIVE realistic customer questions this business almost-certainly receives over WhatsApp that are NOT yet covered in the FAQ above. Focus on the actual buying questions (booking, hours, parking, prices, allergies/halal, delivery, kids welcome, group bookings, payment methods, location/directions, dress code) — not marketing puff.

For each gap, draft a short on-brand answer (1–3 sentences) the AI agent can use immediately. If you genuinely cannot infer a good answer from the context, make the answer a question back to the owner like: "(Owner: please confirm — do you accept Tabby?)"

Output as STRICT JSON only — no preamble, no markdown fence:
[{"question":"...","draft_answer":"..."}, ...]

Exactly five objects. Each "question" max 120 chars, each "draft_answer" max 280 chars.`,
    ),
    inferenceChat(
      "customer_response_en",
      `You are simulating a complete realistic WhatsApp conversation between a new customer and Nadia, the AI concierge for ${company.company_name}. The owner wants to see what their AI will actually do before any real customer arrives.

${context}

Generate ONE end-to-end conversation that:
- Starts with the customer messaging cold (typical UAE/Saudi opener)
- Goes through 8–10 turns total (alternating customer/agent)
- Resolves with a concrete outcome (booking confirmed, order placed, question answered with a clear next step)
- Stays on-brand throughout, uses short WhatsApp-style messages (no formal email tone)
- Demonstrates at least one moment where the agent uses something specific to this business (a service name, a price, an hour, a location detail)

Output as STRICT JSON only — no preamble, no markdown fence:
{
  "scenario": "one-line description of the conversation context",
  "resolution": "one-line description of what was achieved",
  "turns": [
    {"speaker": "customer", "text": "..."},
    {"speaker": "agent",    "text": "..."},
    ...
  ]
}

The turns array MUST alternate strictly starting with "customer". Each "text" max 240 chars.`,
    ),
    inferenceChat(
      "owner_brain",
      `You are the AI Chief of Staff for ${company.company_name}. Every morning at 9 AM you send the owner a WhatsApp brief: yesterday's recap, today's preview, and the ONE decision you need from them today.

${context}

Compose ONE sample morning brief that the owner will receive on a typical day. Use the brand voice (calm, direct, no fluff) and ${company.country === "AE" ? "UAE" : "Saudi"} context.

Output STRICT JSON only — no preamble, no markdown fence:
{
  "greeting": "one-line opener that names the owner by role (Chef / Boss / Captain) and sets the tone — max 100 chars",
  "bullets": [
    {"emoji": "📊", "label": "short metric label", "detail": "one specific line — concrete numbers, names, or moments — max 90 chars"},
    ... 4 to 6 bullets total covering bookings/customer mood/staff/inventory/marketing/owner-to-dos
  ],
  "decision": "the ONE concrete question I'm escalating to you today — must end with a question mark, max 140 chars",
  "closer": "one-line signoff that invites a quick yes/no/edit response — max 80 chars"
}

The numbers can be plausible fictional ones for the demo (e.g. "5 confirmed, 2 waitlist") — they should look real, not placeholder.`,
    ),
  ]);

  // Parse the FAQ gap response. Be defensive — the model may wrap in ```json
  // fences, may include trailing prose, may produce malformed JSON. We strip
  // fences, find the first '[' to last ']' span, and JSON.parse. On any
  // failure we fall through to an empty list so the card just hides.
  let faq_gaps: FaqGap[] = [];
  if (faqGapsRaw) {
    const cleaned = faqGapsRaw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(parsed)) {
          faq_gaps = parsed
            .filter(
              (g): g is FaqGap =>
                g &&
                typeof g.question === "string" &&
                typeof g.draft_answer === "string" &&
                g.question.trim().length > 5 &&
                g.draft_answer.trim().length > 5,
            )
            .slice(0, 5)
            .map((g) => ({
              question: g.question.trim().slice(0, 200),
              draft_answer: g.draft_answer.trim().slice(0, 400),
            }));
        }
      } catch {
        // JSON parse failed — leave faq_gaps empty so the card hides.
      }
    }
  }

  const social_posts: string[] = postsRaw
    .split(/\n*---\n*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
    .slice(0, 3);

  // Parse the demo transcript. Same defensive pattern as faq_gaps.
  let demo_transcript: DemoTranscript | null = null;
  if (transcriptRaw) {
    const cleaned = transcriptRaw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (
          parsed &&
          typeof parsed.scenario === "string" &&
          typeof parsed.resolution === "string" &&
          Array.isArray(parsed.turns)
        ) {
          const turns: DemoTranscriptTurn[] = parsed.turns
            .filter(
              (t: unknown): t is DemoTranscriptTurn =>
                !!t &&
                typeof t === "object" &&
                "speaker" in t &&
                "text" in t &&
                (t as DemoTranscriptTurn).speaker !== undefined &&
                typeof (t as DemoTranscriptTurn).text === "string" &&
                ((t as DemoTranscriptTurn).speaker === "customer" ||
                  (t as DemoTranscriptTurn).speaker === "agent"),
            )
            .map((t: DemoTranscriptTurn) => ({
              speaker: t.speaker,
              text: t.text.trim().slice(0, 320),
            }))
            .slice(0, 12);
          if (turns.length >= 4) {
            demo_transcript = {
              scenario: parsed.scenario.trim().slice(0, 200),
              resolution: parsed.resolution.trim().slice(0, 200),
              turns,
            };
          }
        }
      } catch {
        // Leave demo_transcript null — card hides on missing data.
      }
    }
  }

  // Parse the owner brief. Same defensive pattern.
  let owner_brief: OwnerBriefPreview | null = null;
  if (ownerBriefRaw) {
    const cleaned = ownerBriefRaw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (
          parsed &&
          typeof parsed.greeting === "string" &&
          Array.isArray(parsed.bullets) &&
          typeof parsed.decision === "string" &&
          typeof parsed.closer === "string"
        ) {
          const bullets: OwnerBriefBullet[] = parsed.bullets
            .filter(
              (b: unknown): b is OwnerBriefBullet =>
                !!b &&
                typeof b === "object" &&
                typeof (b as OwnerBriefBullet).emoji === "string" &&
                typeof (b as OwnerBriefBullet).label === "string" &&
                typeof (b as OwnerBriefBullet).detail === "string",
            )
            .map((b: OwnerBriefBullet) => ({
              emoji: b.emoji.trim().slice(0, 4) || "•",
              label: b.label.trim().slice(0, 80),
              detail: b.detail.trim().slice(0, 140),
            }))
            .slice(0, 6);
          if (bullets.length >= 3) {
            owner_brief = {
              greeting: parsed.greeting.trim().slice(0, 200),
              bullets,
              decision: parsed.decision.trim().slice(0, 200),
              closer: parsed.closer.trim().slice(0, 120),
            };
          }
        }
      } catch {
        // Card hides on bad data.
      }
    }
  }

  const pkg: DayOnePackage = {
    generated_at: new Date().toISOString(),
    insight: insight.trim(),
    social_posts,
    sample_customer_reply: reply.trim(),
    customer_welcome: welcome.trim(),
    gbp_audit,
    faq_gaps,
    demo_transcript,
    owner_brief,
  };

  // Persist into business_knowledge.crawl_data.day_one so the dashboard
  // can render it immediately + the owner sees the same thing tomorrow.
  try {
    await db()`
      UPDATE business_knowledge
      SET crawl_data = COALESCE(crawl_data, '{}'::jsonb)
                       || jsonb_build_object('day_one', ${db().json(pkg as never)}),
          updated_at = NOW()
      WHERE client_id = ${clientId}
    `;
  } catch (e) {
    console.error("[day-one] persist failed:", e);
  }

  return NextResponse.json({ ok: true, package: pkg });
}
