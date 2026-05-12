// Booking requirements — industry defaults only during Stream A.3.
// The full per-client override flow will re-wire against business_knowledge
// in a follow-up. GET returns sane industry defaults so the booking
// pipeline keeps working.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    { key: "notes", label: "Additional notes", enabled: true },
  ],
  custom: [],
};

const HEALTHCARE_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
    { key: "date", label: "Preferred date", enabled: true },
    { key: "time", label: "Preferred time", enabled: true },
    { key: "service", label: "Service or treatment", enabled: true },
  ],
  ask_naturally: [
    { key: "reason", label: "Reason for visit", enabled: true },
    { key: "first_visit", label: "First-time patient?", enabled: true },
  ],
  optional: [
    { key: "email", label: "Email", enabled: true },
    { key: "insurance", label: "Insurance provider", enabled: false },
  ],
  custom: [],
};

const REAL_ESTATE_DEFAULTS: BookingRequirements = {
  required: [
    { key: "full_name", label: "Full name", enabled: true },
    { key: "phone", label: "Phone number", enabled: true },
    { key: "interest", label: "Buy or rent", enabled: true },
    { key: "budget", label: "Budget range", enabled: true },
    { key: "area", label: "Preferred area", enabled: true },
  ],
  ask_naturally: [
    { key: "property_type", label: "Property type", enabled: true },
    { key: "bedrooms", label: "Bedrooms", enabled: true },
    { key: "move_in", label: "Move-in timeline", enabled: true },
  ],
  optional: [{ key: "email", label: "Email", enabled: true }],
  custom: [],
};

export async function GET(request: Request) {
  const industry =
    new URL(request.url).searchParams.get("industry") || "restaurant";
  const defaults =
    industry === "healthcare" || industry === "beauty"
      ? HEALTHCARE_DEFAULTS
      : industry === "real_estate"
        ? REAL_ESTATE_DEFAULTS
        : RESTAURANT_DEFAULTS;
  return NextResponse.json(defaults);
}

export async function PUT() {
  return NextResponse.json(
    { error: "booking_overrides_disabled_during_migration" },
    { status: 503 },
  );
}
