import type {
  CalendarAdapter,
  SevenRoomsCredentials,
  AvailabilityQuery,
  AvailableSlot,
  BookingRequest,
  BookingResult,
  CancelResult,
} from "../types";

/**
 * SevenRooms adapter — restaurant reservation & booking management.
 * API docs: https://api-docs.sevenrooms.com/
 *
 * Supports:
 *   • Checking table availability (date, time, party size)
 *   • Creating reservations
 *   • Cancelling reservations
 *
 * Auth: OAuth 2.0 (client_id + client_secret → access_token)
 */
export class SevenRoomsAdapter implements CalendarAdapter {
  readonly provider = "sevenrooms" as const;

  private apiUrl: string;
  private credentials: SevenRoomsCredentials;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(credentials: SevenRoomsCredentials) {
    this.credentials = credentials;
    this.apiUrl = credentials.apiUrl ?? "https://api.sevenrooms.com/2_2";
  }

  // --- Auth ---

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const res = await fetch(`${this.apiUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `SevenRooms auth failed: ${res.status} ${await res.text()}`
      );
    }

    const data = (await res.json()) as {
      data: { token: string; expires_in: number };
    };
    this.accessToken = data.data.token;
    this.tokenExpiresAt = Date.now() + (data.data.expires_in ?? 3600) * 1000;
    return this.accessToken;
  }

  private async apiRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    const token = await this.authenticate();

    const res = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SevenRooms API error ${res.status}: ${body}`);
    }

    return res.json();
  }

  // --- CalendarAdapter Implementation ---

  async getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]> {
    const partySize = 2; // default — can be overridden via meta in BookingRequest
    const timeStart = query.dayStart ?? "09:00";
    const timeEnd = query.dayEnd ?? "23:00"; // restaurants often run late

    const data = (await this.apiRequest(
      `/venues/${this.credentials.venueId}/availability` +
        `?date=${query.date}` +
        `&party_size=${partySize}` +
        `&time_start=${timeStart}` +
        `&time_end=${timeEnd}`
    )) as {
      data: {
        availability: Array<{
          time: string;
          shift_id?: string;
          type?: string;
        }>;
      };
    };

    return (data.data?.availability ?? []).map((slot) => {
      const start = new Date(`${query.date}T${slot.time}:00`);
      const durationMs = (query.durationMinutes ?? 90) * 60_000; // default 90min for restaurants
      return {
        start,
        end: new Date(start.getTime() + durationMs),
        meta: {
          shift_id: slot.shift_id,
          type: slot.type,
        },
      };
    });
  }

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      const partySize = (request.meta?.party_size as number) ?? 2;
      const seatingArea = request.meta?.seating_area as string | undefined;

      const payload: Record<string, unknown> = {
        venue_id: this.credentials.venueId,
        date: request.start.toISOString().split("T")[0],
        time: request.start.toISOString().split("T")[1]?.substring(0, 5),
        party_size: partySize,
        first_name: request.guest.name.split(" ")[0],
        last_name: request.guest.name.split(" ").slice(1).join(" ") || "-",
        email: request.guest.email,
        phone: request.guest.phone ?? "",
        notes: request.description ?? "",
      };

      if (seatingArea) {
        payload.seating_area = seatingArea;
      }

      // Pass shift_id if available from availability check
      if (request.meta?.shift_id) {
        payload.shift_id = request.meta.shift_id;
      }

      const data = (await this.apiRequest("/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as {
        data: {
          id: string;
          confirmation_number?: string;
        };
      };

      return {
        success: true,
        bookingId: data.data.id,
        bookingUrl: `https://www.sevenrooms.com/reservations/${this.credentials.venueId}`,
        raw: data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async cancelBooking(bookingId: string): Promise<CancelResult> {
    try {
      await this.apiRequest(`/reservations/${bookingId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.authenticate();
      // Verify venue access
      await this.apiRequest(`/venues/${this.credentials.venueId}`);
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
