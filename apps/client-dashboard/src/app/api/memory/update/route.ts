import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  POST /api/memory/update                                            */
/*  Analyses a conversation and upserts customer memory in Supabase.   */
/*  Industry-agnostic: works for restaurant, real estate, healthcare,  */
/*  beauty, or any other business type.                                */
/* ------------------------------------------------------------------ */

interface MemoryUpdateBody {
  clientId: string;
  customerPhone: string;
  customerName?: string;
  messages: { role: string; content: string }[];
  industry?: string;
}

interface MemoryExtraction {
  profile_update: string;
  new_preferences: Record<string, unknown>;
  new_events: { date: string; type: string; summary: string }[];
  sentiment: number;
  new_tags: string[];
  lead_score_delta: number;
  language: string;
  conversation_summary?: string;
  topics?: string[];
  outcomes?: string[];
}

/* Strip <think>...</think> blocks that MiniMax sometimes emits */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

/* Extract JSON from the AI response — handles markdown code fences */
function extractJson(text: string): string {
  // Try to find JSON inside ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find raw JSON object
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];

  return text;
}

/* Deep-merge two JSONB preference objects (additive, never removes) */
function mergePreferences(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;

    const prev = merged[key];

    // Merge arrays by union
    if (Array.isArray(value) && Array.isArray(prev)) {
      merged[key] = [...new Set([...prev, ...value])];
    }
    // Merge nested objects
    else if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof prev === "object" &&
      prev !== null &&
      !Array.isArray(prev)
    ) {
      merged[key] = mergePreferences(
        prev as Record<string, unknown>,
        value as Record<string, unknown>
      );
    }
    // Overwrite scalars with new value
    else {
      merged[key] = value;
    }
  }

  return merged;
}

/* Compute running average sentiment */
function runningAvgSentiment(
  currentAvg: number | null,
  totalConversations: number,
  newSentiment: number
): number {
  if (currentAvg === null || totalConversations <= 1) return newSentiment;
  // Weighted running average (recent conversations weighted more)
  const weight = Math.min(0.3, 1 / totalConversations);
  return parseFloat(
    (currentAvg * (1 - weight) + newSentiment * weight).toFixed(2)
  );
}

