import { createServerSupabase } from "@/lib/supabase-server";
import { CalendarIntegrations } from "@/components/calendar-integrations";

export default async function IntegrationsPage() {
  const supabase = await createServerSupabase();

  const { data: client } = await supabase
    .from("clients")
    .select("company_name")
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Calendar Integrations
            </h1>
            <p className="text-sm text-gray-500">
              {client?.company_name || "—"} — Connect your booking calendars and
              reservation systems
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <CalendarIntegrations />
      </main>
    </div>
  );
}
