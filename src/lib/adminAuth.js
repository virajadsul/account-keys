// Server-only. Admin accounts live in MongoDB (`admins`, bcrypt passwords).
// Sessions use two httpOnly cookies:
//   ak_access   short-lived (15 min) signed token, sent with every request
//   ak_refresh  long-lived (7 days) random token, sent only to /api/admin/*;
//               stored in `admin_sessions` as a SHA-256 hash and replaced on
//               every refresh (rotation), so a stolen copy stops working.
// ADMIN_TOKEN_SECRET (env) signs access tokens. It is a server secret, not a credential.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const ACCESS_COOKIE = "ak_access";
export const REFRESH_COOKIE = "ak_refresh";
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 3600;
export const BCRYPT_ROUNDS = 12;

// Compared against when the email doesn't exist, so a wrong email takes as
// long as a wrong password and response time reveals nothing.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-real-password", BCRYPT_ROUNDS);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function tokenSecret() {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_TOKEN_SECRET must be set (32+ characters).");
  return secret;
}
const sign = (data) => createHmac("sha256", tokenSecret()).update(data).digest("base64url");

let indexesReady;
async function collections() {
  const db = await getDb();
  const admins = db.collection("admins");
  const sessions = db.collection("admin_sessions");
  indexesReady ||= Promise.all([
    admins.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // Mongo deletes expired sessions
    sessions.createIndex({ adminId: 1 }),
  ]).catch((err) => {
    indexesReady = null;
    throw err;
  });
  await indexesReady;
  return { admins, sessions };
}

// ---------- cookies ----------

const secure = process.env.NODE_ENV === "production";

function cookie(name, value, { path, maxAge }) {
  return [`${name}=${value}`, `Path=${path}`, `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Strict", secure && "Secure"]
    .filter(Boolean)
    .join("; ");
}

export function sessionCookies({ accessToken, refreshToken }) {
  return [
    cookie(ACCESS_COOKIE, accessToken, { path: "/", maxAge: ACCESS_TTL_SECONDS }),
    cookie(REFRESH_COOKIE, refreshToken, { path: "/api/admin", maxAge: REFRESH_TTL_SECONDS }),
  ];
}

export function clearedCookies() {
  return [cookie(ACCESS_COOKIE, "", { path: "/", maxAge: 0 }), cookie(REFRESH_COOKIE, "", { path: "/api/admin", maxAge: 0 })];
}

// ---------- tokens ----------

function createAccessToken(admin, sessionId) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(admin._id),
      email: admin.email,
      name: admin.name,
      sid: String(sessionId),
      exp: Date.now() + ACCESS_TTL_SECONDS * 1000,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyAccessToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

async function startSession(admin, { ip, userAgent }) {
  const { sessions } = await collections();
  const refreshToken = randomBytes(32).toString("base64url");
  const { insertedId } = await sessions.insertOne({
    adminId: admin._id,
    tokenHash: sha256(refreshToken),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    ip: ip || null,
    userAgent: userAgent ? String(userAgent).slice(0, 200) : null,
  });
  return { accessToken: createAccessToken(admin, insertedId), refreshToken };
}

// ---------- public API ----------

export async function login(email, password, meta) {
  const { admins } = await collections();
  const admin = await admins.findOne({ email: String(email || "").trim().toLowerCase() });
  const hash = admin?.passwordHash || DUMMY_HASH;
  const ok = await bcrypt.compare(String(password || ""), hash);
  if (!ok || !admin?.passwordHash || admin.isActive === false) return null;

  await admins.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  return startSession(admin, meta);
}

// Exchanges a refresh token for a new access + refresh pair (rotation).
export async function refresh(refreshToken, meta) {
  if (!refreshToken) return null;
  const { admins, sessions } = await collections();
  const session = await sessions.findOneAndDelete({ tokenHash: sha256(refreshToken) });
  if (!session || session.expiresAt < new Date()) return null;
  const admin = await admins.findOne({ _id: session.adminId });
  if (!admin || admin.isActive === false || !admin.passwordHash) return null;
  return startSession(admin, meta);
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  const { sessions } = await collections();
  await sessions.deleteOne({ tokenHash: sha256(refreshToken) });
}

// For server components: the signed-in admin from the access cookie, or null.
export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export function requestMeta(request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null,
    userAgent: request.headers.get("user-agent"),
  };
}

