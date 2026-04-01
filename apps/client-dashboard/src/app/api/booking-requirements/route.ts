import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BookingField {
  key: string;
  label: string;
  enabled: boolean;
}

interface BookingRequirements {
  required: BookingField[];
  ask_naturally: BookingField[];
  optional: BookingField[];
  custom: BookingField[];
}

/* ------------------------------------------------------------------ */
/*  Industry defaults                                                  */
/* ------------------------------------------------------------------ */

const RESTAURANT_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "party_size", label: "Number of guests", enabled: true },
    { key: "date", label: "Date", enabled: true },
    { key: "time", label: "Time", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
  ],
  ask_naturally: [
    { key: "dietary", label: "Dietary restrictions or allergies", enabled: true },
    { key: "occasion", label: "Special occasion", enabled: true },
    { key: "seating", label: "Seating preference", enabled: true },
  ],
  optional: [
    { key: "email", label: "Email for confirmation", enabled: false },
  ],
  custom: [],
};

const REAL_ESTATE_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
    { key: "date", label: "Preferred viewing date", enabled: true },
    { key: "time", label: "Preferred viewing time", enabled: true },
  ],
  ask_naturally: [
    { key: "budget", label: "Budget range", enabled: true },
    { key: "property_type", label: "Property type preference", enabled: true },
    { key: "bedrooms", label: "Number of bedrooms", enabled: true },
    { key: "area", label: "Preferred area or neighborhood", enabled: true },
  ],
  optional: [
    { key: "email", label: "Email for confirmation", enabled: false },
    { key: "timeline", label: "Purchase/rental timeline", enabled: false },
  ],
  custom: [],
};

const HEALTHCARE_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
    { key: "date", label: "Preferred date", enabled: true },
    { key: "time", label: "Preferred time", enabled: true },
    { key: "service", label: "Service or treatment needed", enabled: true },
  ],
  ask_naturally: [
    { key: "insurance", label: "Insurance provider", enabled: true },
    { key: "doctor", label: "Preferred doctor", enabled: true },
  ],
  optional: [
    { key: "email", label: "Email for confirmation", enabled: false },
    { key: "notes", label: "Additional medical notes", enabled: false },
  ],
  custom: [],
};

const BEAUTY_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
    { key: "date", label: "Preferred date", enabled: true },
    { key: "time", label: "Preferred time", enabled: true },
    { key: "service", label: "Service requested", enabled: true },
  ],
  ask_naturally: [
    { key: "stylist", label: "Preferred stylist or technician", enabled: true },
    { key: "allergies", label: "Skin sensitivities or allergies", enabled: true },
  ],
  optional: [
    { key: "email", label: "Email for confirmation", enabled: false },
  ],
  custom: [],
};

const GENERIC_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
    { key: "date", label: "Preferred date", enabled: true },
    { key: "time", label: "Preferred time", enabled: true },
  ],
  ask_naturally: [
    { key: "notes", label: "Additional notes or requests", enabled: true },
  ],
  optional: [
    { key: "email", label: "Email for confirmation", enabled: false },
  ],
  custom: [],
};

function getDefaultsForIndustry(industry?: string): BookingRequirements {
  switch (industry?.toLowerCase()) {
    case "restaurant":
      return RESTAURANT_DEFAULTS;
    case "real estate":
    case "real_estate":
      return REAL_ESTATE_DEFAULTS;
    case "healthcare":
      return HEALTHCARE_DEFAULTS;
    case "beauty":
      return BEAUTY_DEFAULTS;
    default:
      return GENERIC_DEFAULTS;
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/booking-requirements                                      */
/*  Returns the booking requirements config for the authenticated      */
/*  client, or industry defaults if none have been saved yet.          */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = await createServerSupabase();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client_id from user metadata
    const clientId = user.user_metadata?.client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: "No client_id in user metadata" },
        { status: 400 }
      );
    }

    // Fetch business_knowledge for this client
    const { data: knowledge, error: fetchError } = await supabase
      .from("business_knowledge")
      .select("crawl_data")
      .eq("client_id", clientId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows found — that's OK, we'll use defaults
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const crawlData = knowledge?.crawl_data as Record<string, unknown> | null;

    // If booking_requirements already saved, return them
    if (crawlData?.booking_requirements) {
      return NextResponse.json({
        requirements: crawlData.booking_requirements as BookingRequirements,
        isDefault: false,
      });
    }

    // Otherwise return industry-specific defaults
    const industry = crawlData?.industry as string | undefined;
    const defaults = getDefaultsForIndustry(industry);

    return NextResponse.json({
      requirements: defaults,
      isDefault: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/booking-requirements                                      */
/*  Saves the full booking requirements object into                    */
/*  business_knowledge.crawl_data.booking_requirements.                */
/*  Merges with existing crawl_data so other fields are preserved.     */
/* ------------------------------------------------------------------ */

export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabase();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = user.user_metadata?.client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: "No client_id in user metadata" },
        { status: 400 }
      );
    }

    // Parse the incoming requirements
    let requirements: BookingRequirements;
    try {
      const body = await request.json();
      requirements = body.requirements ?? body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate structure
    if (
      !requirements.required ||
      !requirements.ask_naturally ||
      !requirements.optional ||
      !Array.isArray(requirements.custom)
    ) {
      return NextResponse.json(
        { error: "Invalid requirements structure: must include required, ask_naturally, optional, and custom arrays" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for the update
    const admin = createAdminClient();

    // Fetch existing crawl_data so we can merge
    const { data: existing, error: fetchError } = await admin
      .from("business_knowledge")
      .select("crawl_data")
      .eq("client_id", clientId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const existingCrawlData =
      (existing?.crawl_data as Record<string, unknown>) || {};

    // Merge: preserve all existing crawl_data fields, only update booking_requirements
    const updatedCrawlData = {
      ...existingCrawlData,
      booking_requirements: requirements,
    };

    if (existing) {
      // Update existing row
      const { error: updateError } = await admin
        .from("business_knowledge")
        .update({ crawl_data: updatedCrawlData })
        .eq("client_id", clientId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Insert new row (edge case: no business_knowledge row yet)
      const { error: insertError } = await admin
        .from("business_knowledge")
        .insert({
          client_id: clientId,
          crawl_data: updatedCrawlData,
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