/* Build the industry-aware memory extraction prompt */
function buildExtractionPrompt(
  messages: { role: string; content: string }[],
  industry?: string
): string {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");

  const industryExamples: Record<string, string> = {
    restaurant: `Industry-specific preferences to look for:
- party_size: usual number of guests (e.g. 4, "family of 4")
- favorite_dishes: dishes they mentioned liking or ordering
- dietary_restrictions: allergies, halal, vegan, gluten-free, etc. (note WHO has the restriction)
- preferred_seating: indoor, outdoor, terrace, private room
- usual_visit_time: day of week + time (e.g. "Friday 7pm", "weekday lunch")
- cuisine_preferences: types of food they prefer
- booking_date: the specific date/time of any booking made (ISO format if possible)
- special_occasions: birthdays, anniversaries, celebrations mentioned
IMPORTANT: Always capture the exact booking date/time if a reservation was made. Record when the customer contacted AND when the booking is for.`,

    "real estate": `Industry-specific preferences to look for:
- budget_range: min and max budget mentioned
- preferred_areas: neighborhoods, districts, cities mentioned
- property_type: apartment, villa, townhouse, office, land
- bedrooms: number of bedrooms needed
- timeline: when they want to buy/rent (urgent, this month, exploring)
- family_size: number of family members
- purpose: investment, primary residence, rental`,

    healthcare: `Industry-specific preferences to look for:
- preferred_services: treatments, procedures, specialties they need
- appointment_frequency: how often they visit
- insurance_provider: their insurance company or plan
- medical_notes: conditions, medications, or concerns mentioned
- preferred_doctor: specific practitioner preferences
- preferred_time: morning, afternoon, evening appointments`,

    beauty: `Industry-specific preferences to look for:
- preferred_services: haircut, color, nails, facial, massage, etc.
- preferred_stylist: specific stylist or technician
- appointment_frequency: how often they visit
- product_preferences: brands or products they use or like
- allergies: skin sensitivities, product allergies
- preferred_time: morning, afternoon, evening appointments`,
  };

  const industryBlock =
    industryExamples[industry?.toLowerCase() || ""] ||
    `Industry-specific preferences to look for:
- Any recurring patterns or stated preferences
- Service/product preferences
- Scheduling patterns
- Budget or spending indicators
- Special requirements or accommodations`;

  return `You are a customer memory analyst. Analyse the following conversation between a customer and a business agent. Extract ALL structured information to build/update the customer's long-term memory profile.

ALWAYS extract these identifiers if mentioned:
- Full name
- Phone number (from the conversation context or greeting)
- Email address
- Company/organization name
- Number of people in their group/family
- Language they communicate in (en, ar, etc.)
- How they found the business (referral, Google, social media, walk-in)
- Any dates mentioned: when they contacted AND when any appointment/booking is for

${industryBlock}

CONVERSATION:
${conversationText}

Respond with ONLY valid JSON (no extra text, no markdown fences):
{
  "profile_update": "One-paragraph summary of who this customer is, their relationship to the business, and what they want. Include all identifiers: name, group size, restrictions, preferences.",
  "new_preferences": { "key": "value pairs discovered — include ALL: name, email, company, party_size, dietary, timing, seating, budget, etc." },
  "new_events": [
    {
      "date": "${new Date().toISOString().split("T")[0]}",
      "booking_date": "ISO date of the booking/appointment if one was made, or null",
      "contacted_at": "${new Date().toISOString()}",
      "type": "booking|complaint|inquiry|purchase|viewing|appointment|general",
      "summary": "Brief description of what happened"
    }
  ],
  "sentiment": 0.75,
  "new_tags": ["relevant-tags-from-this-conversation"],
  "lead_score_delta": 0,
  "language": "en",
  "conversation_summary": "One-sentence summary of this conversation",
  "topics": ["topic1", "topic2"],
  "outcomes": ["outcome1"]
}

Rules:
- sentiment: 0.0 = very negative, 0.5 = neutral, 1.0 = very positive
- lead_score_delta: negative if they seem less interested, positive if more interested, 0 if no change. Range -20 to +20.
- Only include preferences that were actually expressed or implied in the conversation
- For new_events, classify the type based on what actually happened
- tags should be lowercase, hyphenated (e.g. "repeat-customer", "nut-allergy", "vip", "corporate")
- language: detect the primary language used by the customer ("en", "ar", "fr", etc.)
- If the conversation is too short or trivial to extract meaningful info, return minimal data with empty arrays/objects`;
}

