import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "node:crypto";

// AES-256-GCM encryption (same as calendar-configs route)
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error(
      "CALENDAR_ENCRYPTION_KEY must be set (64 hex chars / 32 bytes)"
    );
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
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never)
          );
        },
      },
    }
  );
}

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth 2.0 callback from Google.
 * Exchanges the authorization code for tokens, encrypts the refresh token,
 * and stores it in the calendar_configs table.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // User denied access
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/integrations?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/integrations?error=missing_code",
          request.url
        )
      );
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const savedState = cookieStore.get("google_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/integrations?error=invalid_state",
          request.url
        )
      );
    }

    // Clear the state cookie
    cookieStore.delete("google_oauth_state");

    // Verify user is authenticated
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Exchange authorization code for tokens
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI!;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Google token exchange failed:", errBody);
      return NextResponse.redirect(
        new URL(
          "/dashboard/integrations?error=token_exchange_failed",
          request.url
        )
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      console.error(
        "No refresh_token received. User may have already granted access without prompt=consent."
      );
      return NextResponse.redirect(
        new URL(
          "/dashboard/integrations?error=no_refresh_token",
          request.url
        )
      );
    }

    // Fetch the user's Google email for the label
    let googleEmail = "Google Calendar";
    try {
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        googleEmail = userInfo.email || "Google Calendar";
      }
    } catch {
      // Non-critical — fall back to generic label
    }

    // Encrypt credentials
    const credentials = {
      provider: "google" as const,
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
      calendarId: "primary",
    };
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));

    // Check if there's already a primary calendar
    const { data: existing } = await supabase
      .from("calendar_configs")
      .select("id")
      .eq("is_primary", true)
      .limit(1);

    const isPrimary = !existing || existing.length === 0;

    // Save to database
    const { error: insertError } = await supabase
      .from("calendar_configs")
      .insert({
        provider: "google",
        label: googleEmail,
        credentials_encrypted: credentialsEncrypted,
        is_primary: isPrimary,
      });

    if (insertError) {
      console.error("Failed to save calendar config:", insertError);
      return NextResponse.redirect(
        new URL(
          "/dashboard/integrations?error=save_failed",
          request.url
        )
      );
    }

    // Success — redirect to integrations page
    return NextResponse.redirect(
      new URL(
        "/dashboard/integrations?google=connected",
        request.url
      )
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        "/dashboard/integrations?error=unexpected",
        new URL(request.url).origin
      )
    );
  }
}
