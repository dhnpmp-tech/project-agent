import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(s);
})();

const ISSUER = "auth.agents.dcp.sa";
const AUDIENCE = "agents.dcp.sa";

// 1 hour access tokens; refresh tokens (30d) live in the DB, not in the JWT
const ACCESS_TTL_SECONDS = 60 * 60;

export async function issueAccessToken({ userId, email, clientId, role }) {
  return await new SignJWT({
    email,
    user_metadata: {
      client_id: clientId,
      role,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload;
}

export { ACCESS_TTL_SECONDS };
