"use client";

import { useState, useCallback, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Position = "bottom-right" | "bottom-left" | "bottom-center";
type Theme = "dark" | "light";
type Language = "en" | "ar";

interface WidgetConfig {
  color: string;
  personaName: string;
  greeting: string;
  position: Position;
  theme: Theme;
  lang: Language;
  poweredBy: boolean;
}

/* ------------------------------------------------------------------ */
/*  Toggle switch (matches booking-settings pattern)                   */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
        ${checked ? "bg-brand-600" : "bg-gray-200"}
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
/*  Option group (for position, theme, lang selectors)                 */
/* ------------------------------------------------------------------ */

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-150
              ${
                value === opt.value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock widget preview                                                */
/* ------------------------------------------------------------------ */

function WidgetPreview({ config }: { config: WidgetConfig }) {
  const isDark = config.theme === "dark";
  const isAr = config.lang === "ar";

  const positionClasses: Record<Position, string> = {
    "bottom-right": "right-4",
    "bottom-left": "left-4",
    "bottom-center": "left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={`relative w-full h-[480px] rounded-xl border overflow-hidden ${
        isDark ? "bg-gray-900 border-gray-700" : "bg-gray-100 border-gray-200"
      }`}
    >
      {/* Website placeholder */}
      <div className="p-4 space-y-3">
        <div
          className={`h-3 w-3/4 rounded ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          }`}
        />
        <div
          className={`h-3 w-1/2 rounded ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          }`}
        />
        <div
          className={`h-3 w-2/3 rounded ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          }`}
        />
        <div
          className={`h-20 w-full rounded-lg ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          }`}
        />
        <div
          className={`h-3 w-1/2 rounded ${
            isDark ? "bg-gray-800" : "bg-gray-200"
          }`}
        />
      </div>

      {/* Chat window mock */}
      <div
        className={`absolute bottom-16 ${positionClasses[config.position]} w-72 rounded-xl shadow-2xl overflow-hidden`}
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: config.color }}
        >
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {config.personaName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {config.personaName || "Assistant"}
            </p>
            <p className="text-xs text-white/70">
              {isAr ? "متصل الان" : "Online"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          className={`px-4 py-3 space-y-2 ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          {/* Bot greeting */}
          <div
            className={`${isAr ? "ml-8" : "mr-8"}`}
          >
            <div
              className={`text-sm rounded-xl px-3 py-2 ${
                isDark
                  ? "bg-gray-700 text-gray-200"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {config.greeting || (isAr ? "مرحبا! كيف يمكنني مساعدتك؟" : "Hello! How can I help you?")}
            </div>
          </div>

          {/* User reply */}
          <div
            className={`${isAr ? "mr-8" : "ml-8"} flex ${isAr ? "justify-start" : "justify-end"}`}
          >
            <div
              className="text-sm rounded-xl px-3 py-2 text-white"
              style={{ backgroundColor: config.color }}
            >
              {isAr ? "مرحبا!" : "Hi there!"}
            </div>
          </div>
        </div>

        {/* Input */}
        <div
          className={`px-3 py-2 border-t flex items-center gap-2 ${
            isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-100"
          }`}
        >
          <div
            className={`flex-1 h-8 rounded-full px-3 text-xs flex items-center ${
              isDark
                ? "bg-gray-700 text-gray-400"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {isAr ? "اكتب رسالتك..." : "Type a message..."}
          </div>
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </div>
        </div>

        {/* Powered by */}
        {config.poweredBy && (
          <div
            className={`text-center py-1 text-[10px] ${
              isDark ? "bg-gray-800 text-gray-500" : "bg-white text-gray-400"
            }`}
          >
            Powered by Kapso
          </div>
        )}
      </div>

      {/* FAB button */}
      <div
        className={`absolute bottom-4 ${positionClasses[config.position]}`}
      >
        <div
          className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: config.color }}
        >
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG: WidgetConfig = {
  color: "#2563eb",
  personaName: "Kapso",
  greeting: "Hello! How can I help you today?",
  position: "bottom-right",
  theme: "light",
  lang: "en",
  poweredBy: true,
};

