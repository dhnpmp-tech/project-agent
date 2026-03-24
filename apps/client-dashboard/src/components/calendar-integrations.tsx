"use client";

import { useState, useEffect } from "react";
import type { CalendarProviderType } from "@project-agent/shared-types";

// --- Provider metadata ---

const PROVIDERS: Array<{
  id: CalendarProviderType;
  name: string;
  description: string;
  writable: boolean;
  fields: ProviderField[];
}> = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Google Workspace and personal Gmail calendars",
    writable: true,
    fields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "xxxx.apps.googleusercontent.com" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
      { key: "refreshToken", label: "Refresh Token", type: "password", required: true, hint: "Obtained via OAuth 2.0 consent flow" },
      { key: "calendarId", label: "Calendar ID", type: "text", required: false, placeholder: "primary" },
    ],
  },
  {
    id: "outlook",
    name: "Microsoft Outlook / 365",
    description: "Office 365, Outlook.com, and Microsoft Exchange Online",
    writable: true,
    fields: [
      { key: "clientId", label: "Application (Client) ID", type: "text", required: true, placeholder: "Azure AD App Registration" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
      { key: "tenantId", label: "Tenant ID", type: "text", required: true, placeholder: "Azure AD Tenant ID" },
      { key: "refreshToken", label: "Refresh Token", type: "password", required: true },
      { key: "calendarId", label: "Calendar ID", type: "text", required: false, placeholder: "primary" },
    ],
  },
  {
    id: "caldav",
    name: "CalDAV (Proton, Apple, Fastmail)",
    description: "CalDAV protocol — Proton Calendar, Apple iCloud, Fastmail, Nextcloud",
    writable: true,
    fields: [
      { key: "serverUrl", label: "CalDAV Server URL", type: "text", required: true, placeholder: "https://calendar.proton.me/dav" },
      { key: "username", label: "Username / Email", type: "text", required: true },
      { key: "password", label: "Password / App Password", type: "password", required: true, hint: "For Proton: use a Bridge app password" },
      { key: "calendarPath", label: "Calendar Path", type: "text", required: false, placeholder: "/calendars/default/" },
    ],
  },
  {
    id: "ical",
    name: "iCal Feed (ICS)",
    description: "Read-only ICS feed — holidays, team schedules, public calendars",
    writable: false,
    fields: [
      { key: "feedUrl", label: "ICS Feed URL", type: "text", required: true, placeholder: "https://calendar.google.com/calendar/ical/.../basic.ics" },
    ],
  },
  {
    id: "sevenrooms",
    name: "SevenRooms",
    description: "Restaurant reservation & guest management",
    writable: true,
    fields: [
      { key: "clientId", label: "Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
      { key: "venueId", label: "Venue ID", type: "text", required: true, placeholder: "From SevenRooms admin panel" },
      { key: "apiUrl", label: "API URL", type: "text", required: false, placeholder: "https://api.sevenrooms.com/2_2" },
    ],
  },
];

interface ProviderField {
  key: string;
  label: string;
  type: "text" | "password";
  required: boolean;
  placeholder?: string;
  hint?: string;
}

interface SavedConfig {
  id: string;
  provider: CalendarProviderType;
  label: string;
  is_primary: boolean;
  created_at: string;
  status?: "connected" | "error" | "untested";
}

export function CalendarIntegrations() {
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [activeProvider, setActiveProvider] = useState<CalendarProviderType | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Load existing configs
  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      const res = await fetch("/api/calendar-configs");
      if (res.ok) {
        const data = await res.json();
        setSavedConfigs(data.configs || []);
      }
    } catch {
      // Silently fail on initial load
    }
  }

  function selectProvider(id: CalendarProviderType) {
    setActiveProvider(id);
    setFormValues({});
    setLabel("");
    setIsPrimary(savedConfigs.length === 0); // First config is primary by default
    setTestResult(null);
    setError(null);
  }

  async function handleTest() {
    if (!activeProvider) return;
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch("/api/calendar-configs/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider,
          credentials: formValues,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ ok: false, error: "Network error — could not reach API" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!activeProvider) return;
    setSaving(true);
    setError(null);

    const provider = PROVIDERS.find((p) => p.id === activeProvider);
    if (!provider) return;

    // Validate required fields
    const missing = provider.fields
      .filter((f) => f.required && !formValues[f.key]?.trim())
      .map((f) => f.label);

    if (missing.length > 0) {
      setError(`Missing required fields: ${missing.join(", ")}`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/calendar-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider,
          label: label || provider.name,
          credentials: formValues,
          is_primary: isPrimary,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save configuration");
        setSaving(false);
        return;
      }

      // Reset and reload
      setActiveProvider(null);
      setFormValues({});
      await loadConfigs();
    } catch {
      setError("Network error — could not save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this calendar integration?")) return;
    try {
      await fetch(`/api/calendar-configs/${id}`, { method: "DELETE" });
      await loadConfigs();
    } catch {
      // silent
    }
  }

  const activeProviderMeta = PROVIDERS.find((p) => p.id === activeProvider);

  return (
    <div className="space-y-8">
      {/* Saved Integrations */}
      {savedConfigs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Connected Calendars
          </h3>
          <div className="space-y-2">
            {savedConfigs.map((cfg) => (
              <div
                key={cfg.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      cfg.status === "connected"
                        ? "bg-green-500"
                        : cfg.status === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {cfg.label}
                      {cfg.is_primary && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {PROVIDERS.find((p) => p.id === cfg.provider)?.name ?? cfg.provider}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cfg.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Selection */}
      {!activeProvider && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Add Calendar Provider
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProvider(p.id)}
                className="text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{p.name}</h4>
                  {!p.writable && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      Read-only
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Provider Configuration Form */}
      {activeProvider && activeProviderMeta && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {activeProviderMeta.name}
              </h3>
              <p className="text-sm text-gray-500">{activeProviderMeta.description}</p>
            </div>
            <button
              onClick={() => setActiveProvider(null)}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`e.g. "${activeProviderMeta.name} — Dubai Office"`}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Provider-specific fields */}
            {activeProviderMeta.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={
                      field.type === "password" && !showPasswords[field.key]
                        ? "password"
                        : "text"
                    }
                    value={formValues[field.key] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords[field.key] ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                {field.hint && (
                  <p className="mt-1 text-xs text-gray-400">{field.hint}</p>
                )}
              </div>
            ))}

            {/* Primary toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-primary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is-primary" className="text-sm text-gray-700">
                Set as primary calendar for new bookings
              </label>
            </div>

            {/* Test result */}
            {testResult && (
              <div
                className={`rounded-md p-3 text-sm ${
                  testResult.ok
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {testResult.ok
                  ? "Connection successful — credentials are valid."
                  : `Connection failed: ${testResult.error}`}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md p-3 text-sm bg-red-50 text-red-800 border border-red-200">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Integration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
