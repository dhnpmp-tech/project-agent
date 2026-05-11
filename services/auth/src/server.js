import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { z } from "zod";
import { sql } from "./db.js";
import { issueAccessToken, verifyAccessToken } from "./jwt.js";
import { sendOtp, verifyOtp } from "./otp.js";
import {
  issueRefreshToken,
  consumeRefreshToken,
  revokeAllRefreshTokens,
  REFRESH_TTL_DAYS,
} from "./refresh.js";

const PORT = Number(process.env.PORT ?? 8201);
const ALLOWED_ORIGINS = (process.env.AUTH_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin (curl, healthchecks) + listed origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);

const clientIp = (req) =>
  (req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "")
    .toString()
    .trim() || null;

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/auth",
  maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

// ---- Health -------------------------------------------------------------

app.get("/health", async (_req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: "ok", service: "auth", db: "ok" });
  } catch (e) {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

// ---- OTP send -----------------------------------------------------------

const sendSchema = z.object({
  email: z.string().email().max(254),
});

app.post("/auth/otp/send", async (req, res) => {
  const parse = sendSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "invalid_email" });
  }

  const result = await sendOtp({
    email: parse.data.email,
    ipAddress: clientIp(req),
  });

  if (!result.ok) {
    const status = result.error === "rate_limited" ? 429 : 502;
    return res.status(status).json({
      error: result.error,
      retry_after_seconds: result.retryAfterSeconds,
      detail: result.detail,
    });
  }

  res.json({ ok: true, message: "Code sent. Check your inbox." });
});

// ---- OTP verify ---------------------------------------------------------

const verifySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

app.post("/auth/otp/verify", async (req, res) => {
  const parse = verifySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "invalid_input" });
  }

  const result = await verifyOtp(parse.data);
  if (!result.ok) {
    return res.status(401).json({ error: result.error });
  }

  const accessToken = await issueAccessToken({
    userId: result.user.id,
    email: result.user.email,
    clientId: result.user.client_id,
    role: result.user.role,
  });

  const refresh = await issueRefreshToken({
    userId: result.user.id,
    userAgent: req.headers["user-agent"],
    ipAddress: clientIp(req),
  });

  res.cookie("auth_refresh", refresh.raw, refreshCookieOptions);
  res.json({
    ok: true,
    access_token: accessToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      client_id: result.user.client_id,
      role: result.user.role,
    },
  });
});

// ---- Refresh ------------------------------------------------------------

app.post("/auth/refresh", async (req, res) => {
  const raw = req.cookies?.auth_refresh;
  if (!raw) return res.status(401).json({ error: "no_refresh_token" });

  const result = await consumeRefreshToken(raw);
  if (!result.ok) {
    res.clearCookie("auth_refresh", refreshCookieOptions);
    return res.status(401).json({ error: "invalid_refresh_token" });
  }

  const accessToken = await issueAccessToken({
    userId: result.user.id,
    email: result.user.email,
    clientId: result.user.client_id,
    role: result.user.role,
  });

  const newRefresh = await issueRefreshToken({
    userId: result.user.id,
    userAgent: req.headers["user-agent"],
    ipAddress: clientIp(req),
  });

  res.cookie("auth_refresh", newRefresh.raw, refreshCookieOptions);
  res.json({
    ok: true,
    access_token: accessToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      client_id: result.user.client_id,
      role: result.user.role,
    },
  });
});

// ---- Sign out -----------------------------------------------------------

app.post("/auth/signout", async (req, res) => {
  const raw = req.cookies?.auth_refresh;
  if (raw) {
    const result = await consumeRefreshToken(raw); // single-use, also rotates
    if (result.ok) {
      await revokeAllRefreshTokens(result.user.id);
    }
  }
  res.clearCookie("auth_refresh", refreshCookieOptions);
  res.json({ ok: true });
});

// ---- Me -----------------------------------------------------------------

app.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "no_token" });

  try {
    const payload = await verifyAccessToken(token);
    res.json({
      id: payload.sub,
      email: payload.email,
      client_id: payload.user_metadata?.client_id,
      role: payload.user_metadata?.role,
    });
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
});

// ---- Error handler ------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error("[auth] error:", err.message);
  res.status(500).json({ error: "internal_error" });
});

// ---- Boot ---------------------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[auth] listening on :${PORT}`);
  console.log(`[auth] allowed origins: ${ALLOWED_ORIGINS.join(", ") || "(none)"}`);
});

// Graceful shutdown
const shutdown = async (sig) => {
  console.log(`[auth] ${sig} received, shutting down`);
  try {
    await sql.end({ timeout: 5 });
  } catch {}
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
