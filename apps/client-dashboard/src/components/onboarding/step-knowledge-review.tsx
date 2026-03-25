"use client";

import { useState } from "react";
import type { CrawlData } from "./step-website-crawl";

interface Props {
  crawlData: CrawlData | null;
  knowledgeOverrides: KnowledgeOverrides;
  onChange: (overrides: KnowledgeOverrides) => void;
  onNext: () => void;
  onBack: () => void;
}

export interface KnowledgeOverrides {
  businessDescription: string;
  brandVoice: string;
  businessHours: string;
  services: string;
  faqText: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  companyCulture: string;
  icpNotes: string;
  additionalNotes: string;
}

export function StepKnowledgeReview({
  crawlData,
  knowledgeOverrides,
  onChange,
  onNext,
  onBack,
}: Props) {
  const [activeTab, setActiveTab] = useState<"general" | "sales" | "hr" | "content">("general");

  function update(field: keyof KnowledgeOverrides, value: string) {
    onChange({ ...knowledgeOverrides, [field]: value });
  }

  // Pre-fill from crawl data if overrides are empty
  const desc = knowledgeOverrides.businessDescription || crawlData?.businessDescription || "";
  const voice = knowledgeOverrides.brandVoice || crawlData?.brandVoice || "";
  const hours = knowledgeOverrides.businessHours || crawlData?.businessHours || "";
  const services = knowledgeOverrides.services || (crawlData?.services || []).join(", ");
  const faq =
    knowledgeOverrides.faqText ||
    (crawlData?.faq || [])
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n\n");
  const phone = knowledgeOverrides.contactPhone || crawlData?.contactInfo?.phone || "";
  const email = knowledgeOverrides.contactEmail || crawlData?.contactInfo?.email || "";
  const address = knowledgeOverrides.contactAddress || crawlData?.contactInfo?.address || "";

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  const tabs = [
    { key: "general" as const, label: "General" },
    { key: "sales" as const, label: "Sales & ICP" },
    { key: "hr" as const, label: "HR & Culture" },
    { key: "content" as const, label: "Content" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Review and edit the extracted business knowledge. This data powers all your
        AI agents — the more complete it is, the better they perform.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === "general" && (
        <div className="space-y-4">
          <Field label="Business description" required>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => update("businessDescription", e.target.value)}
              className={inputClass}
              placeholder="What does your company do? Describe your main offerings."
            />
          </Field>

          <Field label="Services / Products">
            <input
              type="text"
              value={services}
              onChange={(e) => update("services", e.target.value)}
              className={inputClass}
              placeholder="Service 1, Service 2, Product A, ..."
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated list</p>
          </Field>

          <Field label="Business hours">
            <input
              type="text"
              value={hours}
              onChange={(e) => update("businessHours", e.target.value)}
              className={inputClass}
              placeholder="Sun-Thu 9:00-18:00 GST"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => update("contactPhone", e.target.value)}
                className={inputClass}
                placeholder="+971 50 123 4567"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => update("contactEmail", e.target.value)}
                className={inputClass}
                placeholder="info@company.com"
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                value={address}
                onChange={(e) => update("contactAddress", e.target.value)}
                className={inputClass}
                placeholder="Dubai, UAE"
              />
            </Field>
          </div>

          <Field label="FAQ / Knowledge base">
            <textarea
              rows={8}
              value={faq}
              onChange={(e) => update("faqText", e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              placeholder={"Q: What services do you offer?\nA: We offer...\n\nQ: What are your prices?\nA: Our pricing starts at..."}
            />
            <p className="text-xs text-gray-400 mt-1">
              Format: Q: question, A: answer. One pair per block. The more Q&As, the
              better your WhatsApp agent handles customer inquiries.
            </p>
          </Field>
        </div>
      )}

      {/* Sales & ICP tab */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          <Field label="Ideal Customer Profile (ICP)">
            <textarea
              rows={5}
              value={knowledgeOverrides.icpNotes}
              onChange={(e) => update("icpNotes", e.target.value)}
              className={inputClass}
              placeholder={"Target: SMBs in UAE/Saudi, 1-50 employees\nIndustries: Real estate, hospitality, healthcare\nDecision makers: CEO, Founder, Operations Head\nPain points: Manual follow-up, no automation"}
            />
            <p className="text-xs text-gray-400 mt-1">
              Used by the AI SDR agent to qualify and score leads.
            </p>
          </Field>

          <Field label="Key value propositions">
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => update("businessDescription", e.target.value)}
              className={inputClass}
              placeholder="What makes your business unique? Why should prospects choose you?"
            />
          </Field>

          {crawlData && crawlData.socialProfiles && Object.keys(crawlData.socialProfiles).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Social profiles found</p>
              {Object.entries(crawlData.socialProfiles).map(([platform, url]) => (
                <p key={platform} className="text-sm text-gray-700">
                  <span className="capitalize font-medium">{platform}:</span>{" "}
                  <span className="text-gray-500 text-xs">{url}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HR & Culture tab */}
      {activeTab === "hr" && (
        <div className="space-y-4">
          <Field label="Company culture & values">
            <textarea
              rows={3}
              value={knowledgeOverrides.companyCulture}
              onChange={(e) => update("companyCulture", e.target.value)}
              className={inputClass}
              placeholder="Describe your company culture, core values, and what you look for in candidates..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Used by the HR Screening agent to evaluate culture fit.
            </p>
          </Field>

          {crawlData && crawlData.jobListings.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Job listings found ({crawlData.jobListings.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {crawlData.jobListings.map((j, i) => (
                  <span key={i} className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">
                    {j}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content tab */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <Field label="Brand voice & tone">
            <textarea
              rows={3}
              value={voice}
              onChange={(e) => update("brandVoice", e.target.value)}
              className={inputClass}
              placeholder="Professional yet approachable, technical but accessible. We use industry terms but explain them. Our tone is confident, not aggressive."
            />
            <p className="text-xs text-gray-400 mt-1">
              Used by the Content Engine to match your brand in social media posts.
            </p>
          </Field>

          {crawlData && crawlData.industryKeywords.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Industry keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {crawlData.industryKeywords.map((k, i) => (
                  <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-brand-700">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Field label="Additional notes for agents">
            <textarea
              rows={3}
              value={knowledgeOverrides.additionalNotes}
              onChange={(e) => update("additionalNotes", e.target.value)}
              className={inputClass}
              placeholder="Any other information your agents should know about your business..."
            />
          </Field>
        </div>
      )}

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
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
