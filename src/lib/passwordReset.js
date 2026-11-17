// Server-only. Forgot password: email → 6-digit OTP → "set new password".
//   1. requestReset(email): emails an OTP (10 min). Same answer whether or not the
//      email exists, so the form can't be used to find out who has an account.
//   2. verifyOtp(email, otp): 5 tries; on success returns a one-time reset token
//      (15 min) that the route puts in an httpOnly cookie, never in the URL.
//   3. resetPassword(token, ...): sets the new password and signs the account out everywhere.
// Only hashes of the OTP and the token are stored.
import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { BCRYPT_ROUNDS } from "./sessionAuth";
import { endAllSessions, validatePassword } from "./userAuth";
import { sendPasswordResetOtp } from "./mailer";

const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60 * 1000;
export const RESET_TOKEN_TTL_SECONDS = TOKEN_TTL_MS / 1000;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
// The user id is mixed in so the same 6 digits hash differently for every account.
const otpHash = (userId, otp) => sha256(`${userId}:${otp}`);

let indexesReady;
async function collections() {
  const db = await getDb();
  const resets = db.collection("password_resets");
  indexesReady ||= Promise.all([
    resets.createIndex({ userId: 1 }),
    resets.createIndex({ tokenHash: 1 }, { unique: true, partialFilterExpression: { tokenHash: { $type: "string" } } }),
    resets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // Mongo deletes expired requests
  ]).catch((err) => {
    indexesReady = null;
    throw err;
  });
  await indexesReady;
  return { resets, users: db.collection("users") };
}

const normalEmail = (email) => String(email || "").trim().toLowerCase();

/** Sends an OTP if the email belongs to an active account. Returns nothing either way. */
export async function requestReset(email) {
  const { resets, users } = await collections();
  const user = await users.findOne({ email: normalEmail(email) });
  if (!user || user.isActive === false) return;

  // One code a minute per account, so the form can't be used to flood an inbox.
  const recent = await resets.findOne({ userId: user._id, createdAt: { $gt: new Date(Date.now() - RESEND_AFTER_MS) } });
  if (recent) return;

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await resets.deleteMany({ userId: user._id }); // a new code replaces any earlier one
  await resets.insertOne({
    userId: user._id,
    otpHash: otpHash(user._id, otp),
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  sendPasswordResetOtp(user, otp);
}

/** Returns { token } for the right code, else { error }. */
export async function verifyOtp(email, otp) {
  const code = String(otp || "").trim();
  const invalid = { error: "That code is wrong or has expired. Check the email, or ask for a new code." };
  if (!/^\d{6}$/.test(code)) return invalid;

  const { resets, users } = await collections();
  const user = await users.findOne({ email: normalEmail(email) });
  if (!user) return invalid;
  const reset = await resets.findOne({ userId: user._id, otpHash: { $ne: null }, expiresAt: { $gt: new Date() } });
  if (!reset) return invalid;

  if (reset.otpHash !== otpHash(user._id, code)) {
    const attempts = reset.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await resets.deleteOne({ _id: reset._id });
      return { error: "Too many wrong codes. Ask for a new code." };
    }
    await resets.updateOne({ _id: reset._id }, { $set: { attempts } });
    return invalid;
  }

  // The code is used up; from here only the reset token works.
  const token = randomBytes(32).toString("base64url");
  await resets.updateOne(
    { _id: reset._id },
    { $set: { otpHash: null, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } }
  );
  return { token };
}

/** Returns { ok: true } or { errors } / { error }. */
export async function resetPassword(token, password, confirmPassword) {
  const errors = validatePassword(String(password || ""), String(confirmPassword || ""));
  if (Object.keys(errors).length) return { errors };
  if (!token) return { error: "This reset has expired. Start again from “Forgot password”." };

  const { resets, users } = await collections();
  const reset = await resets.findOneAndDelete({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
  if (!reset) return { error: "This reset has expired. Start again from “Forgot password”." };

  const passwordHash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
  await users.updateOne({ _id: reset.userId }, { $set: { passwordHash, passwordChangedAt: new Date() } });
  await endAllSessions(reset.userId); // anyone signed in with the old password is signed out
  return { ok: true };
}
