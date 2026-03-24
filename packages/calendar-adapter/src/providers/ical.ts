import * as nodeIcal from "node-ical";
import type {
  CalendarAdapter,
  ICalCredentials,
  AvailabilityQuery,
  AvailableSlot,
  BookingRequest,
  BookingResult,
  CancelResult,
} from "../types";
import { computeFreeSlots } from "../utils";

/**
 * iCal (ICS) feed adapter — *read-only*.
 * Subscribes to a public or authenticated .ics URL and computes availability
 * by parsing busy events. Useful for:
 *   • Importing a public holiday calendar for UAE/KSA
 *   • Syncing with a read-only team calendar
 *   • Any calendar that exposes an ICS feed
 *
 * Booking/cancel operations are not supported — use this alongside
 * a writable provider (Google, Outlook, CalDAV) for overlay logic.
 */
export class ICalAdapter implements CalendarAdapter {
  readonly provider = "ical" as const;

  private feedUrl: string;

  constructor(credentials: ICalCredentials) {
    this.feedUrl = credentials.feedUrl;
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const events = await nodeIcal.async.fromURL(this.feedUrl);

    const dayStart = new Date(`${query.date}T00:00:00`);
    const dayEnd = new Date(`${query.date}T23:59:59`);

    const busySlots = Object.values(events)
      .filter(
        (evt): evt is nodeIcal.VEvent =>
          evt.type === "VEVENT" &&
          "start" in evt &&
          "end" in evt
      )
      .filter((evt) => {
        const start = new Date(evt.start as unknown as string);
        const end = new Date(evt.end as unknown as string);
        return start < dayEnd && end > dayStart;
      })
      .map((evt) => ({
        start: new Date(evt.start as unknown as string),
        end: new Date(evt.end as unknown as string),
      }));

    return computeFreeSlots(busySlots, query);
  }

  async createBooking(_request: BookingRequest): Promise<BookingResult> {
    return {
      success: false,
      error:
        "iCal feeds are read-only. Use a writable provider (Google, Outlook, CalDAV) for bookings.",
    };
  }

  async cancelBooking(_bookingId: string): Promise<CancelResult> {
    return {
      success: false,
      error: "iCal feeds are read-only. Cancellation not supported.",
    };
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const events = await nodeIcal.async.fromURL(this.feedUrl);
      const count = Object.keys(events).length;
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
