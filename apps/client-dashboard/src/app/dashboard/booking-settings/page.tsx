"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BookingField {
  key: string;
  label: string;
  enabled: boolean;
}

interface BookingRequirements {
  required: BookingField[];
  ask_naturally: BookingField[];
  optional: BookingField[];
  custom: BookingField[];
}

/* ------------------------------------------------------------------ */
/*  Section descriptions                                               */
/* ------------------------------------------------------------------ */

const SECTION_META: Record<
  string,
  { title: string; description: string; color: string }
> = {
  required: {
    title: "Required Information",
    description:
      "These fields must be collected before confirming any booking. The AI will always ask for these.",
    color: "bg-red-50 border-red-100",
  },
  ask_naturally: {
    title: "Ask Naturally",
    description:
      "The AI weaves these into conversation naturally. They improve service but aren't blocking.",
    color: "bg-amber-50 border-amber-100",
  },
  optional: {
    title: "Optional Fields",
    description:
      "These are only asked if there's a natural opening. Disabled by default.",
    color: "bg-blue-50 border-blue-100",
  },
  custom: {
    title: "Custom Fields",
    description:
      "Add your own fields for the AI to collect. These are unique to your business.",
    color: "bg-purple-50 border-purple-100",
  },
};

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        ${checked ? "bg-green-500" : "bg-gray-200"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Field row                                                          */
/* ------------------------------------------------------------------ */

function FieldRow({
  field,
  onToggle,
  onDelete,
}: {
  field: BookingField;
  onToggle: (key: string, enabled: boolean) => void;
  onDelete?: (key: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <Toggle
          checked={field.enabled}
          onChange={(val) => onToggle(field.key, val)}
        />
        <div className="min-w-0">
          <p
            className={`text-sm font-medium ${
              field.enabled ? "text-gray-900" : "text-gray-400"
            } transition-colors`}
          >
            {field.label}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Field key: {field.key}
          </p>
        </div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(field.key)}
          className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-md
                     text-gray-400 hover:text-red-500 hover:bg-red-50
                     transition-all duration-150"
          title="Remove field"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-72 bg-gray-200 rounded animate-pulse mt-1" />
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-4" />
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="flex items-center gap-3 py-3 px-4"
              >
                <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mt-1" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function BookingSettingsPage() {
  const [requirements, setRequirements] = useState<BookingRequirements | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  /* ---- Fetch current requirements ---- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/booking-requirements");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setRequirements(data.requirements);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---- Toggle a field in any section ---- */
  const handleToggle = useCallback(
    (section: keyof BookingRequirements, key: string, enabled: boolean) => {
      setRequirements((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [section]: prev[section].map((f) =>
            f.key === key ? { ...f, enabled } : f
          ),
        };
      });
      setHasChanges(true);
      setSaveStatus("idle");
    },
    []
  );

  /* ---- Add a custom field ---- */
  const handleAddCustom = useCallback(() => {
    const label = newFieldLabel.trim();
    if (!label) return;

    // Generate a key from the label
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    setRequirements((prev) => {
      if (!prev) return prev;

      // Prevent duplicates
      const allKeys = [
        ...prev.required,
        ...prev.ask_naturally,
        ...prev.optional,
        ...prev.custom,
      ].map((f) => f.key);

      if (allKeys.includes(key)) return prev;

      return {
        ...prev,
        custom: [...prev.custom, { key, label, enabled: true }],
      };
    });

    setNewFieldLabel("");
    setHasChanges(true);
    setSaveStatus("idle");
  }, [newFieldLabel]);

  /* ---- Delete a custom field ---- */
  const handleDeleteCustom = useCallback((key: string) => {
    setRequirements((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        custom: prev.custom.filter((f) => f.key !== key),
      };
    });
    setHasChanges(true);
    setSaveStatus("idle");
  }, []);

  /* ---- Save to API ---- */
  const handleSave = useCallback(async () => {
    if (!requirements) return;

    setSaving(true);
    setSaveStatus("idle");

    try {
      const res = await fetch("/api/booking-requirements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSaveStatus("success");
      setHasChanges(false);

      // Auto-hide success message after 3s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [requirements]);

  /* ---- Loading state ---- */
  if (loading) return <Skeleton />;

  /* ---- Error state (full page) ---- */
  if (!requirements && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                   1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464
                   0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Failed to load settings
          </h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!requirements) return null;

  /* ---- Render sections ---- */
  const sections: { key: keyof BookingRequirements; fields: BookingField[] }[] =
    [
      { key: "required", fields: requirements.required },
      { key: "ask_naturally", fields: requirements.ask_naturally },
      { key: "optional", fields: requirements.optional },
      { key: "custom", fields: requirements.custom },
    ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              &larr; Back
            </a>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Booking Requirements
              </h1>
              <p className="text-sm text-gray-500">
                Customize what your AI collects before confirming a reservation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {sections.map(({ key, fields }) => {
          const meta = SECTION_META[key];
          const isCustom = key === "custom";

          return (
            <section
              key={key}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className={`px-6 py-4 border-b ${meta.color}`}>
                <h2 className="text-sm font-semibold text-gray-900">
                  {meta.title}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {meta.description}
                </p>
              </div>

              {/* Field rows */}
              <div className="px-2 py-1 divide-y divide-gray-100">
                {fields.length === 0 && !isCustom && (
                  <p className="py-6 text-center text-sm text-gray-400">
                    No fields in this section
                  </p>
                )}

                {fields.map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    onToggle={(k, enabled) => handleToggle(key, k, enabled)}
                    onDelete={isCustom ? handleDeleteCustom : undefined}
                  />
                ))}

                {/* Custom field: empty state + add input */}
                {isCustom && (
                  <>
                    {fields.length === 0 && (
                      <p className="py-4 px-4 text-sm text-gray-400">
                        No custom fields yet. Add one below.
                      </p>
                    )}

                    {/* Add custom field input */}
                    <div className="flex items-center gap-2 py-3 px-4">
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustom();
                          }
                        }}
                        placeholder="e.g. Company name, Loyalty number..."
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50
                                   px-3 py-2 text-sm text-gray-900
                                   placeholder:text-gray-400
                                   focus:border-gray-400 focus:ring-1
                                   focus:ring-gray-400 focus:outline-none
                                   transition-colors"
                      />
                      <button
                        onClick={handleAddCustom}
                        disabled={!newFieldLabel.trim()}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm
                                   font-medium text-white hover:bg-gray-800
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   transition-colors shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}

        {/* Save button + status */}
        <div className="flex items-center justify-between pt-2 pb-12">
          <div className="text-sm">
            {saveStatus === "success" && (
              <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Changes saved successfully
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                {error || "Failed to save"}
              </span>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`
              rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200
              ${
                hasChanges
                  ? "bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }
              ${saving ? "opacity-60 cursor-wait" : ""}
            `}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
