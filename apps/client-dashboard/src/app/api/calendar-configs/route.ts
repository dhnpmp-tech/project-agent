import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "node:crypto";

// AES-256-GCM encryption for credentials at rest
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error("CALENDAR_ENCRYPTION_KEY must be set (64 hex chars / 32 bytes)");
  }
  return Buffer.from(key, "hex");
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all base64)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
}

function decrypt(blob: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, ciphertext] = blob.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// --- GET: list calendar configs for current client ---
export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("calendar_configs")
      .select("id, provider, label, is_primary, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add a status field (we don't store it — it's derived)
    const configs = (data ?? []).map((c) => ({
      ...c,
      status: "connected" as const,
    }));

    return NextResponse.json({ configs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- POST: save a new calendar config ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, label, credentials, is_primary } = body;

    if (!provider || !credentials) {
      return NextResponse.json(
        { error: "provider and credentials are required" },
        { status: 400 }
      );
    }

    // Encrypt credentials before storing
    const credentialsEncrypted = encrypt(
      JSON.stringify({ provider, ...credentials })
    );

    const supabase = await getSupabase();

    // If setting as primary, unset any existing primary first
    if (is_primary) {
      await supabase
        .from("calendar_configs")
        .update({ is_primary: false })
        .eq("is_primary", true);
    }

    const { data, error } = await supabase
      .from("calendar_configs")
      .insert({
        provider,
        label: label || provider,
        credentials_encrypted: credentialsEncrypted,
        is_primary: is_primary ?? false,
      })
      .select("id, provider, label, is_primary, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
