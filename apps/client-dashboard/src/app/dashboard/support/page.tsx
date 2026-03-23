import { ChangeRequestForm } from "@/components/change-request-form";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </a>
          <h1 className="text-xl font-bold text-gray-900">Request a Change</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-6">
            Need something changed, fixed, or added? Submit a request below and
            our team will respond within 24 hours.
          </p>
          <ChangeRequestForm />
        </div>
      </main>
    </div>
  );
}
