import { createServerSupabase } from "@/lib/supabase-server";
import { WhatsAppInbox } from "@/components/whatsapp-inbox";

export default async function WhatsAppPage() {
  const supabase = await createServerSupabase();

  const { data: client } = await supabase
    .from("clients")
    .select("company_name")
    .single();

  // Check if Kapso is configured
  const { data: knowledge } = await supabase
    .from("business_knowledge")
    .select("crawl_data")
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">WhatsApp</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            WhatsApp Inbox
          </h1>
          <p className="text-sm text-gray-500">
            Powered by Kapso — view conversations, send messages, manage your WhatsApp agent
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <WhatsAppInbox companyName={client?.company_name || "Your Business"} />
      </main>
    </div>
  );
}
