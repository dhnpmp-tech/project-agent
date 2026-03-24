import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// Use service role key for public endpoints (bypasses RLS)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const ALGORITHM = "aes-256-gcm";

function decrypt(blob: string): string {
  const key = Buffer.from(process.env.CALENDAR_ENCRYPTION_KEY!, "hex");
  const [ivB64, tagB64, ciphertext] = blob.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.PUBLIC_WEBSITE_URL || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/public/availability?client=SLUG&date=2026-04-01
 *
 * Returns available time slots for a given date.
 * No authentication required — this is called from the public website.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientSlug = searchParams.get("client");
    const date = searchParams.get("date");
    const timezone = searchParams.get("tz") || "Asia/Dubai";

    if (!date) {
      return NextResponse.json(
        { error: "date parameter is required (YYYY-MM-DD)" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const supabase = getServiceSupabase();

    // Find the primary calendar config
    // If client slug is provided, look up that client's calendar
    // Otherwise, use the first primary calendar (for single-tenant setup)
    let query = supabase
      .from("calendar_configs")
      .select("id, credentials_encrypted")
      .eq("is_primary", true)
      .limit(1);

    if (clientSlug) {
      // Join through clients table
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", clientSlug)
        .single();

      if (client) {
        query = query.eq("client_id", client.id);
      }
    }

    const { data: configs, error: configError } = await query;

    if (configError || !configs || configs.length === 0) {
      return NextResponse.json(
        { slots: [], message: "No calendar configured" },
        { headers: corsHeaders() }
      );
    }

    // Decrypt credentials and get availability
    const credentials = JSON.parse(decrypt(configs[0].credentials_encrypted));

    const { createCalendarAdapter } = await import(
      "@project-agent/calendar-adapter"
    );

    const adapter = createCalendarAdapter(credentials);
    const slots = await adapter.getAvailability({
      date,
      timezone,
      durationMinutes: 30,
      dayStart: "09:00",
      dayEnd: "18:00",
    });

    // Return simplified slot format
    const availableSlots = slots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      time: slot.start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone,
      }),
    }));

    return NextResponse.json(
      { date, timezone, slots: availableSlots },
      { headers: corsHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Availability check failed:", message);
    return NextResponse.json(
      { error: "Failed to check availability", slots: [] },
      { status: 500, headers: corsHeaders() }
    );
  }
}
