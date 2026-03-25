"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { AGENT_DISPLAY_NAMES, type AgentType } from "@project-agent/shared-types";
import type { CompanyProfileData } from "./step-company-profile";

interface Props {
  companyData: CompanyProfileData;
  selectedAgents: AgentType[];
  onBack: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function StepReviewLaunch({ companyData, selectedAgents, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Create client record
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          slug,
          company_name: companyData.companyName,
          company_name_ar: companyData.companyNameAr || null,
          contact_name: companyData.contactName,
          contact_email: companyData.contactEmail,
          contact_phone: companyData.contactPhone || null,
          country: companyData.country,
          plan: companyData.plan,
          metadata: { business_description: companyData.businessDescription },
        })
        .select("id")
        .single();

      if (clientError) {
        if (clientError.code === "23505") {
          setError("A company with this name already exists. Please use a different name.");
        } else {
          setError(clientError.message);
        }
        setLoading(false);
        return;
      }

      // Create agent deployments
      const agentRows = selectedAgents.map((agentType) => ({
        client_id: client.id,
        agent_type: agentType,
        status: "pending" as const,
        config: {
          companyName: companyData.companyName,
          companyNameAr: companyData.companyNameAr,
          businessDescription: companyData.businessDescription,
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

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Company summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Company</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="text-gray-900">{companyData.companyName}</dd>

          {companyData.companyNameAr && (
            <>
              <dt className="text-gray-500">Name (Arabic)</dt>
              <dd className="text-gray-900" dir="rtl">{companyData.companyNameAr}</dd>
            </>
          )}

          <dt className="text-gray-500">Contact</dt>
          <dd className="text-gray-900">{companyData.contactName}</dd>

          <dt className="text-gray-500">Email</dt>
          <dd className="text-gray-900">{companyData.contactEmail}</dd>

          {companyData.contactPhone && (
            <>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-900">{companyData.contactPhone}</dd>
            </>
          )}

          <dt className="text-gray-500">Country</dt>
          <dd className="text-gray-900">
            {companyData.country === "AE" ? "UAE" : "Saudi Arabia"}
          </dd>

          <dt className="text-gray-500">Plan</dt>
          <dd className="text-gray-900 capitalize">{companyData.plan}</dd>
        </dl>
      </div>

      {/* Agents summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Agents to deploy ({selectedAgents.length})
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

      <p className="text-xs text-gray-400 text-center">
        Your agents will be queued for deployment. You can configure API keys
        and calendar integrations from the dashboard.
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
          onClick={handleLaunch}
          disabled={loading}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Setting up..." : "Launch workspace"}
        </button>
      </div>
    </div>
  );
}
