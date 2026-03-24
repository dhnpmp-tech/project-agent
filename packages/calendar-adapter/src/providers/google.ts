import { google, type calendar_v3 } from "googleapis";
import type {
  CalendarAdapter,
  GoogleCalendarCredentials,
  AvailabilityQuery,
  AvailableSlot,
  BookingRequest,
  BookingResult,
  CancelResult,
} from "../types";
import { computeFreeSlots } from "../utils";

export class GoogleCalendarAdapter implements CalendarAdapter {
  readonly provider = "google" as const;

  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  constructor(private credentials: GoogleCalendarCredentials) {
    const oauth2 = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret
    );
    oauth2.setCredentials({ refresh_token: credentials.refreshToken });

    this.calendar = google.calendar({ version: "v3", auth: oauth2 });
    this.calendarId = credentials.calendarId ?? "primary";
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const timeMin = new Date(`${query.date}T00:00:00`);
    const timeMax = new Date(`${query.date}T23:59:59`);

    const res = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: query.timezone ?? "UTC",
        items: [{ id: this.calendarId }],
      },
    });

    const busySlots = (
      res.data.calendars?.[this.calendarId]?.busy ?? []
    ).map((b) => ({
      start: new Date(b.start!),
      end: new Date(b.end!),
    }));

    return computeFreeSlots(busySlots, query);
  }

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: request.title,
          description: request.description,
          start: {
            dateTime: request.start.toISOString(),
            timeZone: request.timezone ?? "Asia/Dubai",
          },
          end: {
            dateTime: request.end.toISOString(),
            timeZone: request.timezone ?? "Asia/Dubai",
          },
          attendees: [
            {
              email: request.guest.email,
              displayName: request.guest.name,
            },
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 60 },
              { method: "popup", minutes: 15 },
            ],
          },
        },
        sendUpdates: "all",
      });

      return {
        success: true,
        bookingId: res.data.id ?? undefined,
        calendarLink: res.data.htmlLink ?? undefined,
        raw: res.data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async cancelBooking(bookingId: string): Promise<CancelResult> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: bookingId,
        sendUpdates: "all",
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.calendar.calendarList.get({
        calendarId: this.calendarId,
      });
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
