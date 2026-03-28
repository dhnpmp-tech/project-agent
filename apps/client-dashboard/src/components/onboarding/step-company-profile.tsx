"use client";

export interface CompanyProfileData {
  companyName: string;
  companyNameAr: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  country: "AE" | "SA";
  plan: "starter" | "professional" | "enterprise" | "solopreneur";
  businessDescription: string;
}

interface Props {
  data: CompanyProfileData;
  onChange: (data: CompanyProfileData) => void;
  onNext: () => void;
}

const PLANS = [
  { value: "solopreneur", label: "Solopreneur", desc: "1 agent, basic support" },
  { value: "starter", label: "Starter", desc: "Up to 2 agents" },
  { value: "professional", label: "Professional", desc: "Up to 4 agents, priority support" },
  { value: "enterprise", label: "Enterprise", desc: "All 5 agents, dedicated support" },
] as const;

export function StepCompanyProfile({ data, onChange, onNext }: Props) {
  function update(field: keyof CompanyProfileData, value: string) {
    onChange({ ...data, [field]: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={data.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className={inputClass}
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company name (Arabic)
          </label>
          <input
            type="text"
            dir="rtl"
            value={data.companyNameAr}
            onChange={(e) => update("companyNameAr", e.target.value)}
            className={inputClass}
            placeholder="شركة أكمي"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={data.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            className={inputClass}
            placeholder="Ahmed Al-Mansoori"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="email"
            value={data.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            className={inputClass}
            placeholder="ahmed@company.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={data.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
            className={inputClass}
            placeholder="+971 50 123 4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={data.country}
            onChange={(e) => update("country", e.target.value)}
            className={inputClass}
          >
            <option value="AE">UAE</option>
            <option value="SA">Saudi Arabia</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business description
        </label>
        <textarea
          rows={3}
          value={data.businessDescription}
          onChange={(e) => update("businessDescription", e.target.value)}
          className={inputClass}
          placeholder="Briefly describe what your company does..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Plan <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map((plan) => (
            <label
              key={plan.value}
              className={`relative flex cursor-pointer rounded-lg border p-3 ${
                data.plan === plan.value
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={plan.value}
                checked={data.plan === plan.value}
                onChange={(e) => update("plan", e.target.value)}
                className="sr-only"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{plan.label}</p>
                <p className="text-xs text-gray-500">{plan.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
