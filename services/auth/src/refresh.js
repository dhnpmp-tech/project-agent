import crypto from "node:crypto";
import { sql } from "./db.js";

const REFRESH_TTL_DAYS = 30;

const hash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function issueRefreshToken({ userId, userAgent, ipAddress }) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hash(raw);
  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await sql`
    INSERT INTO auth_refresh_tokens (token_hash, user_id, expires_at, user_agent, ip_address)
    VALUES (${tokenHash}, ${userId}, ${expiresAt}, ${userAgent || null}, ${ipAddress || null})
  `;

  return { raw, expiresAt };
}

export async function consumeRefreshToken(rawToken) {
  const tokenHash = hash(rawToken);

  const rows = await sql`
    SELECT t.user_id, u.id, u.email, u.client_id, u.role
    FROM auth_refresh_tokens t
    JOIN auth_users u ON u.id = t.user_id
    WHERE t.token_hash = ${tokenHash}
      AND t.expires_at > NOW()
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { ok: false };
  }

  // Rotate: delete old, caller will issue new
  await sql`
    DELETE FROM auth_refresh_tokens
    WHERE token_hash = ${tokenHash}
  `;

  return { ok: true, user: rows[0] };
}

export async function revokeAllRefreshTokens(userId) {
  await sql`
    DELETE FROM auth_refresh_tokens WHERE user_id = ${userId}
  `;
}

export { REFRESH_TTL_DAYS };
