"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-url";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IntegrationStatus = "connected" | "disconnected" | "error";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "password";
}

interface Integration {
  id: string;
  name: string;
  color: string;           // dot color
  authType: "oauth" | "credentials";
  fields?: FieldDef[];     // only for credentials-based
  status: IntegrationStatus;
  lastChecked?: string;     // e.g. "2 min ago"
}

interface Category {
  name: string;
  integrations: Integration[];
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const INITIAL_CATEGORIES: Category[] = [
  {
    name: "Reservations",
    integrations: [
      {
        id: "sevenrooms",
        name: "SevenRooms",
        color: "bg-violet-500",
        authType: "credentials",
        fields: [
          { key: "client_id", label: "Client ID", type: "text" },
          { key: "client_secret", label: "Client Secret", type: "password" },
          { key: "venue_id", label: "Venue ID", type: "text" },
        ],
        status: "disconnected",
      },
      {
        id: "eatapp",
        name: "Eat App",
        color: "bg-orange-500",
        authType: "credentials",
        fields: [
          { key: "api_key", label: "API Key", type: "password" },
          { key: "restaurant_id", label: "Restaurant ID", type: "text" },
        ],
        status: "disconnected",
      },
    ],
  },
  {
    name: "CRM",
    integrations: [
      {
        id: "hubspot",
        name: "HubSpot",
        color: "bg-orange-600",
        authType: "oauth",
        status: "disconnected",
      },
      {
        id: "zoho",
        name: "Zoho CRM",
        color: "bg-red-500",
        authType: "oauth",
        status: "disconnected",
      },
    ],
  },
  {
    name: "Calendar",
    integrations: [
      {
        id: "google-calendar",
        name: "Google Calendar",
        color: "bg-blue-500",
        authType: "oauth",
        status: "disconnected",
      },
      {
        id: "google-sheets",
        name: "Google Sheets",
        color: "bg-green-600",
        authType: "oauth",
        status: "disconnected",
      },
    ],
  },
  {
    name: "Payments",
    integrations: [
      {
        id: "stripe",
        name: "Stripe",
        color: "bg-indigo-500",
        authType: "oauth",
        status: "disconnected",
      },
      {
        id: "tabby",
        name: "Tabby",
        color: "bg-teal-500",
        authType: "credentials",
        fields: [
          { key: "secret_key", label: "Secret Key", type: "password" },
          { key: "merchant_code", label: "Merchant Code", type: "text" },
        ],
        status: "disconnected",
      },
      {
        id: "tamara",
        name: "Tamara",
        color: "bg-sky-500",
        authType: "credentials",
        fields: [
          { key: "api_token", label: "API Token", type: "password" },
        ],
        status: "disconnected",
      },
    ],
  },
  {
    name: "POS",
    integrations: [
      {
        id: "foodics",
        name: "Foodics",
        color: "bg-rose-500",
        authType: "credentials",
        fields: [
          { key: "api_key", label: "API Key", type: "password" },
          { key: "api_secret", label: "API Secret", type: "password" },
        ],
        status: "disconnected",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { dot: string; text: string; label: string }> = {
    connected:    { dot: "bg-green-500", text: "text-green-700", label: "Connected" },
    disconnected: { dot: "bg-gray-300",  text: "text-gray-500",  label: "Not connected" },
    error:        { dot: "bg-red-500",   text: "text-red-700",   label: "Error" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Integration Card                                                   */
/* ------------------------------------------------------------------ */

function IntegrationCard({
  integration,
  onSave,
  onDisconnect,
  onOAuthConnect,
}: {
  integration: Integration;
  onSave: (id: string, values: Record<string, string>) => Promise<void>;
  onDisconnect: (id: string) => void;
  onOAuthConnect: (id: string) => void;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(integration.id, fieldValues);
    } finally {
      setSaving(false);
    }
  };

  const isConnected = integration.status === "connected";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-8 w-8 rounded-lg ${integration.color} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">
              {integration.name.charAt(0)}
            </span>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
            <StatusBadge status={integration.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="text-[11px] text-gray-400 mr-2">
              Last checked: {integration.lastChecked || "2 min ago"}
            </span>
          )}

          {isConnected ? (
            <button
              onClick={() => onDisconnect(integration.id)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Disconnect
            </button>
          ) : integration.authType === "oauth" ? (
            <button
              onClick={() => onOAuthConnect(integration.id)}
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {expanded ? "Cancel" : "Configure"}
            </button>
          )}
        </div>
      </div>

      {/* Credential fields (expandable) */}
      {expanded && integration.authType === "credentials" && integration.fields && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          {integration.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {field.label}
              </label>
              <input
                type={field.type}
                value={fieldValues[field.key] || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none transition-colors"
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-1 rounded-lg bg-gray-900 px-5 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Credentials"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function IntegrationsPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  const handleSave = useCallback(async (integrationId: string, values: Record<string, string>) => {
    try {
      const res = await fetch(apiUrl("/api/integrations/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId, credentials: values }),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Optimistic update: mark as connected
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          integrations: cat.integrations.map((integ) =>
            integ.id === integrationId
              ? { ...integ, status: "connected" as IntegrationStatus, lastChecked: "just now" }
              : integ
          ),
        }))
      );
    } catch {
      // In production, show a toast / error banner
      console.error("Save failed for", integrationId);
    }
  }, []);

  const handleDisconnect = useCallback((integrationId: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        integrations: cat.integrations.map((integ) =>
          integ.id === integrationId
            ? { ...integ, status: "disconnected" as IntegrationStatus, lastChecked: undefined }
            : integ
        ),
      }))
    );
  }, []);

  const handleOAuthConnect = useCallback((integrationId: string) => {
    // Placeholder: in production, redirect to OAuth authorization URL
    console.log("OAuth connect:", integrationId);
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        integrations: cat.integrations.map((integ) =>
          integ.id === integrationId
            ? { ...integ, status: "connected" as IntegrationStatus, lastChecked: "just now" }
            : integ
        ),
      }))
    );
  }, []);

  const connectedCount = categories
    .flatMap((c) => c.integrations)
    .filter((i) => i.status === "connected").length;

  const totalCount = categories.flatMap((c) => c.integrations).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
              &larr; Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
              <p className="text-sm text-gray-500">
                Connect your business tools to your AI agents
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            {connectedCount} / {totalCount} connected
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {categories.map((category) => (
          <section key={category.name}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onSave={handleSave}
                  onDisconnect={handleDisconnect}
                  onOAuthConnect={handleOAuthConnect}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
