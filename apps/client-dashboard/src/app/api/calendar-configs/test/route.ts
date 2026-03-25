import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never)
          );
        },
      },
    }
  );
}

// --- POST: test a calendar connection without saving ---
export async function POST(request: NextRequest) {
  try {
    const { provider, credentials } = await request.json();

    if (!provider || !credentials) {
      return NextResponse.json(
        { ok: false, error: "provider and credentials are required" },
        { status: 400 }
      );
    }

    // Dynamically import the adapter to avoid bundling all providers in the client
    const { createCalendarAdapter } = await import(
      "@project-agent/calendar-adapter"
    );

    const adapter = createCalendarAdapter({ provider, ...credentials });
    const result = await adapter.testConnection();

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
