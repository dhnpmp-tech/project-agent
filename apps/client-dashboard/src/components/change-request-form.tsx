"use client";

import { useState } from "react";

export function ChangeRequestForm() {
  const [category, setCategory] = useState("config_change");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/webhooks/n8n", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "change_request",
        category,
        description,
        priority,
        timestamp: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      setSubmitted(true);
      setDescription("");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <p className="text-green-800 font-medium">
          Request submitted successfully!
        </p>
        <p className="text-green-600 text-sm mt-1">
          Our team will review it within 24 hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-green-700 underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="config_change">Configuration Change</option>
          <option value="bug_report">Bug Report</option>
          <option value="feature_request">Feature Request</option>
          <option value="knowledge_base_update">Knowledge Base Update</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Describe what you need changed or fixed..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="low">Low — no rush</option>
          <option value="medium">Medium — within a few days</option>
          <option value="high">High — urgent</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Submit Request
      </button>
    </form>
  );
}
