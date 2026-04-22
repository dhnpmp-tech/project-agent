"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { StepCompanyProfile, type CompanyProfileData } from "@/components/onboarding/step-company-profile";
import { StepWebsiteCrawl, type CrawlData } from "@/components/onboarding/step-website-crawl";
import { StepKnowledgeReview, type KnowledgeOverrides } from "@/components/onboarding/step-knowledge-review";
import { StepSelectAgents } from "@/components/onboarding/step-select-agents";
import { StepIndustrySetup, type IndustryConfig } from "@/components/onboarding/step-industry-setup";
import { OnboardingTutorial } from "@/components/onboarding/onboarding-tutorial";
import { AGENT_DISPLAY_NAMES, type AgentType } from "@project-agent/shared-types";
import { apiUrl } from "@/lib/api-url";

const STEPS = [
  "Company Profile",
  "Scan Website",
  "Knowledge Base",
  "Select Agents",
  "Industry Setup",
  "Review & Launch",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function parseFaqText(text: string): { question: string; answer: string }[] {
  if (!text.trim()) return [];
  const blocks = text.split(/\n\n+/);
  const faq: { question: string; answer: string }[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const qLine = lines.find((l) => l.startsWith("Q:"));
    const aLine = lines.find((l) => l.startsWith("A:"));
    if (qLine && aLine) {
      faq.push({
        question: qLine.replace(/^Q:\s*/, "").trim(),
        answer: aLine.replace(/^A:\s*/, "").trim(),
      });
    }
  }
  return faq;
}

export default function OnboardingPage() {
  const [showTutorial, setShowTutorial] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyData, setCompanyData] = useState<CompanyProfileData>({
    companyName: "",
    companyNameAr: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    country: "AE",
    plan: "starter",
    businessDescription: "",
  });

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [crawlData, setCrawlData] = useState<CrawlData | null>(null);

  const [knowledgeOverrides, setKnowledgeOverrides] = useState<KnowledgeOverrides>({
    businessDescription: "",
    brandVoice: "",
    businessHours: "",
    services: "",
    faqText: "",
    contactPhone: "",
    contactEmail: "",
    contactAddress: "",
    companyCulture: "",
    icpNotes: "",
    additionalNotes: "",
  });

  const [selectedAgents, setSelectedAgents] = useState<AgentType[]>([]);
  const [industryConfig, setIndustryConfig] = useState<IndustryConfig>({
    industry: "",
    menuPdfUrl: "",
    menuPdfFile: null,
    sevenRoomsApiKey: "",
    sevenRoomsVenueId: "",
    googleMapsPlaceId: "",
    seatingCapacity: "",
    cuisineType: "",
    propertyTypes: [],
    serviceAreas: [],
    budgetRanges: [],
    listingsSource: "",
    listingsApiUrl: "",
    services: [],
    appointmentDuration: "30",
    ownerWhatsAppNumber: "",
    ownerName: "",
    notifyOnBooking: true,
    notifyOnComplaint: true,
    notifyOnHighValueLead: true,
    googleBusinessUrl: "",
  });

  function handleNext() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  function handleCrawlComplete(data: CrawlData) {
    setCrawlData(data);
    // Pre-fill company data from crawl if empty
    if (!companyData.businessDescription && data.businessDescription) {
      setCompanyData((prev) => ({
        ...prev,
        businessDescription: data.businessDescription,
      }));
    }
  }

  async function handleLaunch() {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to complete onboarding.");
        setLoading(false);
        return;
      }

      const slug = slugify(companyData.companyName);

      // Generate client UUID so we can use it immediately without needing
      // a SELECT (RLS blocks SELECT until client_id is in user metadata)
      const clientId = crypto.randomUUID();

      // 1. Create client record
      const { error: clientError } = await supabase
        .from("clients")
        .insert({
          id: clientId,
          slug,
          company_name: companyData.companyName,
          company_name_ar: companyData.companyNameAr || null,
          contact_name: companyData.contactName,
          contact_email: companyData.contactEmail,
          contact_phone: companyData.contactPhone || null,
          country: companyData.country,
          plan: companyData.plan,
          metadata: { business_description: companyData.businessDescription },
        });

      if (clientError) {
        if (clientError.code === "23505") {
          setError("A company with this name already exists.");
        } else {
          setError(clientError.message);
        }
        setLoading(false);
        return;
      }

      // 1b. Set client_id in user metadata so RLS policies work going forward
      await supabase.auth.updateUser({
        data: { client_id: clientId },
      });

      // 1c. Force session refresh so the JWT cookie includes the new client_id
      // Without this, the dashboard's server-side queries will fail RLS checks
      await supabase.auth.refreshSession();

      // 2. Build merged knowledge from crawl + overrides
      const finalDesc =
        knowledgeOverrides.businessDescription ||
        crawlData?.businessDescription ||
        companyData.businessDescription;
      const finalServices = (
        knowledgeOverrides.services || (crawlData?.services || []).join(", ")
      )
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const finalFaq =
        parseFaqText(knowledgeOverrides.faqText).length > 0
          ? parseFaqText(knowledgeOverrides.faqText)
          : crawlData?.faq || [];

      // 3. Save to business_knowledge table
      const { error: knowledgeError } = await supabase
        .from("business_knowledge")
        .insert({
          client_id: clientId,
          website_url: websiteUrl || null,
          business_description: finalDesc,
          brand_voice: knowledgeOverrides.brandVoice || crawlData?.brandVoice || null,
          business_hours:
            knowledgeOverrides.businessHours || crawlData?.businessHours || null,
          industry_keywords: crawlData?.industryKeywords || [],
          contact_info: {
            phone: knowledgeOverrides.contactPhone || crawlData?.contactInfo?.phone,
            email: knowledgeOverrides.contactEmail || crawlData?.contactInfo?.email,
            address: knowledgeOverrides.contactAddress || crawlData?.contactInfo?.address,
          },
          services: finalServices,
          faq: finalFaq,
          team_members: (crawlData?.teamMembers || []).map((m) => {
            const parts = m.split(" - ");
            return { name: parts[0], role: parts[1] || "" };
          }),
          social_profiles: crawlData?.socialProfiles || {},
          review_sources: crawlData?.reviewSources || [],
          icp_criteria: knowledgeOverrides.icpNotes
            ? { notes: knowledgeOverrides.icpNotes }
            : {},
          company_culture: knowledgeOverrides.companyCulture || null,
          job_listings: (crawlData?.jobListings || []).map((j) => ({ title: j })),
          crawl_data: {
            ...(crawlData
              ? {
                  pages_scanned: crawlData.pagesScanned,
                  last_crawled_at: new Date().toISOString(),
                }
              : {}),
            // Industry-specific config
            industry: industryConfig.industry,
            owner_whatsapp: industryConfig.ownerWhatsAppNumber || null,
            owner_name: industryConfig.ownerName || null,
            notify_on_booking: industryConfig.notifyOnBooking,
            notify_on_complaint: industryConfig.notifyOnComplaint,
            notify_on_high_value_lead: industryConfig.notifyOnHighValueLead,
            google_business_url: industryConfig.googleBusinessUrl || null,
            // Restaurant-specific
            ...(industryConfig.industry === "restaurant" && {
              menu_pdf_url: industryConfig.menuPdfUrl || null,
              sevenrooms_api_key: industryConfig.sevenRoomsApiKey || null,
              sevenrooms_venue_id: industryConfig.sevenRoomsVenueId || null,
              cuisine_type: industryConfig.cuisineType || null,
              seating_capacity: industryConfig.seatingCapacity || null,
            }),
            // Real estate-specific
            ...(industryConfig.industry === "real_estate" && {
              property_types: industryConfig.propertyTypes,
              service_areas: industryConfig.serviceAreas,
              budget_ranges: industryConfig.budgetRanges,
              listings_source: industryConfig.listingsSource || null,
              listings_api_url: industryConfig.listingsApiUrl || null,
            }),
            // Healthcare/Beauty-specific
            ...((industryConfig.industry === "healthcare" || industryConfig.industry === "beauty") && {
              service_list: industryConfig.services,
              appointment_duration: industryConfig.appointmentDuration,
            }),
          },
        });

      if (knowledgeError) {
        console.error("Knowledge save error:", knowledgeError);
        // Non-blocking — proceed even if knowledge save fails
      }

      // 4. Create agent deployments with knowledge context
      const agentRows = selectedAgents.map((agentType) => ({
        client_id: clientId,
        agent_type: agentType,
        status: "pending" as const,
        config: {
          companyName: companyData.companyName,
          companyNameAr: companyData.companyNameAr,
          businessDescription: finalDesc,
          brandVoice: knowledgeOverrides.brandVoice || crawlData?.brandVoice,
          businessHours:
            knowledgeOverrides.businessHours || crawlData?.businessHours,
          knowledgeBaseContent: finalFaq
            .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
            .join("\n\n"),
          services: finalServices,
        },
      }));

      const { error: agentsError } = await supabase
        .from("agent_deployments")
        .insert(agentRows);

      if (agentsError) {
        setError(agentsError.message);
        setLoading(false);
        return;
      }

      // 5. Trigger auto-provisioning (non-blocking)
      fetch(apiUrl("/api/provisioning/trigger"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId }),
      }).catch(() => {}); // Non-blocking — don't fail onboarding if this errors

      window.location.href = apiUrl("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showTutorial && (
        <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
      )}
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set up your workspace</h1>
          <p className="mt-2 text-sm text-gray-500">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-brand-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        {currentStep === 0 && (
          <StepCompanyProfile
            data={companyData}
            onChange={setCompanyData}
            onNext={handleNext}
          />
        )}
        {currentStep === 1 && (
          <StepWebsiteCrawl
            websiteUrl={websiteUrl}
            onWebsiteUrlChange={setWebsiteUrl}
            crawlData={crawlData}
            onCrawlComplete={handleCrawlComplete}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 2 && (
          <StepKnowledgeReview
            crawlData={crawlData}
            knowledgeOverrides={knowledgeOverrides}
            onChange={setKnowledgeOverrides}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && (
          <StepSelectAgents
            selected={selectedAgents}
            onChange={setSelectedAgents}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 4 && (
          <StepIndustrySetup
            selectedAgents={selectedAgents}
            config={industryConfig}
            onChange={setIndustryConfig}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 5 && (
          <ReviewAndLaunch
            companyData={companyData}
            websiteUrl={websiteUrl}
            crawlData={crawlData}
            knowledgeOverrides={knowledgeOverrides}
            selectedAgents={selectedAgents}
            industryConfig={industryConfig}
            loading={loading}
            error={error}
            onBack={handleBack}
            onLaunch={handleLaunch}
          />
        )}
      </div>
    </div>
  );
}

function ReviewAndLaunch({
  companyData,
  websiteUrl,
  crawlData,
  knowledgeOverrides,
  selectedAgents,
  industryConfig,
  loading,
  error,
  onBack,
  onLaunch,
}: {
  companyData: CompanyProfileData;
  websiteUrl: string;
  crawlData: CrawlData | null;
  knowledgeOverrides: KnowledgeOverrides;
  selectedAgents: AgentType[];
  industryConfig: IndustryConfig;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onLaunch: () => void;
}) {
  const knowledgeItems = [
    crawlData?.faq?.length && `${crawlData.faq.length} FAQ items`,
    crawlData?.services?.length && `${crawlData.services.length} services`,
    Object.keys(crawlData?.socialProfiles || {}).length &&
      `${Object.keys(crawlData?.socialProfiles || {}).length} social profiles`,
    crawlData?.reviewSources?.length && `${crawlData.reviewSources.length} review sources`,
    crawlData?.teamMembers?.length && `${crawlData.teamMembers.length} team members`,
    crawlData?.jobListings?.length && `${crawlData.jobListings.length} job listings`,
    crawlData?.industryKeywords?.length && `${crawlData.industryKeywords.length} keywords`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Company</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="text-gray-900">{companyData.companyName}</dd>
          <dt className="text-gray-500">Contact</dt>
          <dd className="text-gray-900">{companyData.contactName}</dd>
          <dt className="text-gray-500">Country</dt>
          <dd className="text-gray-900">{companyData.country === "AE" ? "UAE" : "Saudi Arabia"}</dd>
          <dt className="text-gray-500">Plan</dt>
          <dd className="text-gray-900 capitalize">{companyData.plan}</dd>
          {websiteUrl && (
            <>
              <dt className="text-gray-500">Website</dt>
              <dd className="text-gray-900 text-xs">{websiteUrl}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Knowledge Base</h3>
        {knowledgeItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {knowledgeItems.map((item, i) => (
              <span key={i} className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No website scanned — agents will use manual config only.</p>
        )}
        {(knowledgeOverrides.icpNotes || knowledgeOverrides.companyCulture || knowledgeOverrides.additionalNotes) && (
          <p className="mt-2 text-xs text-gray-500">+ custom overrides applied</p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Agents ({selectedAgents.length})
        </h3>
        <ul className="space-y-1.5">
          {selectedAgents.map((type) => (
            <li key={type} className="text-sm text-gray-700 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600 inline-block" />
              {AGENT_DISPLAY_NAMES[type]}
            </li>
          ))}
        </ul>
      </div>

      {industryConfig.industry && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Industry Setup</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Industry</dt>
            <dd className="text-gray-900 capitalize">{industryConfig.industry.replace("_", " ")}</dd>
            {industryConfig.ownerWhatsAppNumber && (
              <>
                <dt className="text-gray-500">Owner WhatsApp</dt>
                <dd className="text-gray-900">{industryConfig.ownerWhatsAppNumber}</dd>
              </>
            )}
            {industryConfig.propertyTypes.length > 0 && (
              <>
                <dt className="text-gray-500">Property Types</dt>
                <dd className="text-gray-900">{industryConfig.propertyTypes.join(", ")}</dd>
              </>
            )}
            {industryConfig.serviceAreas.length > 0 && (
              <>
                <dt className="text-gray-500">Areas</dt>
                <dd className="text-gray-900">{industryConfig.serviceAreas.join(", ")}</dd>
              </>
            )}
            {industryConfig.cuisineType && (
              <>
                <dt className="text-gray-500">Cuisine</dt>
                <dd className="text-gray-900">{industryConfig.cuisineType}</dd>
              </>
            )}
            {industryConfig.sevenRoomsApiKey && (
              <>
                <dt className="text-gray-500">SevenRooms</dt>
                <dd className="text-gray-900 text-green-600">Connected</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        All agents will have access to your business knowledge base. You can
        update it anytime from the dashboard.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onLaunch}
          disabled={loading}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Setting up..." : "Launch workspace"}
        </button>
      </div>
    </div>
  );
}
