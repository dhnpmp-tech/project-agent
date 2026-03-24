// =============================================================================
// @project-agent/calendar-adapter — Universal Calendar Adapter
// =============================================================================
//
// Provides a single interface for booking across all calendar providers:
//   • Google Calendar
//   • Microsoft Outlook / Office 365
//   • CalDAV (Proton Calendar, Apple Calendar, Fastmail, Nextcloud)
//   • iCal feeds (read-only)
//   • SevenRooms (restaurant reservations)
//
// Usage:
//   import { createCalendarAdapter } from "@project-agent/calendar-adapter";
//
//   const adapter = createCalendarAdapter({
//     provider: "google",
//     clientId: "...",
//     clientSecret: "...",
//     refreshToken: "...",
//   });
//
//   const slots = await adapter.getAvailability({ date: "2026-04-01", timezone: "Asia/Dubai" });
//   const booking = await adapter.createBooking({ start, end, title: "...", guest: { ... } });
//
// =============================================================================

// Core types
export type {
  CalendarProvider,
  CalendarAdapter,
  AvailabilityQuery,
  AvailableSlot,
  TimeSlot,
  BookingRequest,
  BookingResult,
  CancelResult,
  GuestInfo,
  ProviderCredentials,
  GoogleCalendarCredentials,
  OutlookCredentials,
  CalDavCredentials,
  ICalCredentials,
  SevenRoomsCredentials,
  ClientCalendarConfig,
} from "./types";

export { PROVIDER_DISPLAY_NAMES } from "./types";

// Factory
export { createCalendarAdapter, SUPPORTED_PROVIDERS } from "./factory";

// Individual providers (for direct import when needed)
export {
  GoogleCalendarAdapter,
  OutlookCalendarAdapter,
  CalDavAdapter,
  ICalAdapter,
  SevenRoomsAdapter,
} from "./providers";

// Utilities
export { computeFreeSlots } from "./utils";
