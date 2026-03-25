"use client";

import { useState } from "react";
import { StepCompanyProfile, type CompanyProfileData } from "@/components/onboarding/step-company-profile";
import { StepSelectAgents } from "@/components/onboarding/step-select-agents";
import { StepReviewLaunch } from "@/components/onboarding/step-review-launch";
import type { AgentType } from "@project-agent/shared-types";

const STEPS = ["Company Profile", "Select Agents", "Review & Launch"];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
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
  const [selectedAgents, setSelectedAgents] = useState<AgentType[]>([]);

  function handleNext() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <StepSelectAgents
            selected={selectedAgents}
            onChange={setSelectedAgents}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 2 && (
          <StepReviewLaunch
            companyData={companyData}
            selectedAgents={selectedAgents}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
