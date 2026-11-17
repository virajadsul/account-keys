// Server-only. Customer accounts: sign up / log in with email + password.
// Cookies: ak_user_access (all pages), ak_user_refresh (only /api/auth/*).
// USER_TOKEN_SECRET (env) signs access tokens.
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { createSessionAuth, requestMeta, BCRYPT_ROUNDS } from "./sessionAuth";
import { DEFAULT_PLAN } from "./plans";

const auth = createSessionAuth({
  realm: "user",
  accounts: "users",
  sessions: "user_sessions",
  ownerField: "userId",
  accessCookie: "ak_user_access",
  refreshCookie: "ak_user_refresh",
  refreshPath: "/api/auth",
  secretEnv: "USER_TOKEN_SECRET",
});

export const USER_REFRESH_COOKIE = auth.refreshCookie;
export { requestMeta };
export const { login, refresh, logout, sessionCookies, clearedCookies, endAllSessions } = auth;
export const getUserSession = auth.getSession;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** Field errors for the sign-up form, keyed by field name. Empty object = valid. */
export function validateSignup({ name, email, phone, password, confirmPassword }) {
  const errors = {};
  if (name.length < 2 || name.length > 80) errors.name = "Enter your full name.";
  if (!EMAIL.test(email) || email.length > 120) errors.email = "Enter a valid email address.";
  if (!PHONE.test(phone) || phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
  return { ...errors, ...validatePassword(password, confirmPassword) };
}

/** Password rules shared by sign-up and password reset. */
export function validatePassword(password, confirmPassword) {
  const errors = {};
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  // bcrypt only uses the first 72 bytes; longer passwords would be silently truncated.
  else if (Buffer.byteLength(password) > 72) errors.password = "Use at most 72 characters.";
  if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
  return errors;
}

/** Creates the account and signs it in. Returns { account, tokens } or { errors }. */
export async function signup(input, meta) {
  const data = {
    name: String(input?.name || "").trim(),
    email: String(input?.email || "").trim().toLowerCase(),
    phone: String(input?.phone || "").trim(),
    password: String(input?.password || ""),
    confirmPassword: String(input?.confirmPassword || ""),
  };
  const errors = validateSignup(data);
  if (Object.keys(errors).length) return { errors };

  const { accounts } = await auth.collections();
  const account = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    plan: DEFAULT_PLAN,
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };
  try {
    const { insertedId } = await accounts.insertOne(account);
    account._id = insertedId;
  } catch (err) {
    if (err?.code === 11000) return { errors: { email: "An account with this email already exists. Log in instead." } };
    throw err;
  }
  return { account, tokens: await auth.startSession(account, meta) };
}

/**
 * The signed-in user's account, read fresh from the database (so a deactivation
 * applies immediately, not when the 15-minute access token runs out).
 * Returns { session: null } when not signed in.
 */
export async function currentUser() {
  const session = await getUserSession();
  if (!session) return { session: null, user: null };
  const { accounts } = await auth.collections();
  const user = ObjectId.isValid(session.sub) ? await accounts.findOne({ _id: new ObjectId(session.sub) }, { projection: { passwordHash: 0 } }) : null;
  return { session, user };
}
