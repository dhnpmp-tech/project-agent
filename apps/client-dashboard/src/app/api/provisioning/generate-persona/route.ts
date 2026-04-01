import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const maxDuration = 60;

/* ------------------------------------------------------------------ */
/*  POST /api/provisioning/generate-persona                            */
/*  Calls MiniMax M2.7 to generate an AI employee persona / voice      */
/*  prompt for a client during onboarding.                             */
/* ------------------------------------------------------------------ */

interface BusinessKnowledge {
  id: string;
  client_id: string;
  company_name?: string;
  business_description?: string;
  industry?: string;
  brand_voice?: string;
  contact_info?: Record<string, string>;
  team_members?: string[];
  crawl_data?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ───────────────────────────────────────────────
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ───────────────────────────────────────────────
    let body: { clientId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "Missing required field: clientId" },
        { status: 400 }
      );
    }

    // ── Fetch business knowledge ─────────────────────────────────
    const supabaseAdmin = createAdminClient();

    const { data: knowledge, error: knowledgeError } = await supabaseAdmin
      .from("business_knowledge")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (knowledgeError || !knowledge) {
      return NextResponse.json(
        { error: "Business knowledge not found for this client" },
        { status: 404 }
      );
    }

    const bk = knowledge as BusinessKnowledge;

    const companyName = bk.company_name || "Unknown Company";
    const businessDescription = bk.business_description || "";
    const industry = bk.industry || "";
    const brandVoice = bk.brand_voice || "";
    const contactInfo = bk.contact_info
      ? JSON.stringify(bk.contact_info, null, 2)
      : "Not provided";
    const teamMembers =
      bk.team_members && bk.team_members.length > 0
        ? bk.team_members.join(", ")
        : "Not provided";

    // ── Call MiniMax M2.7 ────────────────────────────────────────
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      console.error("[generate-persona] MINIMAX_API_KEY not configured");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const systemPrompt =
      "You are an expert at creating fictional AI employee personas for businesses. " +
      "Generate a detailed first-person voice prompt for an AI agent who works at this business. " +
      "Include: full backstory (childhood, education, career), personality quirks, " +
      "how they communicate on WhatsApp (short messages, warm, never reveals they're AI), " +
      "example messages they would send, and emotional responses to different situations " +
      "(birthdays, complaints, celebrations). Make the persona feel like a real person from the UAE/Gulf region. " +
      "The output should be the voice_prompt text only — no JSON, no headers.";

    const userPrompt = [
      `Company Name: ${companyName}`,
      `Industry: ${industry}`,
      `Business Description: ${businessDescription}`,
      `Brand Voice: ${brandVoice}`,
      `Contact Info: ${contactInfo}`,
      `Team Members: ${teamMembers}`,
    ].join("\n");

    const aiRes = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "Unknown");
      console.error(
        "[generate-persona] MiniMax API error:",
        aiRes.status,
        errText
      );
      return NextResponse.json(
        { error: "AI persona generation failed" },
        { status: 502 }
      );
    }

    const aiData = await aiRes.json();
    const voicePrompt =
      aiData?.choices?.[0]?.message?.content || aiData?.reply || "";

    if (!voicePrompt) {
      console.error("[generate-persona] Empty response from MiniMax");
      return NextResponse.json(
        { error: "AI returned empty persona" },
        { status: 502 }
      );
    }

    // ── Extract persona name from the generated text ─────────────
    // Look for patterns like "My name is X", "I'm X", "I am X", or use the first line
    let personaName = "Unnamed Agent";
    const namePatterns = [
      /my name is ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      /I'?m ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/,
      /call me ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      /I am ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/,
    ];

    for (const pattern of namePatterns) {
      const match = voicePrompt.match(pattern);
      if (match) {
        personaName = match[1].trim();
        break;
      }
    }

    // ── Save persona to business_knowledge.crawl_data ────────────
    const existingCrawlData =
      (bk.crawl_data as Record<string, unknown>) || {};

    const updatedCrawlData = {
      ...existingCrawlData,
      persona: {
        voice_prompt: voicePrompt,
        name: personaName,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      },
    };

    const { error: updateError } = await supabaseAdmin
      .from("business_knowledge")
      .update({ crawl_data: updatedCrawlData })
      .eq("client_id", clientId);

    if (updateError) {
      console.error(
        "[generate-persona] Failed to save persona:",
        updateError
      );
      return NextResponse.json(
        { error: "Failed to save generated persona" },
        { status: 500 }
      );
    }

    // ── Log activity ─────────────────────────────────────────────
    await supabaseAdmin.from("activity_logs").insert({
      client_id: clientId,
      event_type: "persona_generated",
      payload: {
        persona_name: personaName,
        generated_by: user.id,
        company_name: companyName,
      },
    });

    console.log(
      `[generate-persona] Persona "${personaName}" generated for "${companyName}" (${clientId})`
    );

    return NextResponse.json({
      success: true,
      personaName,
    });
  } catch (err) {
    console.error("[generate-persona] Unexpected error:", err);
    return NextResponse.json(
      { error: "Persona generation failed" },
      { status: 500 }
    );
  }
}
