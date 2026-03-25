"use client";

import { useState } from "react";

export interface CrawlData {
  businessDescription: string;
  services: string[];
  faq: { question: string; answer: string }[];
  businessHours: string;
  contactInfo: { phone?: string; email?: string; address?: string };
  teamMembers: string[];
  socialProfiles: Record<string, string>;
  reviewSources: { platform: string; url: string }[];
  brandVoice: string;
  industryKeywords: string[];
  jobListings: string[];
  pagesScanned: string[];
}

interface Props {
  websiteUrl: string;
  onWebsiteUrlChange: (url: string) => void;
  crawlData: CrawlData | null;
  onCrawlComplete: (data: CrawlData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepWebsiteCrawl({
  websiteUrl,
  onWebsiteUrlChange,
  crawlData,
  onCrawlComplete,
  onNext,
  onBack,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Crawl failed. Please check the URL.");
        setLoading(false);
        return;
      }

      onCrawlComplete(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Enter your website URL and we&apos;ll automatically extract your business
          information, services, FAQ, team, social profiles, and reviews to
          pre-fill your agent knowledge base.
        </p>

        <form onSubmit={handleCrawl} className="flex gap-2">
          <input
            type="text"
            required
            value={websiteUrl}
            onChange={(e) => onWebsiteUrlChange(e.target.value)}
            className={inputClass}
            placeholder="yourcompany.com"
          />
          <button
            type="submit"
            disabled={loading || !websiteUrl.trim()}
            className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Scanning..." : crawlData ? "Re-scan" : "Scan website"}
          </button>
        </form>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <div className="animate-pulse space-y-3">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">
              Scanning website pages, extracting business data, finding social
              profiles and reviews...
            </p>
            <p className="text-xs text-gray-400">This may take 15-30 seconds</p>
          </div>
        </div>
      )}

      {crawlData && !loading && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Pages scanned" value={crawlData.pagesScanned.length} />
            <Stat label="FAQ items" value={crawlData.faq.length} />
            <Stat label="Services found" value={crawlData.services.length} />
            <Stat label="Social profiles" value={Object.keys(crawlData.socialProfiles).length} />
          </div>

          {/* Business description */}
          {crawlData.businessDescription && (
            <Section title="Business Description">
              <p className="text-sm text-gray-700">{crawlData.businessDescription}</p>
            </Section>
          )}

          {/* Services */}
          {crawlData.services.length > 0 && (
            <Section title="Services">
              <div className="flex flex-wrap gap-1.5">
                {crawlData.services.map((s, i) => (
                  <span key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Social profiles */}
          {Object.keys(crawlData.socialProfiles).length > 0 && (
            <Section title="Social Profiles">
              <div className="space-y-1">
                {Object.entries(crawlData.socialProfiles).map(([platform, url]) => (
                  <div key={platform} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700 capitalize w-20">{platform}</span>
                    <span className="text-gray-500 truncate text-xs">{url}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Reviews */}
          {crawlData.reviewSources.length > 0 && (
            <Section title="Review Sources">
              <div className="space-y-1">
                {crawlData.reviewSources.map((r, i) => (
                  <div key={i} className="text-sm text-gray-700">
                    {r.platform}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Brand voice */}
          {crawlData.brandVoice && (
            <Section title="Brand Voice">
              <p className="text-sm text-gray-700">{crawlData.brandVoice}</p>
            </Section>
          )}

          {/* Industry keywords */}
          {crawlData.industryKeywords.length > 0 && (
            <Section title="Industry Keywords">
              <div className="flex flex-wrap gap-1.5">
                {crawlData.industryKeywords.map((k, i) => (
                  <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-brand-700">
                    {k}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* FAQ preview */}
          {crawlData.faq.length > 0 && (
            <Section title={`FAQ (${crawlData.faq.length} items)`}>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {crawlData.faq.slice(0, 5).map((item, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-gray-800">Q: {item.question}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.answer.slice(0, 120)}...</p>
                  </div>
                ))}
                {crawlData.faq.length > 5 && (
                  <p className="text-xs text-gray-400">+{crawlData.faq.length - 5} more (editable in next step)</p>
                )}
              </div>
            </Section>
          )}

          {/* Team */}
          {crawlData.teamMembers.length > 0 && (
            <Section title="Team Members">
              <div className="flex flex-wrap gap-1.5">
                {crawlData.teamMembers.map((m, i) => (
                  <span key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">{m}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Job listings */}
          {crawlData.jobListings.length > 0 && (
            <Section title="Job Listings">
              <div className="flex flex-wrap gap-1.5">
                {crawlData.jobListings.map((j, i) => (
                  <span key={i} className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">{j}</span>
                ))}
              </div>
            </Section>
          )}

          <p className="text-xs text-gray-400 text-center">
            You can review and edit all extracted data in the next step.
          </p>
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
          {crawlData ? "Continue" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  );
}
