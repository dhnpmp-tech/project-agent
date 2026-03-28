import { createDAVClient, type DAVClient, type DAVCalendar } from "tsdav";
import type {
  CalendarAdapter,
  CalDavCredentials,
  AvailabilityQuery,
  AvailableSlot,
  BookingRequest,
  BookingResult,
  CancelResult,
} from "../types";
import { computeFreeSlots, buildDateTime } from "../utils";
import { v4 as uuidv4 } from "uuid";

/**
 * CalDAV adapter — works with any CalDAV-compliant server:
 *   • Proton Calendar (calendar.proton.me)
 *   • Apple Calendar / iCloud (caldav.icloud.com)
 *   • Fastmail
 *   • Nextcloud
 *   • Any self-hosted CalDAV (Radicale, Baikal, etc.)
 *
 * Popular in the UAE/GCC where privacy-focused Proton is widely used.
 */
export class CalDavAdapter implements CalendarAdapter {
  readonly provider = "caldav" as const;

  private clientPromise: Promise<DAVClient>;
  private credentials: CalDavCredentials;

  constructor(credentials: CalDavCredentials) {
    this.credentials = credentials;
    this.clientPromise = this.connect();
  }

  private async connect(): Promise<DAVClient> {
    const client = await createDAVClient({
      serverUrl: this.credentials.serverUrl,
      credentials: {
        username: this.credentials.username,
        password: this.credentials.password,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
    // Cast needed: tsdav's createDAVClient returns a subset type
    return client as unknown as DAVClient;
  }

  private async getCalendar(): Promise<DAVCalendar> {
    const client = await this.clientPromise;
    const calendars = await client.fetchCalendars();

    if (this.credentials.calendarPath) {
      const match = calendars.find((c) =>
        c.url.includes(this.credentials.calendarPath!)
      );
      if (match) return match;
    }

    // Default to first calendar
    if (calendars.length === 0) {
      throw new Error("No calendars found on the CalDAV server");
    }
    return calendars[0];
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const client = await this.clientPromise;
    const calendar = await this.getCalendar();

    const timeStart = `${query.date}T00:00:00Z`;
    const timeEnd = `${query.date}T23:59:59Z`;

    const objects = await client.fetchCalendarObjects({
      calendar,
      timeRange: { start: timeStart, end: timeEnd },
    });

    // Parse VEVENT data to extract busy slots
    const busySlots = objects
      .filter((obj) => obj.data)
      .map((obj) => {
        const data = obj.data!;
        const dtstart = extractICalProp(data, "DTSTART");
        const dtend = extractICalProp(data, "DTEND");
        return {
          start: new Date(dtstart),
          end: new Date(dtend),
        };
      })
      .filter((slot) => !isNaN(slot.start.getTime()) && !isNaN(slot.end.getTime()));

    return computeFreeSlots(busySlots, query);
  }

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      const client = await this.clientPromise;
      const calendar = await this.getCalendar();
      const uid = uuidv4();

      const vevent = buildVEvent({
        uid,
        summary: request.title,
        description: request.description,
        dtstart: request.start,
        dtend: request.end,
        attendeeEmail: request.guest.email,
        attendeeName: request.guest.name,
      });

      await client.createCalendarObject({
        calendar,
        filename: `${uid}.ics`,
        iCalString: vevent,
      });

      return {
        success: true,
        bookingId: uid,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async cancelBooking(bookingId: string): Promise<CancelResult> {
    try {
      const client = await this.clientPromise;
      const calendar = await this.getCalendar();

      // Fetch all objects and find the one with matching UID
      const objects = await client.fetchCalendarObjects({ calendar });
      const match = objects.find(
        (obj) => obj.data && obj.data.includes(`UID:${bookingId}`)
      );

      if (!match) {
        return { success: false, error: `Event ${bookingId} not found` };
      }

      await client.deleteCalendarObject({
        calendarObject: match,
      });

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const client = await this.clientPromise;
      const calendars = await client.fetchCalendars();
      if (calendars.length === 0) {
        return { ok: false, error: "Connected but no calendars found" };
      }
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}

// --- iCal Helpers ---

function extractICalProp(icalData: string, prop: string): string {
  const regex = new RegExp(`${prop}[^:]*:(.+)`, "m");
  const match = icalData.match(regex);
  return match?.[1]?.trim() ?? "";
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildVEvent(params: {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend: Date;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProjectAgent//CalendarAdapter//EN",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTART:${formatICalDate(params.dtstart)}`,
    `DTEND:${formatICalDate(params.dtend)}`,
    `SUMMARY:${params.summary}`,
  ];

  if (params.description) {
    lines.push(`DESCRIPTION:${params.description}`);
  }

  lines.push(
    `ATTENDEE;CN=${params.attendeeName}:mailto:${params.attendeeEmail}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR"
  );

  return lines.join("\r\n");
}
