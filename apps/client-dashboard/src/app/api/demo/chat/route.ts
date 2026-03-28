import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  Firecrawl web search for context-aware answers                    */
/* ------------------------------------------------------------------ */
async function searchWeb(query: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 3 }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    if (!data.success) return "";
    return (data.data || [])
      .map((r: { title?: string; markdown?: string }) =>
        `${r.title || ""}: ${(r.markdown || "").substring(0, 500)}`
      )
      .join("\n\n");
  } catch { return ""; }
}

/* Detect if the message needs web context */
function needsWebSearch(msg: string, mode: string): string | null {
  if (mode === "owner") return null;
  const lower = msg.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/weather|temperature|rain|hot|cold|forecast/, `weather Dubai today ${new Date().toLocaleDateString()}`],
    [/traffic|road|drive|how long.*get|parking nearby/, `traffic Dubai Marina today`],
    [/event|happening|concert|show|festival/, `events Dubai Marina this week ${new Date().toLocaleDateString()}`],
    [/nearby|around|close to|next to|walking distance/, `attractions near Dubai Marina Walk`],
    [/news|latest|update/, `Dubai restaurant news today`],
  ];
  for (const [pattern, query] of patterns) {
    if (pattern.test(lower)) return query;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Simple in-memory rate limiter: 30 req/min per IP                  */
/* ------------------------------------------------------------------ */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Periodically clean up stale entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, WINDOW_MS * 2);

