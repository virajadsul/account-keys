// Server-only. Email + bcrypt-password accounts with two httpOnly cookies:
//   access   short-lived (15 min) signed token, sent with every request
//   refresh  long-lived (7 days) random token, sent only to the realm's /api path;
//            stored as a SHA-256 hash and replaced on every refresh (rotation),
//            so a stolen copy stops working.
// One instance per realm (admins, users). Each realm has its own collections,
// cookies and signing secret, and a token from one realm is never accepted by another.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const BCRYPT_ROUNDS = 12;
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 3600;

// Compared against when the email doesn't exist, so a wrong email takes as
// long as a wrong password and response time reveals nothing.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-real-password", BCRYPT_ROUNDS);

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const secure = process.env.NODE_ENV === "production";

function cookie(name, value, { path, maxAge }) {
  return [`${name}=${value}`, `Path=${path}`, `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Strict", secure && "Secure"]
    .filter(Boolean)
    .join("; ");
}

export function requestMeta(request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null,
    userAgent: request.headers.get("user-agent"),
  };
}

/**
 * @param {object} o
 * @param {string} o.realm             "admin" | "user" — written into every access token
 * @param {string} o.accounts          accounts collection
 * @param {string} o.sessions          refresh-session collection
 * @param {string} o.ownerField        field in a session that points to the account
 * @param {string} o.accessCookie
 * @param {string} o.refreshCookie
 * @param {string} o.refreshPath       the only path the refresh cookie is sent to
 * @param {string} o.secretEnv         env var with the access-token signing secret
 */
export function createSessionAuth({ realm, accounts, sessions, ownerField, accessCookie, refreshCookie, refreshPath, secretEnv }) {
  function tokenSecret() {
    const secret = process.env[secretEnv];
    if (!secret || secret.length < 32) throw new Error(`${secretEnv} must be set (32+ characters).`);
    return secret;
  }
  const sign = (data) => createHmac("sha256", tokenSecret()).update(`${realm}.${data}`).digest("base64url");

  let indexesReady;
  async function collections() {
    const db = await getDb();
    const acc = db.collection(accounts);
    const ses = db.collection(sessions);
    indexesReady ||= Promise.all([
      acc.createIndex({ email: 1 }, { unique: true }),
      ses.createIndex({ tokenHash: 1 }, { unique: true }),
      ses.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // Mongo deletes expired sessions
      ses.createIndex({ [ownerField]: 1 }),
    ]).catch((err) => {
      indexesReady = null;
      throw err;
    });
    await indexesReady;
    return { accounts: acc, sessions: ses };
  }

  function createAccessToken(account, sessionId) {
    const payload = Buffer.from(
      JSON.stringify({
        realm,
        sub: String(account._id),
        email: account.email,
        name: account.name,
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
      return data.realm === realm && data.exp > Date.now() ? data : null;
    } catch {
      return null;
    }
  }

  async function startSession(account, { ip, userAgent } = {}) {
    const { sessions: ses } = await collections();
    const refreshToken = randomBytes(32).toString("base64url");
    const { insertedId } = await ses.insertOne({
      [ownerField]: account._id,
      tokenHash: sha256(refreshToken),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      ip: ip || null,
      userAgent: userAgent ? String(userAgent).slice(0, 200) : null,
    });
    return { accessToken: createAccessToken(account, insertedId), refreshToken };
  }

  const canSignIn = (account) => account && account.passwordHash && account.isActive !== false;

  return {
    collections,
    startSession,

    sessionCookies({ accessToken, refreshToken }) {
      return [
        cookie(accessCookie, accessToken, { path: "/", maxAge: ACCESS_TTL_SECONDS }),
        cookie(refreshCookie, refreshToken, { path: refreshPath, maxAge: REFRESH_TTL_SECONDS }),
      ];
    },

    clearedCookies() {
      return [cookie(accessCookie, "", { path: "/", maxAge: 0 }), cookie(refreshCookie, "", { path: refreshPath, maxAge: 0 })];
    },

    /** Tokens, null for wrong credentials, or { deactivated: true }. */
    async login(email, password, meta) {
      const { accounts: acc } = await collections();
      const account = await acc.findOne({ email: String(email || "").trim().toLowerCase() });
      const ok = await bcrypt.compare(String(password || ""), account?.passwordHash || DUMMY_HASH);
      if (!ok || !account?.passwordHash) return null;
      // Only told after the right password, so it reveals nothing to someone guessing.
      if (account.isActive === false) return { deactivated: true };
      await acc.updateOne({ _id: account._id }, { $set: { lastLoginAt: new Date() } });
      return startSession(account, meta);
    },

    // Exchanges a refresh token for a new access + refresh pair (rotation).
    async refresh(refreshToken, meta) {
      if (!refreshToken) return null;
      const { accounts: acc, sessions: ses } = await collections();
      const session = await ses.findOneAndDelete({ tokenHash: sha256(refreshToken) });
      if (!session || session.expiresAt < new Date()) return null;
      const account = await acc.findOne({ _id: session[ownerField] });
      return canSignIn(account) ? startSession(account, meta) : null;
    },

    async logout(refreshToken) {
      if (!refreshToken) return;
      const { sessions: ses } = await collections();
      await ses.deleteOne({ tokenHash: sha256(refreshToken) });
    },

    /** Signs an account out everywhere (password change, deactivation). */
    async endAllSessions(accountId) {
      const { sessions: ses } = await collections();
      await ses.deleteMany({ [ownerField]: accountId });
    },

    /** For server components and actions: the signed-in account from the access cookie, or null. */
    async getSession() {
      const store = await cookies();
      const token = store.get(accessCookie)?.value;
      if (!token) return null;
      try {
        return verifyAccessToken(token);
      } catch {
        return null;
      }
    },

    refreshCookie,
  };
}
