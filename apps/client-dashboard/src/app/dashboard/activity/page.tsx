import { createServerSupabase } from "@/lib/supabase-server";
import { ActivityFeed } from "@/components/activity-feed";
import type { ActivityLog } from "@project-agent/shared-types";

export default async function ActivityPage() {
  const supabase = await createServerSupabase();

  const { data: activities } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600">
            &larr; Back
          </a>
          <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <ActivityFeed activities={(activities as ActivityLog[]) || []} />
      </main>
    </div>
  );
}