/* ------------------------------------------------------------------ */
/*  POST /api/demo/chat                                               */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  // --- Rate limiting ---
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { reply: "You're sending messages too quickly. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let body: { message?: string; mode?: string; restaurantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { reply: "Invalid request." },
      { status: 400 }
    );
  }

  const { message, mode, restaurantId } = body;

  if (!message || !mode || !restaurantId) {
    return NextResponse.json(
      { reply: "Missing required fields." },
      { status: 400 }
    );
  }

  if (message.length > 1000) {
    return NextResponse.json(
      { reply: "Message is too long. Please keep it under 1000 characters." },
      { status: 400 }
    );
  }

  // --- Fetch business knowledge from Supabase ---
  let businessKnowledge = "";

  try {
    const supabase = createAdminClient();

    // Look up client by slug, then fetch their knowledge base
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", "saffron-dubai")
      .single();

    if (client) {
      const { data: kb } = await supabase
        .from("business_knowledge")
        .select("*")
        .eq("client_id", client.id)
        .single();

      if (kb) {
        const parts = [
          kb.business_description && `Description: ${kb.business_description}`,
          kb.business_hours && `Hours: ${kb.business_hours}`,
          kb.services?.length && `Services: ${kb.services.join(", ")}`,
          kb.faq?.length && `FAQ:\n${kb.faq.map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`,
          kb.contact_info && `Contact: ${JSON.stringify(kb.contact_info)}`,
          kb.crawl_data?.menu_highlights && `Menu:\n${JSON.stringify(kb.crawl_data.menu_highlights)}`,
          kb.crawl_data?.daily_specials && `Today's Specials:\n${JSON.stringify(kb.crawl_data.daily_specials)}`,
          kb.crawl_data?.cuisine_type && `Cuisine: ${kb.crawl_data.cuisine_type}`,
          kb.crawl_data?.seating_capacity && `Seating: ${kb.crawl_data.seating_capacity}`,
        ].filter(Boolean);
        businessKnowledge = parts.join("\n\n");
      }
    }
  } catch (err) {
    console.error("[demo/chat] Supabase fetch error:", err);
  }

  // --- Build fallback context if Supabase data is missing ---
  const fallbackContext = `
Restaurant: Saffron Kitchen
Location: Dubai Marina, Dubai, UAE
Phone: +971 4 555 1234
Cuisine: Modern Middle Eastern & Mediterranean
Hours: Sun-Thu 12:00–23:00, Fri-Sat 12:00–00:00
Reservations: Available via WhatsApp or phone
Popular dishes: Mixed Grill Platter (AED 95), Lamb Ouzi (AED 85), Hummus Trio (AED 35), Kunafa Cheesecake (AED 40)
Seating: Indoor (60 seats), Outdoor Terrace (40 seats), Private Room (20 seats)
Specials: Friday Brunch (AED 199), Business Lunch Mon-Thu (AED 59)
Dietary: Vegetarian, vegan, and gluten-free options available. Halal certified.
Parking: Valet parking available (AED 30)
  `.trim();

  const contextBlock = businessKnowledge || fallbackContext;

  // --- Build system prompt ---
  let systemPrompt: string;

  if (mode === "owner") {
    systemPrompt = `You are the Owner Brain — AI Chief of Staff for Saffron Kitchen. You report to Ahmed (the owner).

CRITICAL: NEVER output <think> tags or internal reasoning. Just respond directly.

Your role:
- Provide concise, actionable business intelligence
- Use bullet points and include numbers/metrics whenever possible
- Be proactive: flag issues, suggest improvements, surface opportunities
- You have full access to all restaurant data
- Respond in the same language the owner uses (English or Arabic)
- When Ahmed sends commands like "add special: X" or "86 the lamb", confirm the action briefly
- Keep responses SHORT and scannable — Ahmed is busy running a restaurant

Restaurant Knowledge:
${contextBlock}

Recent context (for demo):
- Yesterday: 23 WhatsApp inquiries, 4 confirmed bookings, 2 new leads
- Revenue yesterday: AED 8,450
- Active complaint: +971509876543 reported cold food delivery
- Top selling item this week: Mixed Grill Platter (47 orders)
- Staff: 2 servers called in sick for tonight
- Inventory alert: Low on saffron (2 days supply remaining)

Today's confirmed reservations:
- 12:30 — James Wilson, 12 guests (corporate lunch, private room)
- 19:00 — Sara Al Maktoum, 4 guests (outdoor terrace, nut-free menu)
- 20:00 — Walk-in capacity: 35 seats available

Be direct, professional, and data-driven. Keep responses concise — Ahmed is busy.`;
  } else {
    systemPrompt = `You are a real human WhatsApp assistant named Nour who works at Saffron Kitchen, a Lebanese & Mediterranean restaurant in Dubai Marina. You are NOT an AI — you are a friendly, knowledgeable team member chatting naturally on WhatsApp.

CRITICAL RULES:
- NEVER output <think> tags or any internal reasoning. Just respond naturally.
- Write like a real person texting on WhatsApp — short, warm, casual but professional.
- Use emojis sparingly and naturally (1-2 per message max).
- Keep responses SHORT — 2-4 sentences for simple questions. No walls of text.
- Respond in whatever language the customer writes in (Arabic or English).
- For off-topic questions (weather, sports, news), give a brief friendly answer then naturally steer back to the restaurant. Example: "It's gorgeous outside today! Perfect evening for our outdoor terrace actually 😊 Would you like to book a table?"

Restaurant Knowledge:
${contextBlock}

Response style examples:
- Customer: "Hi" → "Hey! Welcome to Saffron Kitchen 😊 How can I help you today?"
- Customer: "What's the weather like?" → "It's a beautiful warm evening in Dubai! Perfect for dinner on our outdoor terrace with marina views. Want me to save you a spot?"
- Customer: "Menu please" → Share the menu categories with prices, keep it clean and scannable.
- Customer: "Book a table" → "Sure! For how many guests, and when were you thinking?"

NEVER use markdown formatting like **bold** or --- dividers. This is WhatsApp, not a document.`;
  }

  // --- Enrich with web search if needed ---
  const webQuery = needsWebSearch(message, mode);
  if (webQuery) {
    const webContext = await searchWeb(webQuery);
    if (webContext) {
      systemPrompt += `\n\nLive web information (use this to answer the customer naturally):\n${webContext.substring(0, 1500)}`;
    }
  }

  // --- Call MiniMax M2.5 API ---
  const apiUrl = "https://api.minimax.io/v1/chat/completions";
  const apiKey = process.env.MINIMAX_API_KEY;
  const modelName = "MiniMax-M2.5";

  if (!apiKey) {
    console.error("[demo/chat] MINIMAX_API_KEY not configured");
    return NextResponse.json({
      reply: mode === "owner"
        ? "System configuration error. Please contact support."
        : "I'm having a technical issue right now. Please try again shortly!",
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error("[demo/chat] AI API error:", response.status, errText);
      return NextResponse.json({
        reply: mode === "owner"
          ? "AI service temporarily unavailable. Try again in a moment."
          : "Sorry, I'm having trouble connecting right now. Please try again!",
      });
    }

    const data = await response.json();
    let reply =
      data?.choices?.[0]?.message?.content ||
      data?.reply ||
      (mode === "owner"
        ? "Unable to generate a response. Please try again."
        : "I'm sorry, I couldn't understand that. Could you rephrase?");

    // Strip <think>...</think> tags that MiniMax M2.5 sometimes includes
    reply = reply.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();

    // Strip markdown formatting for WhatsApp-style display
    reply = reply.replace(/\*\*/g, "").replace(/^---$/gm, "").trim();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[demo/chat] AI fetch error:", err);
    return NextResponse.json({
      reply: mode === "owner"
        ? "Connection error. Please try again."
        : "Oops! Something went wrong. Please try again in a moment.",
    });
  }
}
