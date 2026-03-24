import type { CalendarAdapter, CalendarProvider, ProviderCredentials } from "./types";
import { GoogleCalendarAdapter } from "./providers/google";
import { OutlookCalendarAdapter } from "./providers/outlook";
import { CalDavAdapter } from "./providers/caldav";
import { ICalAdapter } from "./providers/ical";
import { SevenRoomsAdapter } from "./providers/sevenrooms";

/**
 * Factory: create the right CalendarAdapter from credentials.
 *
 * Usage in n8n workflows / agent code:
 *
 *   const adapter = createCalendarAdapter({
 *     provider: "google",
 *     clientId: "...",
 *     clientSecret: "...",
 *     refreshToken: "...",
 *   });
 *
 *   const slots = await adapter.getAvailability({ date: "2026-04-01" });
 *   const result = await adapter.createBooking({ ... });
 */
export function createCalendarAdapter(
  credentials: ProviderCredentials
): CalendarAdapter {
  switch (credentials.provider) {
    case "google":
      return new GoogleCalendarAdapter(credentials);
    case "outlook":
      return new OutlookCalendarAdapter(credentials);
    case "caldav":
      return new CalDavAdapter(credentials);
    case "ical":
      return new ICalAdapter(credentials);
    case "sevenrooms":
      return new SevenRoomsAdapter(credentials);
    default: {
      const _exhaustive: never = credentials;
      throw new Error(
        `Unknown calendar provider: ${(credentials as ProviderCredentials).provider}`
      );
    }
  }
}

/**
 * Registry of all supported providers with metadata.
 * Useful for building UI dropdowns in the client dashboard.
 */
export const SUPPORTED_PROVIDERS: Array<{
  provider: CalendarProvider;
  name: string;
  writable: boolean;
  description: string;
  region_notes?: string;
}> = [
  {
    provider: "google",
    name: "Google Calendar",
    writable: true,
    description: "Google Workspace and personal Gmail calendars",
    region_notes: "Most common personal calendar in UAE/GCC",
  },
  {
    provider: "outlook",
    name: "Microsoft Outlook / 365",
    writable: true,
    description: "Office 365, Outlook.com, and Microsoft Exchange Online",
    region_notes: "Standard for UAE/GCC corporates and government entities",
  },
  {
    provider: "caldav",
    name: "CalDAV (Proton, Apple, Fastmail)",
    writable: true,
    description:
      "CalDAV protocol — Proton Calendar, Apple iCloud, Fastmail, Nextcloud, Baikal",
    region_notes: "Proton is popular with privacy-conscious users in the region",
  },
  {
    provider: "ical",
    name: "iCal Feed (ICS)",
    writable: false,
    description:
      "Read-only ICS feed subscription. Overlay on a writable provider for booking.",
    region_notes:
      "Useful for UAE/KSA public holiday calendars and shared team schedules",
  },
  {
    provider: "sevenrooms",
    name: "SevenRooms",
    writable: true,
    description:
      "Restaurant reservation & guest management platform (table bookings, party size, seating areas)",
    region_notes:
      "Widely used by premium restaurants and hotel F&B in Dubai, Abu Dhabi, Riyadh",
  },
];
