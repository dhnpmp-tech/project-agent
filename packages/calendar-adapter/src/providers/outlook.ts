import { Client } from "@microsoft/microsoft-graph-client";
import type {
  CalendarAdapter,
  OutlookCredentials,
  AvailabilityQuery,
  AvailableSlot,
  BookingRequest,
  BookingResult,
  CancelResult,
} from "../types";
import { computeFreeSlots } from "../utils";

/**
 * Microsoft Outlook / Office 365 calendar via Microsoft Graph API.
 * Supports personal and business O365 accounts — common in UAE corporates.
 */
export class OutlookCalendarAdapter implements CalendarAdapter {
  readonly provider = "outlook" as const;

  private client: Client;
  private calendarId: string;
  private tokenEndpoint: string;
  private credentials: OutlookCredentials;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(credentials: OutlookCredentials) {
    this.credentials = credentials;
    this.calendarId = credentials.calendarId ?? "primary";
    this.tokenEndpoint = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;

    this.client = Client.init({
      authProvider: async (done) => {
        try {
          const token = await this.getAccessToken();
          done(null, token);
        } catch (err) {
          done(err as Error, null);
        }
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const body = new URLSearchParams({
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      refresh_token: this.credentials.refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/.default",
    });

    const res = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const timeZone = query.timezone ?? "UTC";
    const startDateTime = `${query.date}T00:00:00`;
    const endDateTime = `${query.date}T23:59:59`;

    const res = await this.client
      .api("/me/calendar/getSchedule")
      .post({
        schedules: ["me"],
        startTime: { dateTime: startDateTime, timeZone },
        endTime: { dateTime: endDateTime, timeZone },
        availabilityViewInterval: query.durationMinutes ?? 30,
      });

    const busySlots = (res.value?.[0]?.scheduleItems ?? []).map(
      (item: { start: { dateTime: string }; end: { dateTime: string } }) => ({
        start: new Date(item.start.dateTime),
        end: new Date(item.end.dateTime),
      })
    );

    return computeFreeSlots(busySlots, query);
  }

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      const event = {
        subject: request.title,
        body: {
          contentType: "Text",
          content: request.description ?? "",
        },
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
            emailAddress: {
              address: request.guest.email,
              name: request.guest.name,
            },
            type: "required",
          },
        ],
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      };

      const calendarPath =
        this.calendarId === "primary"
          ? "/me/events"
          : `/me/calendars/${this.calendarId}/events`;

      const res = await this.client.api(calendarPath).post(event);

      return {
        success: true,
        bookingId: res.id,
        calendarLink: res.webLink,
        raw: res,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async cancelBooking(bookingId: string): Promise<CancelResult> {
    try {
      await this.client.api(`/me/events/${bookingId}`).delete();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.client.api("/me/calendars").get();
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
