// POST /api/onboarding/approve-faq
//
// Promotes a single FAQ gap from the day-one package into the live
// business_knowledge.faq array, so the agent can answer that question
// immediately. Also marks the gap as approved in the persisted day_one
// package so the dashboard card can render the approved state.
//
// Idempotent — re-approving the same question is a no-op (the same Q&A
// doesn't get appended twice).
//
// Body: { question: string, draft_answer: string, edited_answer?: string }
// Returns: { ok: true, faq_count: number }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export const runtime = "nodejs";

interface ApproveBody {
  question?: string;
  draft_answer?: string;
  edited_answer?: string;
}

interface FaqEntry {
  question: string;
  answer: string;
}

interface FaqGap {
  question: string;
  draft_answer: string;
  approved?: boolean;
}

interface KbRow {
  faq: FaqEntry[] | null;
  crawl_data: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.clientId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const clientId = session.clientId;

  const body = (await req.json().catch(() => ({}))) as ApproveBody;
  const question = (body.question || "").trim();
  // edited_answer wins if provided — owners can tweak before approving.
  const answer = ((body.edited_answer || body.draft_answer) ?? "").trim();
  if (question.length < 5 || answer.length < 5) {
    return NextResponse.json({ error: "invalid_qa" }, { status: 400 });
  }

  const rows = await db()<KbRow[]>`
    SELECT faq, crawl_data
    FROM business_knowledge
    WHERE client_id = ${clientId}
    LIMIT 1
  `;
  const kb = rows[0];
  if (!kb) {
    return NextResponse.json({ error: "knowledge_not_found" }, { status: 404 });
  }

  // De-dup: skip if a FAQ entry already has this exact question.
  const existingFaq: FaqEntry[] = Array.isArray(kb.faq) ? kb.faq : [];
  const alreadyExists = existingFaq.some(
    (f) => f.question.trim().toLowerCase() === question.toLowerCase(),
  );
  const nextFaq: FaqEntry[] = alreadyExists
    ? existingFaq
    : [...existingFaq, { question, answer }];

  // Mark the gap as approved in day_one so the card shows the approved state
  // next render. Match on question text only — that's the unique key here.
  const crawl = (kb.crawl_data || {}) as Record<string, unknown>;
  const dayOne = (crawl.day_one || {}) as Record<string, unknown>;
  const gaps: FaqGap[] = Array.isArray(dayOne.faq_gaps)
    ? (dayOne.faq_gaps as FaqGap[])
    : [];
  const nextGaps = gaps.map((g) =>
    g.question.trim().toLowerCase() === question.toLowerCase()
      ? { ...g, approved: true }
      : g,
  );
  const nextDayOne = { ...dayOne, faq_gaps: nextGaps };
  const nextCrawl = { ...crawl, day_one: nextDayOne };

  // Bind to a local sql once — see day-one route for why mixing db()
  // calls across the tag and ${...} interpolations fails silently in
  // production (postgres-js singleton isn't cached when NODE_ENV=production).
  const sql = db();
  await sql`
    UPDATE business_knowledge
    SET faq = ${sql.json(nextFaq as never)},
        crawl_data = ${sql.json(nextCrawl as never)},
        updated_at = NOW()
    WHERE client_id = ${clientId}
  `;

  return NextResponse.json({ ok: true, faq_count: nextFaq.length });
}
