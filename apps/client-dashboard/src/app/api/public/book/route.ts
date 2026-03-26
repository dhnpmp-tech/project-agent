import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * POST /api/public/book
 *
 * Creates a booking on the primary calendar.
 * No authentication required — called from the public website.
 *
 * Body: {
 *   client?: string,     // client slug (optional for single-tenant)
 *   date: string,        // "2026-04-01"
 *   time: string,        // "10:00"
 *   timezone?: string,   // "Asia/Dubai"
 *   name: string,
 *   email: string,
 *   phone?: string,
 *   company?: string,
 *   notes?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client: clientSlug,
      date,
      time,
      timezone = "Asia/Dubai",
      name,
      email,
      phone,
      company,
      notes,
    } = body;

    // Validate required fields
    if (!date || !time || !name || !email) {
      return NextResponse.json(
        { error: "date, time, name, and email are required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const supabase = getServiceSupabase();

    // Find primary calendar config
    let query = supabase
      .from("calendar_configs")
      .select("id, credentials_encrypted")
      .eq("is_primary", true)
      .limit(1);

    if (clientSlug) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", clientSlug)
        .single();

      if (clientData) {
        query = query.eq("client_id", clientData.id);
      }
    }

    const { data: configs, error: configError } = await query;

    if (configError || !configs || configs.length === 0) {
      return NextResponse.json(
        { error: "No calendar configured. Please try again later." },
        { status: 503, headers: corsHeaders() }
      );
    }

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(configs[0].credentials_encrypted));

    const { createCalendarAdapter } = await import(
      "@project-agent/calendar-adapter"
    );

    const adapter = createCalendarAdapter(credentials);

    // Build start/end times
    const [hours, minutes] = time.split(":").map(Number);
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    // Build description
    const descriptionParts = [
      `Free AI Audit — 30 minutes`,
      ``,
      `Guest: ${name}`,
      `Email: ${email}`,
    ];
    if (phone) descriptionParts.push(`Phone/WhatsApp: ${phone}`);
    if (company) descriptionParts.push(`Company: ${company}`);
    if (notes) {
      descriptionParts.push(``, `What they want to automate:`, notes);
    }
    descriptionParts.push(
      ``,
      `---`,
      `Booked via AI Agent Systems website`
    );

    const result = await adapter.createBooking({
      start,
      end,
      title: `AI Audit — ${name}${company ? ` (${company})` : ""}`,
      description: descriptionParts.join("\n"),
      guest: { name, email, phone },
      timezone,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create booking" },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Log the activity (non-blocking)
    void supabase
      .from("activity_logs")
      .insert({
        event_type: "meeting_booked",
        payload: {
          guest_name: name,
          guest_email: email,
          guest_phone: phone,
          company,
          date,
          time,
          timezone,
          booking_id: result.bookingId,
        },
      });

    return NextResponse.json(
      {
        success: true,
        bookingId: result.bookingId,
        calendarLink: (result as unknown as Record<string, unknown>).calendarLink || null,
      },
      { headers: corsHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Booking failed:", message);
    return NextResponse.json(
      { error: "Booking failed. Please try again." },
      { status: 500, headers: corsHeaders() }
    );
  }
}
