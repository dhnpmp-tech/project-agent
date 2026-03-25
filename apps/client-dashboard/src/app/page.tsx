import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function Home() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    // Check if user has a client record
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (!client) {
      redirect("/onboarding");
    }

    redirect("/dashboard");
  } catch {
    redirect("/dashboard");
  }
}
