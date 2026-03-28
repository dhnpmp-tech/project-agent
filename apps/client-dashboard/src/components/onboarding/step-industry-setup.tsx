"use client";

import { useState } from "react";
import type { AgentType } from "@project-agent/shared-types";

export interface IndustryConfig {
  industry: string;
  // Restaurant
  menuPdfUrl: string;
  menuPdfFile: File | null;
  sevenRoomsApiKey: string;
  sevenRoomsVenueId: string;
  googleMapsPlaceId: string;
  seatingCapacity: string;
  cuisineType: string;
  // Real Estate
  propertyTypes: string[];
  serviceAreas: string[];
  budgetRanges: string[];
  listingsSource: string;
  listingsApiUrl: string;
  // Healthcare / Beauty
  services: string[];
  appointmentDuration: string;
  // General
  ownerWhatsAppNumber: string;
  ownerName: string;
  notifyOnBooking: boolean;
  notifyOnComplaint: boolean;
  notifyOnHighValueLead: boolean;
  googleBusinessUrl: string;
}

interface Props {
  selectedAgents: AgentType[];
  config: IndustryConfig;
  onChange: (config: IndustryConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

const INDUSTRIES = [
  { id: "restaurant", label: "Restaurant / Hospitality", icon: "🍽️" },
  { id: "real_estate", label: "Real Estate", icon: "🏠" },
  { id: "healthcare", label: "Healthcare / Clinic", icon: "🏥" },
  { id: "beauty", label: "Beauty / Salon / Spa", icon: "💇" },
  { id: "ecommerce", label: "E-Commerce / Retail", icon: "🛒" },
  { id: "professional", label: "Professional Services", icon: "💼" },
  { id: "other", label: "Other", icon: "🔧" },
] as const;

const PROPERTY_TYPES = [
  "Apartments", "Villas", "Townhouses", "Penthouses",
  "Office Space", "Retail", "Warehouse", "Land",
];

const DUBAI_AREAS = [
  "Dubai Marina", "Downtown Dubai", "JBR", "Palm Jumeirah",
  "Business Bay", "JVC", "Dubai Hills", "MBR City",
  "DIFC", "Dubai Creek Harbour", "Jumeirah", "Al Barsha",
];

const BUDGET_RANGES = [
  "Under AED 500K", "500K - 1M", "1M - 2M", "2M - 5M",
  "5M - 10M", "10M+",
];

export function StepIndustrySetup({ selectedAgents, config, onChange, onNext, onBack }: Props) {
  const [activeSection, setActiveSection] = useState<string>(config.industry || "");

  function update<K extends keyof IndustryConfig>(field: K, value: IndustryConfig[K]) {
    onChange({ ...config, [field]: value });
  }

  function toggleArrayItem(field: "propertyTypes" | "serviceAreas" | "budgetRanges" | "services", item: string) {
    const current = config[field];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ ...config, [field]: updated });
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  const hasWhatsApp = selectedAgents.includes("wia");

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Tell us about your business so we can configure your AI agents perfectly.
        The more you share, the smarter your agents will be from day one.
      </p>

      {/* Industry selector */}
      {!activeSection && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What industry are you in?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => {
                  update("industry", ind.id);
                  setActiveSection(ind.id);
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                <span className="text-xl">{ind.icon}</span>
                <span className="text-sm font-medium text-gray-800">{ind.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Restaurant setup */}
      {activeSection === "restaurant" && (
        <div className="space-y-4">
          <SectionHeader
            icon="🍽️"
            title="Restaurant Setup"
            onBack={() => setActiveSection("")}
          />

          <Field label="Upload your menu (PDF)">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => update("menuPdfFile", e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-xs text-gray-400 mt-1">
              The AI will learn your entire menu — dishes, prices, ingredients, dietary info.
            </p>
          </Field>

          <Field label="Or paste a menu URL">
            <input
              type="url"
              value={config.menuPdfUrl}
              onChange={(e) => update("menuPdfUrl", e.target.value)}
              className={inputClass}
              placeholder="https://yourrestaurant.com/menu.pdf"
            />
          </Field>

          <Field label="SevenRooms API Key (for table reservations)">
            <input
              type="password"
              value={config.sevenRoomsApiKey}
              onChange={(e) => update("sevenRoomsApiKey", e.target.value)}
              className={inputClass}
              placeholder="sr_..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Found in SevenRooms → Settings → API. Enables direct table booking via WhatsApp.
            </p>
          </Field>

          <Field label="SevenRooms Venue ID">
            <input
              type="text"
              value={config.sevenRoomsVenueId}
              onChange={(e) => update("sevenRoomsVenueId", e.target.value)}
              className={inputClass}
              placeholder="venue_abc123"
            />
          </Field>

          <Field label="Google Maps Business URL">
            <input
              type="url"
              value={config.googleBusinessUrl}
              onChange={(e) => update("googleBusinessUrl", e.target.value)}
              className={inputClass}
              placeholder="https://maps.google.com/?cid=..."
            />
            <p className="text-xs text-gray-400 mt-1">
              So the agent can send your location and read your Google reviews.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cuisine type">
              <input
                type="text"
                value={config.cuisineType}
                onChange={(e) => update("cuisineType", e.target.value)}
                className={inputClass}
                placeholder="Lebanese, Japanese, Italian..."
              />
            </Field>
            <Field label="Seating capacity">
              <input
                type="text"
                value={config.seatingCapacity}
                onChange={(e) => update("seatingCapacity", e.target.value)}
                className={inputClass}
                placeholder="120 seats"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Real Estate setup */}
      {activeSection === "real_estate" && (
        <div className="space-y-4">
          <SectionHeader
            icon="🏠"
            title="Real Estate Setup"
            onBack={() => setActiveSection("")}
          />

          <Field label="Property types you deal in">
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleArrayItem("propertyTypes", type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    config.propertyTypes.includes(type)
                      ? "bg-brand-100 text-brand-700 ring-1 ring-brand-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Areas you cover">
            <div className="flex flex-wrap gap-2">
              {DUBAI_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleArrayItem("serviceAreas", area)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    config.serviceAreas.includes(area)
                      ? "bg-brand-100 text-brand-700 ring-1 ring-brand-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Budget ranges you serve">
            <div className="flex flex-wrap gap-2">
              {BUDGET_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => toggleArrayItem("budgetRanges", range)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    config.budgetRanges.includes(range)
                      ? "bg-brand-100 text-brand-700 ring-1 ring-brand-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Property listings source">
            <select
              value={config.listingsSource}
              onChange={(e) => update("listingsSource", e.target.value)}
              className={inputClass}
            >
              <option value="">Select...</option>
              <option value="manual">Manual updates (via WhatsApp)</option>
              <option value="api">API / CRM feed</option>
              <option value="bayut">Bayut / Property Finder</option>
              <option value="csv">CSV upload</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              How do you want to keep your property listings updated? The AI needs current inventory.
            </p>
          </Field>

          {config.listingsSource === "api" && (
            <Field label="Listings API URL">
              <input
                type="url"
                value={config.listingsApiUrl}
                onChange={(e) => update("listingsApiUrl", e.target.value)}
                className={inputClass}
                placeholder="https://yourcrm.com/api/listings"
              />
            </Field>
          )}

          <Field label="Google Business URL">
            <input
              type="url"
              value={config.googleBusinessUrl}
              onChange={(e) => update("googleBusinessUrl", e.target.value)}
              className={inputClass}
              placeholder="https://maps.google.com/?cid=..."
            />
          </Field>
        </div>
      )}

      {/* Healthcare / Beauty setup */}
      {(activeSection === "healthcare" || activeSection === "beauty") && (
        <div className="space-y-4">
          <SectionHeader
            icon={activeSection === "healthcare" ? "🏥" : "💇"}
            title={activeSection === "healthcare" ? "Healthcare Setup" : "Beauty / Salon Setup"}
            onBack={() => setActiveSection("")}
          />

          <Field label="Services you offer">
            <textarea
              rows={3}
              value={config.services.join("\n")}
              onChange={(e) => update("services", e.target.value.split("\n").filter(Boolean))}
              className={inputClass}
              placeholder={"Haircut - AED 80\nColor treatment - AED 250\nMassage (60 min) - AED 350\n..."}
            />
            <p className="text-xs text-gray-400 mt-1">One service per line, include prices if possible.</p>
          </Field>

          <Field label="Default appointment duration">
            <select
              value={config.appointmentDuration}
              onChange={(e) => update("appointmentDuration", e.target.value)}
              className={inputClass}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </Field>

          <Field label="Google Business URL">
            <input
              type="url"
              value={config.googleBusinessUrl}
              onChange={(e) => update("googleBusinessUrl", e.target.value)}
              className={inputClass}
              placeholder="https://maps.google.com/?cid=..."
            />
          </Field>
        </div>
      )}

      {/* Other / E-commerce / Professional */}
      {(activeSection === "ecommerce" || activeSection === "professional" || activeSection === "other") && (
        <div className="space-y-4">
          <SectionHeader
            icon={activeSection === "ecommerce" ? "🛒" : activeSection === "professional" ? "💼" : "🔧"}
            title="Business Setup"
            onBack={() => setActiveSection("")}
          />
          <Field label="Google Business URL">
            <input
              type="url"
              value={config.googleBusinessUrl}
              onChange={(e) => update("googleBusinessUrl", e.target.value)}
              className={inputClass}
              placeholder="https://maps.google.com/?cid=..."
            />
          </Field>
        </div>
      )}

      {/* Owner WhatsApp Channel — shown for all industries */}
      {activeSection && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
            <h4 className="text-sm font-semibold text-green-900">Owner WhatsApp Channel</h4>
          </div>
          <p className="text-xs text-green-700">
            Your AI agent will notify you on WhatsApp when important things happen —
            new bookings, complaints, high-value leads. You can also update your agent
            by texting it (e.g. &quot;We&apos;re sold out of the penthouse on Palm&quot; or &quot;Add
            today&apos;s special: Wagyu steak AED 280&quot;).
          </p>

          <Field label="Your WhatsApp number (owner/manager)">
            <input
              type="tel"
              value={config.ownerWhatsAppNumber}
              onChange={(e) => update("ownerWhatsAppNumber", e.target.value)}
              className={inputClass}
              placeholder="+971 50 123 4567"
            />
          </Field>

          <Field label="Your name">
            <input
              type="text"
              value={config.ownerName}
              onChange={(e) => update("ownerName", e.target.value)}
              className={inputClass}
              placeholder="Ahmed"
            />
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium text-green-800">Notify me when:</p>
            <label className="flex items-center gap-2 text-xs text-green-700">
              <input
                type="checkbox"
                checked={config.notifyOnBooking}
                onChange={(e) => update("notifyOnBooking", e.target.checked)}
                className="rounded border-green-300 text-green-600"
              />
              New booking or appointment
            </label>
            <label className="flex items-center gap-2 text-xs text-green-700">
              <input
                type="checkbox"
                checked={config.notifyOnComplaint}
                onChange={(e) => update("notifyOnComplaint", e.target.checked)}
                className="rounded border-green-300 text-green-600"
              />
              Customer complaint or escalation
            </label>
            <label className="flex items-center gap-2 text-xs text-green-700">
              <input
                type="checkbox"
                checked={config.notifyOnHighValueLead}
                onChange={(e) => update("notifyOnHighValueLead", e.target.checked)}
                className="rounded border-green-300 text-green-600"
              />
              High-value lead (score 75+)
            </label>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!activeSection}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, onBack }: { icon: string; title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-xl">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
