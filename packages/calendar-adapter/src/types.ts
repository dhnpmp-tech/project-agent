// =============================================================================
// Universal Calendar Adapter — Core Types
// =============================================================================

/**
 * Supported calendar/booking provider identifiers.
 * "google"    → Google Calendar API
 * "outlook"   → Microsoft Graph API (Office 365 / Outlook)
 * "caldav"    → CalDAV protocol (Proton Calendar, Apple Calendar, Fastmail, etc.)
 * "ical"      → ICS feed import/export (read-only calendars, public feeds)
 * "sevenrooms"→ SevenRooms restaurant reservation API
 */
export type CalendarProvider =
  | "google"
  | "outlook"
  | "caldav"
  | "ical"
  | "sevenrooms";

/** Human-readable provider names */
export const PROVIDER_DISPLAY_NAMES: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  outlook: "Microsoft Outlook / 365",
  caldav: "CalDAV (Proton, Apple, Fastmail)",
  ical: "iCal Feed (ICS)",
  sevenrooms: "SevenRooms (Restaurant Bookings)",
};

// --- Time Slot Types ---

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailabilityQuery {
  /** Date to check (ISO 8601 date string, e.g. "2026-04-01") */
  date: string;
  /** IANA timezone (e.g. "Asia/Dubai") — defaults to UTC */
  timezone?: string;
  /** Minimum slot duration in minutes (default: 30) */
  durationMinutes?: number;
  /** Business hours start (default: "09:00") */
  dayStart?: string;
  /** Business hours end (default: "18:00") */
  dayEnd?: string;
}

export interface AvailableSlot extends TimeSlot {
  /** Provider-specific metadata (e.g. SevenRooms shift_id) */
  meta?: Record<string, unknown>;
}

// --- Booking Types ---

export interface BookingRequest {
  /** Slot start time */
  start: Date;
  /** Slot end time */
  end: Date;
  /** Summary / title for the calendar event */
  title: string;
  /** Long description or notes */
  description?: string;
  /** Guest/lead info */
  guest: GuestInfo;
  /** IANA timezone */
  timezone?: string;
  /** Provider-specific extras (e.g. party_size for SevenRooms) */
  meta?: Record<string, unknown>;
}

export interface GuestInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface BookingResult {
  /** Whether the booking was successful */
  success: boolean;
  /** Provider-specific booking/event ID */
  bookingId?: string;
  /** A link the guest can use to view/manage the booking */
  bookingUrl?: string;
  /** Calendar event link (Google, Outlook) */
  calendarLink?: string;
  /** Error message if success is false */
  error?: string;
  /** Raw provider response for logging */
  raw?: unknown;
}

// --- Cancellation ---

export interface CancelResult {
  success: boolean;
  error?: string;
}

// --- Provider Credentials ---

export interface GoogleCalendarCredentials {
  provider: "google";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId?: string; // defaults to "primary"
}

export interface OutlookCredentials {
  provider: "outlook";
  clientId: string;
  clientSecret: string;
  tenantId: string;
  refreshToken: string;
  calendarId?: string;
}

export interface CalDavCredentials {
  provider: "caldav";
  serverUrl: string;
  username: string;
  password: string;
  calendarPath?: string;
}

export interface ICalCredentials {
  provider: "ical";
  /** Public ICS feed URL */
  feedUrl: string;
}

export interface SevenRoomsCredentials {
  provider: "sevenrooms";
  clientId: string;
  clientSecret: string;
  venueId: string;
  apiUrl?: string; // defaults to https://api.sevenrooms.com/2_2
}

export type ProviderCredentials =
  | GoogleCalendarCredentials
  | OutlookCredentials
  | CalDavCredentials
  | ICalCredentials
  | SevenRoomsCredentials;

// --- Calendar Adapter Interface ---

/**
 * Every calendar provider must implement this interface.
 * The adapter layer normalises all providers to this contract.
 */
export interface CalendarAdapter {
  /** Which provider this adapter wraps */
  readonly provider: CalendarProvider;

  /**
   * Get available time slots for a given date.
   * For read-only providers (iCal) this returns the *free* windows.
   */
  getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]>;

  /**
   * Create a booking / calendar event.
   * Throws for read-only providers.
   */
  createBooking(request: BookingRequest): Promise<BookingResult>;

  /**
   * Cancel an existing booking by its provider-specific ID.
   */
  cancelBooking(bookingId: string): Promise<CancelResult>;

  /**
   * Quick connectivity / auth check.
   */
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}

// --- Client Calendar Configuration (stored in Supabase) ---

export interface ClientCalendarConfig {
  id: string;
  client_id: string;
  provider: CalendarProvider;
  label: string; // e.g. "Main Google Calendar", "SevenRooms Dubai Marina"
  credentials_encrypted: string; // AES-256 encrypted JSON
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
