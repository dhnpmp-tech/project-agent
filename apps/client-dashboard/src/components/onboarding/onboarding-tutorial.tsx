"use client";

import { useState } from "react";

const TUTORIAL_STEPS = [
  {
    title: "Welcome to your AI workspace",
    description: "You're about to deploy AI agents that handle your WhatsApp, sales, content, HR, and finance — 24/7.",
    illustration: "rocket",
    color: "brand",
  },
  {
    title: "Connect WhatsApp in 2 minutes",
    description: "Powered by Kapso — no Meta approval wait. Your customers can text you on WhatsApp and get instant AI responses in Arabic and English.",
    illustration: "whatsapp",
    color: "green",
    features: ["Instant setup via Kapso", "AI voice calls", "Built-in team inbox", "2,000 free messages/month"],
  },
  {
    title: "We scan your website",
    description: "We crawl your website to build a knowledge base — FAQ, services, team, reviews, social profiles. Your agents learn everything about your business automatically.",
    illustration: "scan",
    color: "violet",
    features: ["Auto-extract FAQ & services", "Find social profiles", "Discover reviews", "Build brand voice"],
  },
  {
    title: "Choose your AI agents",
    description: "Pick from 5 battle-tested agents. Each one handles a different part of your business. Deploy one or all five as a unified system.",
    illustration: "agents",
    color: "amber",
    features: ["WhatsApp Intelligence", "AI Sales Rep", "Content Engine", "HR Screening", "Financial Intelligence"],
  },
  {
    title: "Choose a workflow template",
    description: "Pre-built workflows for your industry. Restaurant booking bots, real estate lead qualifiers, appointment reminders, and feedback surveys — ready to deploy.",
    illustration: "workflow",
    color: "sky",
    features: ["Restaurant Booking Bot", "Real Estate Lead Qualifier", "Appointment Reminders", "Customer Feedback Survey"],
  },
  {
    title: "Go live — you're done",
    description: "Your agents start working immediately. Monitor everything from your dashboard — messages, leads, bookings, and performance metrics in real-time.",
    illustration: "dashboard",
    color: "emerald",
  },
];

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  rocket: (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-brand-500/10 animate-pulse" />
      <path d="M60 25L45 55h30L60 25z" className="fill-brand-500" />
      <rect x="50" y="55" width="20" height="30" rx="4" className="fill-brand-600" />
      <circle cx="60" cy="67" r="5" className="fill-white/80" />
      <path d="M45 85l5 15M75 85l-5 15" className="stroke-brand-400" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 95l8 5 8-5" className="stroke-amber-400 animate-pulse" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-green-500/10" />
      <circle cx="60" cy="55" r="30" className="fill-green-500/20" />
      <path d="M60 30c-16.569 0-30 12.536-30 28 0 5.3 1.5 10.2 4 14.4L30 90l18.2-4.8c3.9 2.1 8.4 3.3 13.3 3.3 16.2-.3 29.5-13.2 29.5-29.5S76.6 30 60 30z" className="fill-green-500" />
      <path d="M75 68c-1-.5-5.8-2.9-6.7-3.2-.9-.3-1.6-.5-2.2.5s-2.5 3.2-3.1 3.8c-.6.6-1.1.7-2.1.2s-4.1-1.5-7.8-4.8c-2.9-2.6-4.8-5.8-5.4-6.7-.6-1 0-1.5.4-2 .4-.4 1-1.1 1.5-1.7.5-.6.6-1 1-1.6.3-.6.2-1.2-.1-1.7s-2.2-5.3-3-7.2c-.8-1.9-1.6-1.6-2.2-1.7h-1.9c-.7 0-1.7.3-2.6 1.2-.9 1-3.4 3.3-3.4 8.1s3.5 9.4 4 10c.5.6 6.9 10.5 16.6 14.7 2.3 1 4.1 1.6 5.5 2 2.3.7 4.4.6 6.1.4 1.9-.3 5.8-2.4 6.6-4.6.8-2.3.8-4.2.6-4.6-.3-.4-1-.6-2-1.1z" className="fill-white" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-violet-500/10" />
      <rect x="30" y="25" width="60" height="70" rx="6" className="fill-violet-500/20 stroke-violet-400" strokeWidth="1.5" />
      <line x1="40" y1="40" x2="80" y2="40" className="stroke-violet-400/50" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="50" x2="70" y2="50" className="stroke-violet-400/30" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="60" x2="75" y2="60" className="stroke-violet-400/30" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="70" x2="65" y2="70" className="stroke-violet-400/30" strokeWidth="2" strokeLinecap="round" />
      <rect x="25" y="45" width="70" height="4" rx="2" className="fill-violet-500 animate-[scan_2s_ease-in-out_infinite]" />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-amber-500/10" />
      <circle cx="60" cy="40" r="12" className="fill-amber-500/30 stroke-amber-400" strokeWidth="1.5" />
      <circle cx="35" cy="70" r="10" className="fill-emerald-500/30 stroke-emerald-400" strokeWidth="1.5" />
      <circle cx="85" cy="70" r="10" className="fill-sky-500/30 stroke-sky-400" strokeWidth="1.5" />
      <circle cx="45" cy="95" r="8" className="fill-rose-500/30 stroke-rose-400" strokeWidth="1.5" />
      <circle cx="75" cy="95" r="8" className="fill-violet-500/30 stroke-violet-400" strokeWidth="1.5" />
      <line x1="60" y1="52" x2="38" y2="62" className="stroke-white/20" strokeWidth="1" />
      <line x1="60" y1="52" x2="82" y2="62" className="stroke-white/20" strokeWidth="1" />
      <line x1="38" y1="78" x2="47" y2="88" className="stroke-white/20" strokeWidth="1" />
      <line x1="82" y1="78" x2="73" y2="88" className="stroke-white/20" strokeWidth="1" />
    </svg>
  ),
  workflow: (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-sky-500/10" />
      <rect x="20" y="30" width="30" height="20" rx="4" className="fill-sky-500/30 stroke-sky-400" strokeWidth="1.5" />
      <rect x="70" y="30" width="30" height="20" rx="4" className="fill-sky-500/30 stroke-sky-400" strokeWidth="1.5" />
      <rect x="45" y="65" width="30" height="20" rx="4" className="fill-sky-500/40 stroke-sky-400" strokeWidth="1.5" />
      <rect x="20" y="85" width="30" height="15" rx="4" className="fill-emerald-500/30 stroke-emerald-400" strokeWidth="1.5" />
      <rect x="70" y="85" width="30" height="15" rx="4" className="fill-emerald-500/30 stroke-emerald-400" strokeWidth="1.5" />
      <path d="M35 50l25 15M85 50l-25 15M60 85l-25 3M60 85l25 3" className="stroke-white/20" strokeWidth="1.5" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
      <circle cx="60" cy="60" r="50" className="fill-emerald-500/10" />
      <rect x="20" y="25" width="80" height="70" rx="6" className="fill-emerald-500/10 stroke-emerald-400/50" strokeWidth="1.5" />
      <rect x="20" y="25" width="80" height="12" rx="6" className="fill-emerald-500/20" />
      <circle cx="30" cy="31" r="2" className="fill-red-400" />
      <circle cx="37" cy="31" r="2" className="fill-amber-400" />
      <circle cx="44" cy="31" r="2" className="fill-emerald-400" />
      <rect x="28" y="44" width="25" height="18" rx="3" className="fill-emerald-500/20" />
      <rect x="58" y="44" width="35" height="8" rx="2" className="fill-brand-500/30" />
      <rect x="58" y="55" width="25" height="7" rx="2" className="fill-sky-500/20" />
      <rect x="28" y="68" width="65" height="4" rx="2" className="fill-emerald-500/15" />
      <rect x="28" y="76" width="45" height="4" rx="2" className="fill-emerald-500/10" />
      <rect x="28" y="84" width="55" height="4" rx="2" className="fill-emerald-500/10" />
    </svg>
  ),
};

interface Props {
  onComplete: () => void;
}

export function OnboardingTutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-brand-500" : i < step ? "w-1.5 bg-brand-300" : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center" key={step}>
          {/* Illustration */}
          <div className="flex justify-center mb-6 animate-[fadeIn_0.5s_ease-out]">
            {ILLUSTRATIONS[current.illustration]}
          </div>

          <h2 className="text-xl font-bold text-gray-900 animate-[fadeIn_0.5s_ease-out_0.1s_both]">
            {current.title}
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed animate-[fadeIn_0.5s_ease-out_0.2s_both]">
            {current.description}
          </p>

          {/* Features list */}
          {current.features && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 animate-[fadeIn_0.5s_ease-out_0.3s_both]">
              {current.features.map((f, i) => (
                <span
                  key={i}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          {step === 0 && (
            <button
              onClick={onComplete}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-50"
            >
              Skip tour
            </button>
          )}
          <button
            onClick={() => {
              if (step < TUTORIAL_STEPS.length - 1) {
                setStep((s) => s + 1);
              } else {
                onComplete();
              }
            }}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {step === TUTORIAL_STEPS.length - 1 ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
