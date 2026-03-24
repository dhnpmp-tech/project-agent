/**
 * Calendar provider type — mirrors the enum in the calendar_configs table.
 * Kept in shared-types so dashboard, provisioning SDK, and agents can all
 * reference it without importing the full calendar-adapter package.
 */
export type CalendarProviderType =
  | "google"
  | "outlook"
  | "caldav"
  | "ical"
  | "sevenrooms";

export interface CalendarConfig {
  id: string;
  client_id: string;
  provider: CalendarProviderType;
  label: string;
  credentials_encrypted: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
