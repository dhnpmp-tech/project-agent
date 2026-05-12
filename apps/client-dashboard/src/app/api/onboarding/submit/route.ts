// POST /api/onboarding/submit
//
// Runs the entire onboarding transaction server-side using the new
// Postgres data layer:
//   1. INSERT clients
//   2. INSERT business_knowledge (best-effort — non-blocking)
//   3. INSERT agent_deployments (one per selected agent)
//   4. UPDATE auth_users.client_id  ← links the JWT user to their tenant
//   5. Re-issue the agents_session JWT with the new client_id so the
//      next request (likely a redirect to /dashboard) sees the right
//      tenant immediately — no manual refresh needed
//
// Why the JWT reissue: middleware + dashboard pages read client_id from
// the JWT cookie. Without this step, the user lands on /dashboard,
// middleware sees client_id=null, redirects back to /onboarding → loop.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { getServerSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 60 * 60;

interface OnboardingPayload {
  companyName: string;
  companyNameAr?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  country: "AE" | "SA";
  plan: "starter" | "professional" | "enterprise";
  businessDescription?: string | null;
  websiteUrl?: string | null;
  selectedAgents: string[];
  knowledge?: {
    brandVoice?: string | null;
    businessHours?: string | null;
    services?: string[];
    faq?: { question: string; answer: string }[];
    contactInfo?: Record<string, string | undefined>;
    companyCulture?: string | null;
    icpNotes?: string | null;
    industryKeywords?: string[];
    teamMembers?: { name: string; role: string }[];
    socialProfiles?: Record<string, unknown>;
    reviewSources?: unknown[];
    jobListings?: { title: string }[];
    crawlData?: Record<string, unknown>;
  };
  industryConfig?: Record<string, unknown>;
  agentConfigs?: Record<string, Record<string, unknown>>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: OnboardingPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Minimum required fields
  for (const k of ["companyName", "contactName", "contactEmail", "country", "plan"] as const) {
    if (!payload[k] || typeof payload[k] !== "string") {
      return NextResponse.json({ error: `missing_${k}` }, { status: 400 });
    }
  }
  if (!["AE", "SA"].includes(payload.country)) {
    return NextResponse.json({ error: "invalid_country" }, { status: 400 });
  }

  const clientId = crypto.randomUUID();
  const slug = slugify(payload.companyName);
  const sql = db();

  try {
    await sql.begin(async (tx) => {
      // 1. Insert client. ON CONFLICT lets us surface the duplicate slug
      // case as a 409 rather than crashing.
      const insertedClient = await tx`
        INSERT INTO clients (
          id, slug, company_name, company_name_ar, contact_name,
          contact_email, contact_phone, country, status, plan, metadata
        ) VALUES (
          ${clientId}, ${slug}, ${payload.companyName},
          ${payload.companyNameAr || null}, ${payload.contactName},
          ${payload.contactEmail}, ${payload.contactPhone || null},
          ${payload.country}, 'active', ${payload.plan},
          ${sql.json({ business_description: payload.businessDescription || "" } as never)}
        )
        RETURNING id
      `;
      if (!insertedClient[0]) {
        throw new Error("client_insert_failed");
      }

      // 2. Insert business_knowledge if provided
      const kb = payload.knowledge;
      if (kb) {
        await tx`
          INSERT INTO business_knowledge (
            client_id, website_url, business_description, brand_voice,
            business_hours, industry_keywords, contact_info, services,
            faq, team_members, social_profiles, review_sources,
            icp_criteria, company_culture, job_listings, crawl_data
          ) VALUES (
            ${clientId},
            ${payload.websiteUrl || null},
            ${payload.businessDescription || null},
            ${kb.brandVoice || null},
            ${kb.businessHours || null},
            ${kb.industryKeywords || []},
            ${sql.json((kb.contactInfo || {}) as never)},
            ${kb.services || []},
            ${sql.json((kb.faq || []) as never)},
            ${sql.json((kb.teamMembers || []) as never)},
            ${sql.json((kb.socialProfiles || {}) as never)},
            ${sql.json((kb.reviewSources || []) as never)},
            ${sql.json((kb.icpNotes ? { notes: kb.icpNotes } : {}) as never)},
            ${kb.companyCulture || null},
            ${sql.json((kb.jobListings || []) as never)},
            ${sql.json({ ...(kb.crawlData || {}), ...(payload.industryConfig || {}) } as never)}
          )
        `;
      }

      // 3. Insert agent_deployments
      if (payload.selectedAgents.length > 0) {
        for (const agentType of payload.selectedAgents) {
          const cfg = payload.agentConfigs?.[agentType] || {};
          await tx`
            INSERT INTO agent_deployments (client_id, agent_type, status, config)
            VALUES (${clientId}, ${agentType}, 'pending', ${sql.json(cfg as never)})
            ON CONFLICT (client_id, agent_type) DO NOTHING
          `;
        }
      }

      // 4. Link the auth user to the new tenant
      await tx`
        UPDATE auth_users
        SET client_id = ${clientId}, updated_at = NOW()
        WHERE id = ${session.userId}
      `;
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "23505") {
      return NextResponse.json(
        { error: "company_already_exists", slug },
        { status: 409 }
      );
    }
    console.error("[onboarding/submit] transaction failed:", e);
    return NextResponse.json(
      { error: "transaction_failed", detail: e.message || String(err) },
      { status: 500 }
    );
  }

  // 5. Re-issue JWT with the new client_id baked in so the redirect to
  //    /dashboard sees the right tenant immediately.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "jwt_secret_missing", clientId },
      { status: 500 }
    );
  }
  const key = new TextEncoder().encode(secret);
  const accessToken = await new SignJWT({
    email: session.email,
    user_metadata: {
      client_id: clientId,
      role: session.role,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("auth.agents.dcp.sa")
    .setAudience("agents.dcp.sa")
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);

  // 6. Trigger auto-provisioning (best-effort) AND day-1 deliverables
  //    generation (best-effort). Day-1 deliverables run on the dashboard
  //    project itself so the route can use the JWT we just issued.
  const promptBuilderUrl =
    process.env.PROMPT_BUILDER_URL || "https://api.dcp.sa";
  fetch(`${promptBuilderUrl}/provisioning/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId }),
  }).catch(() => {
    // intentional — provisioning is a follow-up concern
  });

  // Kick off day-1 deliverables generation. Fire-and-forget — the new
  // tenant lands on /dashboard and sees the package render as soon as
  // it lands (typically 5–30s after onboarding).
  const selfOrigin = req.nextUrl.origin;
  fetch(`${selfOrigin}/api/onboarding/day-one`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${SESSION_COOKIE}=${accessToken}`,
    },
    body: JSON.stringify({ clientId }),
  }).catch(() => {
    // intentional — day-1 can be re-triggered manually from dashboard
  });

  const res = NextResponse.json({
    ok: true,
    clientId,
    redirect: "/dashboard",
  });
  res.cookies.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
