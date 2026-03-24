import type { AvailabilityQuery, TimeSlot, AvailableSlot } from "./types";

/**
 * Parse "HH:MM" string to hours and minutes.
 */
export function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Build a Date for a given date string + time in a timezone.
 * Uses basic offset-free approach — agents should always supply IANA timezone.
 */
export function buildDateTime(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00`);
}

/**
 * Given a list of *busy* slots and a query, compute *available* slots
 * within business hours at the requested duration granularity.
 */
export function computeFreeSlots(
  busySlots: TimeSlot[],
  query: AvailabilityQuery
): AvailableSlot[] {
  const duration = query.durationMinutes ?? 30;
  const dayStart = query.dayStart ?? "09:00";
  const dayEnd = query.dayEnd ?? "18:00";

  const windowStart = buildDateTime(query.date, dayStart);
  const windowEnd = buildDateTime(query.date, dayEnd);

  // Sort busy slots by start time
  const sorted = [...busySlots].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const free: AvailableSlot[] = [];
  let cursor = windowStart.getTime();

  for (const busy of sorted) {
    const busyStart = busy.start.getTime();
    const busyEnd = busy.end.getTime();

    // Skip busy slots outside our window
    if (busyEnd <= windowStart.getTime() || busyStart >= windowEnd.getTime()) {
      continue;
    }

    // Free gap before this busy slot
    while (cursor + duration * 60_000 <= busyStart && cursor + duration * 60_000 <= windowEnd.getTime()) {
      free.push({
        start: new Date(cursor),
        end: new Date(cursor + duration * 60_000),
      });
      cursor += duration * 60_000;
    }

    // Jump past the busy slot
    if (busyEnd > cursor) {
      cursor = busyEnd;
    }
  }

  // Remaining free time after last busy slot
  while (cursor + duration * 60_000 <= windowEnd.getTime()) {
    free.push({
      start: new Date(cursor),
      end: new Date(cursor + duration * 60_000),
    });
    cursor += duration * 60_000;
  }

  return free;
}

/**
 * Format a Date to ISO 8601 with timezone offset string.
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}
