"use client";

import type { AgentType } from "@project-agent/shared-types";

interface Props {
  selected: AgentType[];
  onChange: (agents: AgentType[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const AGENTS: { type: AgentType; name: string; desc: string; icon: string }[] = [
  {
    type: "wia",
    name: "WhatsApp Intelligence Agent",
    desc: "Customer service via WhatsApp — FAQ answers, complaint handling, appointment booking, human escalation.",
    icon: "💬",
  },
  {
    type: "ai_sdr",
    name: "AI Sales Development Rep",
    desc: "Qualify leads, score against your ICP, personalize outreach emails, and book meetings automatically.",
    icon: "📈",
  },
  {
    type: "cea",
    name: "Content Engine Agent",
    desc: "Generate platform-optimized social media content for LinkedIn, Instagram, and TikTok.",
    icon: "✍️",
  },
  {
    type: "hrsa",
    name: "HR Screening Agent",
    desc: "Parse CVs, score candidates against job criteria, auto-respond with offers or rejections.",
    icon: "👥",
  },
  {
    type: "fia",
    name: "Financial Intelligence Agent",
    desc: "Categorize transactions, calculate KPIs, detect anomalies, and generate P&L reports.",
    icon: "📊",
  },
];

export function StepSelectAgents({ selected, onChange, onNext, onBack }: Props) {
  function toggle(type: AgentType) {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) return;
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        Select the AI agents you want to deploy. You can add more later.
      </p>

      <div className="space-y-3">
        {AGENTS.map((agent) => {
          const isSelected = selected.includes(agent.type);
          return (
            <label
              key={agent.type}
              className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition-colors ${
                isSelected
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(agent.type)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  <span className="mr-1.5">{agent.icon}</span>
                  {agent.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{agent.desc}</p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={selected.length === 0}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue ({selected.length} selected)
        </button>
      </div>
    </form>
  );
}
