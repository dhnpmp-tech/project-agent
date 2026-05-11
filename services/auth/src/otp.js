import crypto from "node:crypto";
import { Resend } from "resend";
import { sql } from "./db.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const OTP_FROM = process.env.OTP_FROM || "Project Agent <noreply@dcp.sa>";
const OTP_TTL_MINUTES = 10;
const OTP_MAX_PER_HOUR = 5;

const generateCode = () => {
  // 6-digit code, zero-padded
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
};

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

export async function sendOtp({ email, ipAddress }) {
  const normEmail = email.trim().toLowerCase();

  // Rate-limit per email + IP
  const [{ count: emailCount }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM auth_otp_codes
    WHERE email = ${normEmail}
      AND created_at > NOW() - INTERVAL '1 hour'
  `;
  if (emailCount >= OTP_MAX_PER_HOUR) {
    return { ok: false, error: "rate_limited", retryAfterSeconds: 600 };
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO auth_otp_codes (email, code_hash, expires_at, ip_address)
    VALUES (${normEmail}, ${codeHash}, ${expiresAt}, ${ipAddress || null})
    ON CONFLICT (email, code_hash) DO UPDATE
      SET expires_at = EXCLUDED.expires_at, attempts = 0
  `;

  const { data, error } = await resend.emails.send({
    from: OTP_FROM,
    to: normEmail,
    subject: `Your Project Agent login code: ${code}`,
    html: renderEmail(code),
    text: `Your Project Agent login code is: ${code}\n\nIt expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
  });

  if (error) {
    console.error("[otp] resend send failed:", error);
    // Roll back the DB row so the rate-limit count doesn't penalize the user
    await sql`DELETE FROM auth_otp_codes WHERE email = ${normEmail} AND code_hash = ${codeHash}`;
    return { ok: false, error: "email_send_failed", detail: error.message || error.name };
  }

  console.log(`[otp] sent to ${normEmail} (resend id=${data?.id})`);
  return { ok: true };
}

export async function verifyOtp({ email, code }) {
  const normEmail = email.trim().toLowerCase();
  const codeHash = hashCode(code.trim());

  const rows = await sql`
    SELECT * FROM auth_otp_codes
    WHERE email = ${normEmail}
      AND code_hash = ${codeHash}
      AND expires_at > NOW()
      AND attempts < 5
    LIMIT 1
  `;

  if (rows.length === 0) {
    // Increment attempts on any matching email rows so brute force is bounded
    await sql`
      UPDATE auth_otp_codes
      SET attempts = attempts + 1
      WHERE email = ${normEmail}
        AND expires_at > NOW()
    `;
    return { ok: false, error: "invalid_or_expired" };
  }

  // Consume the code (single-use)
  await sql`
    DELETE FROM auth_otp_codes
    WHERE email = ${normEmail} AND code_hash = ${codeHash}
  `;

  // Upsert the auth_user (auto-create on first verified login)
  const [user] = await sql`
    INSERT INTO auth_users (email, email_verified, last_login_at)
    VALUES (${normEmail}, TRUE, NOW())
    ON CONFLICT (email) DO UPDATE
      SET email_verified = TRUE,
          last_login_at = NOW(),
          updated_at = NOW()
    RETURNING id, email, client_id, role
  `;

  return { ok: true, user };
}

function renderEmail(code) {
  return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Your Project Agent login code</h1>
  <p style="font-size: 15px; line-height: 1.5;">Use this code to sign in. It expires in ${OTP_TTL_MINUTES} minutes.</p>
  <div style="font-size: 36px; font-weight: 600; letter-spacing: 6px; text-align: center; padding: 24px; background: #f4f4f5; border-radius: 8px; margin: 24px 0;">${code}</div>
  <p style="font-size: 13px; color: #71717a; line-height: 1.5;">If you didn't request this code, ignore this email. No one can use it without your inbox.</p>
</body></html>`;
}
