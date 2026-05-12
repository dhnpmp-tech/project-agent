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

interface DayOnePackage {
  generated_at: string;
  insight: string;
  social_posts: string[];
  sample_customer_reply: string;
  customer_welcome: string;
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

  // Four prompts run in parallel — different roles, different providers
  const [insight, postsRaw, reply, welcome] = await Promise.all([
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
  ]);

  const social_posts: string[] = postsRaw
    .split(/\n*---\n*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
    .slice(0, 3);

  const pkg: DayOnePackage = {
    generated_at: new Date().toISOString(),
    insight: insight.trim(),
    social_posts,
    sample_customer_reply: reply.trim(),
    customer_welcome: welcome.trim(),
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