export async function POST(request: Request) {
  /* ---- Auth check ---- */
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || !authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---- Parse body ---- */
  let body: MemoryUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientId, customerPhone, customerName, messages, industry } = body;

  if (!clientId || !customerPhone || !messages?.length) {
    return NextResponse.json(
      { error: "Missing required fields: clientId, customerPhone, messages" },
      { status: 400 }
    );
  }

  /* ---- Call MiniMax M2.7 for memory extraction ---- */
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    console.error("[memory/update] MINIMAX_API_KEY not configured");
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 }
    );
  }

  let extraction: MemoryExtraction;

  try {
    const extractionPrompt = buildExtractionPrompt(messages, industry);

    const aiRes = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: [
          {
            role: "system",
            content:
              "You are a JSON-only analyst. Output only valid JSON. No markdown, no explanation, no code fences.",
          },
          { role: "user", content: extractionPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "Unknown");
      console.error("[memory/update] MiniMax API error:", aiRes.status, errText);
      return NextResponse.json(
        { error: "AI analysis failed" },
        { status: 502 }
      );
    }

    const aiData = await aiRes.json();
    let rawContent =
      aiData?.choices?.[0]?.message?.content || aiData?.reply || "";

    // Strip think tags and extract JSON
    rawContent = stripThinkTags(rawContent);
    rawContent = extractJson(rawContent);

    extraction = JSON.parse(rawContent);
  } catch (err) {
    console.error("[memory/update] AI parse error:", err);
    // Fallback minimal extraction so we still log the conversation
    extraction = {
      profile_update: "",
      new_preferences: {},
      new_events: [
        {
          date: new Date().toISOString().split("T")[0],
          type: "general",
          summary: "Conversation recorded (AI analysis failed)",
        },
      ],
      sentiment: 0.5,
      new_tags: [],
      lead_score_delta: 0,
      language: "en",
      conversation_summary: "Conversation recorded",
      topics: [],
      outcomes: [],
    };
  }

  /* ---- Upsert customer_memory in Supabase ---- */
  const supabase = createAdminClient();
  const messageCount = messages.length;

  try {
    // 1. Check if memory exists for this phone + client combo
    const { data: existing } = await supabase
      .from("customer_memory")
      .select("*")
      .eq("client_id", clientId)
      .eq("phone_number", customerPhone)
      .single();

    let customerId: string;

    if (existing) {
      /* ---- UPDATE existing memory ---- */
      const newTotalConversations = (existing.total_conversations || 0) + 1;
      const newTotalMessages = (existing.total_messages || 0) + messageCount;

      // Merge preferences (additive)
      const mergedPreferences = mergePreferences(
        (existing.preferences as Record<string, unknown>) || {},
        extraction.new_preferences || {}
      );

      // Append new key_events (keep last 50)
      const existingEvents = (existing.key_events as unknown[]) || [];
      const combinedEvents = [
        ...existingEvents,
        ...(extraction.new_events || []),
      ].slice(-50);

      // Merge tags (union)
      const existingTags = (existing.tags as string[]) || [];
      const mergedTags = [
        ...new Set([...existingTags, ...(extraction.new_tags || [])]),
      ];

      // Running average sentiment
      const newSentiment = runningAvgSentiment(
        existing.avg_sentiment ? parseFloat(String(existing.avg_sentiment)) : null,
        newTotalConversations,
        extraction.sentiment ?? 0.5
      );

      // Update lead score (clamped 0-100)
      let newLeadScore = existing.lead_score ?? 50;
      if (extraction.lead_score_delta) {
        newLeadScore = Math.max(
          0,
          Math.min(100, newLeadScore + extraction.lead_score_delta)
        );
      }

      // Profile summary: use new if provided, otherwise keep existing
      const profileSummary =
        extraction.profile_update || existing.profile_summary;

      const { error: updateError } = await supabase
        .from("customer_memory")
        .update({
          name: customerName || existing.name,
          language: extraction.language || existing.language,
          last_contact: new Date().toISOString(),
          total_conversations: newTotalConversations,
          total_messages: newTotalMessages,
          profile_summary: profileSummary,
          preferences: mergedPreferences,
          key_events: combinedEvents,
          tags: mergedTags,
          avg_sentiment: newSentiment,
          lead_score: newLeadScore,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[memory/update] Supabase update error:", updateError);
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      customerId = existing.id;
    } else {
      /* ---- INSERT new memory ---- */
      const newLeadScore = Math.max(
        0,
        Math.min(100, 50 + (extraction.lead_score_delta || 0))
      );

      const { data: inserted, error: insertError } = await supabase
        .from("customer_memory")
        .insert({
          client_id: clientId,
          phone_number: customerPhone,
          name: customerName || null,
          language: extraction.language || "en",
          first_contact: new Date().toISOString(),
          last_contact: new Date().toISOString(),
          total_conversations: 1,
          total_messages: messageCount,
          profile_summary: extraction.profile_update || null,
          preferences: extraction.new_preferences || {},
          key_events: extraction.new_events || [],
          tags: extraction.new_tags || [],
          avg_sentiment: extraction.sentiment ?? 0.5,
          lead_score: newLeadScore,
          lead_status: "new",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[memory/update] Supabase insert error:", insertError);
        return NextResponse.json(
          { error: "Database insert failed" },
          { status: 500 }
        );
      }

      customerId = inserted!.id;
    }

    // 2. Insert conversation summary
    const summaryText =
      extraction.conversation_summary ||
      extraction.profile_update ||
      "Conversation recorded";

    const { error: summaryError } = await supabase
      .from("conversation_summaries")
      .insert({
        client_id: clientId,
        customer_id: customerId,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        message_count: messageCount,
        channel: "whatsapp",
        summary: summaryText,
        outcomes: extraction.outcomes || [],
        sentiment: extraction.sentiment ?? 0.5,
        topics: extraction.topics || [],
      });

    if (summaryError) {
      // Non-fatal — log but don't fail the request
      console.error(
        "[memory/update] conversation_summaries insert error:",
        summaryError
      );
    }

    return NextResponse.json({
      success: true,
      memoryUpdated: true,
      customerId,
      isNewCustomer: !existing,
    });
  } catch (err) {
    console.error("[memory/update] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