export default function WidgetCustomizationPage() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /* ---- Update a single config field ---- */
  const updateConfig = useCallback(
    <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
      setSaveStatus("idle");
    },
    []
  );

  /* ---- Generate embed code ---- */
  const embedCode = useMemo(() => {
    return `<script>
window.__kapsoConfig = {
  clientId: '{YOUR_CLIENT_ID}',
  color: '${config.color}',
  personaName: '${config.personaName}',
  greeting: '${config.greeting.replace(/'/g, "\\'")}',
  lang: '${config.lang}',
  theme: '${config.theme}',
  position: '${config.position}',
  poweredBy: ${config.poweredBy},
  apiBase: 'https://n8n.dcp.sa'
};
</script>
<script src="https://n8n.dcp.sa/static/widget.js" defer></script>`;
  }, [config]);

  /* ---- Copy embed code ---- */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = embedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [embedCode]);

  /* ---- Save to API ---- */
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus("idle");

    try {
      const res = await fetch("/api/widget-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: config.color,
          greeting: config.greeting,
          personaName: config.personaName,
          position: config.position,
          theme: config.theme,
          lang: config.lang,
          poweredBy: config.poweredBy,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSaveStatus("success");
      setHasChanges(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [config]);

  /* ---- Preset colors ---- */
  const presetColors = [
    "#2563eb",
    "#059669",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#be185d",
    "#1d4ed8",
    "#000000",
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
                Widget Customization
              </h1>
              <p className="text-sm text-gray-500">
                Customize and embed your chat widget on any website
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column: Settings */}
          <div className="space-y-6">
            {/* Branding */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-blue-50 border-blue-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Branding
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set your widget&apos;s name, color, and greeting message
                </p>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Persona name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Persona Name
                  </label>
                  <input
                    type="text"
                    value={config.personaName}
                    onChange={(e) =>
                      updateConfig("personaName", e.target.value)
                    }
                    placeholder="e.g. Sara, Concierge, Support"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50
                               px-3 py-2 text-sm text-gray-900
                               placeholder:text-gray-400
                               focus:border-brand-400 focus:ring-1
                               focus:ring-brand-400 focus:outline-none
                               transition-colors"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) => updateConfig("color", e.target.value)}
                      className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={config.color}
                      onChange={(e) => updateConfig("color", e.target.value)}
                      className="w-28 rounded-lg border border-gray-200 bg-gray-50
                                 px-3 py-2 text-sm text-gray-900 font-mono
                                 focus:border-brand-400 focus:ring-1
                                 focus:ring-brand-400 focus:outline-none
                                 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateConfig("color", c)}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          config.color === c
                            ? "border-gray-900 scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Greeting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Greeting Message
                  </label>
                  <textarea
                    value={config.greeting}
                    onChange={(e) => updateConfig("greeting", e.target.value)}
                    rows={3}
                    placeholder="Hello! How can I help you today?"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50
                               px-3 py-2 text-sm text-gray-900
                               placeholder:text-gray-400
                               focus:border-brand-400 focus:ring-1
                               focus:ring-brand-400 focus:outline-none
                               transition-colors resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Position, Theme, Language */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-purple-50 border-purple-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Appearance
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Position, theme, language, and attribution
                </p>
              </div>
              <div className="px-6 py-5 space-y-5">
                <OptionGroup
                  label="Position"
                  value={config.position}
                  onChange={(val) => updateConfig("position", val)}
                  options={[
                    { value: "bottom-right", label: "Bottom Right" },
                    { value: "bottom-left", label: "Bottom Left" },
                    { value: "bottom-center", label: "Bottom Center" },
                  ]}
                />

                <OptionGroup
                  label="Theme"
                  value={config.theme}
                  onChange={(val) => updateConfig("theme", val)}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />

                <OptionGroup
                  label="Language"
                  value={config.lang}
                  onChange={(val) => updateConfig("lang", val)}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ar", label: "Arabic" },
                  ]}
                />

                {/* Powered By toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Show &quot;Powered by Kapso&quot;
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Display attribution in the widget footer
                    </p>
                  </div>
                  <Toggle
                    checked={config.poweredBy}
                    onChange={(val) => updateConfig("poweredBy", val)}
                    label="Toggle powered by"
                  />
                </div>
              </div>
            </section>

            {/* Embed Code */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-amber-50 border-amber-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Embed Code
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paste this into your website&apos;s HTML before the closing
                  &lt;/body&gt; tag
                </p>
              </div>
              <div className="px-6 py-5">
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                    {embedCode}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className={`absolute top-3 right-3 px-3 py-1.5 rounded-md text-xs font-medium
                               transition-all duration-200 ${
                                 copied
                                   ? "bg-green-500 text-white"
                                   : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                               }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </section>

            {/* Save button */}
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
                    Settings saved successfully
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
                    Failed to save settings
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
          </div>

          {/* Right column: Live preview */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Live Preview
              </h2>
              <p className="text-xs text-gray-500">
                See how your widget will look on your website
              </p>
            </div>
            <WidgetPreview config={config} />
          </div>
        </div>
      </main>
    </div>
  );
}
