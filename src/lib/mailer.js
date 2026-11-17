// Server-only. Account emails through Nodemailer (SMTP).
// Configure in .env.local: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL.
// Until SMTP_HOST is set, emails are skipped (logged), so sign-up and keys work without it.
// Sending never blocks or fails the request that triggered it.
import nodemailer from "nodemailer";

let transport;

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // true for port 465
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

const appUrl = () => (process.env.APP_URL || "http://localhost:3100").replace(/\/+$/, "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const when = (d = new Date()) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST";

// Plain layout: reads fine in every client, no images or tracking.
function html(paragraphs) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("");
  return `<div style="font:15px/1.6 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1c1917;max-width:520px">${body}<p style="margin:24px 0 0;color:#78716c;font-size:13px">Accounting Keys · <a href="${appUrl()}" style="color:#78716c">${appUrl().replace(/^https?:\/\//, "")}</a></p></div>`;
}

function send({ to, subject, text, paragraphs }) {
  const t = getTransport();
  if (!t) {
    // Codes are masked so a reset OTP never lands in server logs.
    console.info(`[mail skipped: SMTP not configured] to=${to} subject="${subject.replace(/\d{6}/g, "••••••")}"`);
    return;
  }
  t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html: html(paragraphs) }).catch((err) =>
    console.error(`[mail failed] to=${to} subject="${subject}":`, err.message)
  );
}

export function sendWelcome(user) {
  const dashboard = `${appUrl()}/dashboard`;
  const docs = `${appUrl()}/docs`;
  send({
    to: user.email,
    subject: "Welcome to Accounting Keys",
    text: `Hi ${user.name},\n\nYour account is ready. Create an API key in your dashboard: ${dashboard}\nThen follow the setup guide: ${docs}\n\nThe key goes in your backend's .env as ACCOUNTING_LICENSE_KEY.`,
    paragraphs: [
      `Hi ${esc(user.name)},`,
      `Your Accounting Keys account is ready.`,
      `Next, create an API key in your <a href="${dashboard}">dashboard</a>, then follow the <a href="${docs}">setup guide</a>. The key goes in your backend's <code>.env</code> as <code>ACCOUNTING_LICENSE_KEY</code>.`,
    ],
  });
}

export function sendKeyCreated(user, key, ip) {
  send({
    to: user.email,
    subject: `New API key created: ${key.name}`,
    text: `Hi ${user.name},\n\nA new API key "${key.name}" (${key.preview}) was created on your account on ${when()}${ip ? ` from ${ip}` : ""}.\n\nIf this wasn't you, delete the key in your dashboard and change your password: ${appUrl()}/dashboard`,
    paragraphs: [
      `Hi ${esc(user.name)},`,
      `A new API key <strong>${esc(key.name)}</strong> (<code>${esc(key.preview)}</code>) was created on your account on ${when()}${ip ? ` from ${esc(ip)}` : ""}.`,
      `If this wasn't you, delete the key in your <a href="${appUrl()}/dashboard">dashboard</a> and change your password.`,
    ],
  });
}

/** by: "user" (deleted from the dashboard) or "admin" (deactivated by Accounting Keys). */
export function sendKeyRevoked(user, key, by) {
  const action = by === "admin" ? "deactivated by the Accounting Keys team" : "deleted";
  send({
    to: user.email,
    subject: `API key ${by === "admin" ? "deactivated" : "deleted"}: ${key.name}`,
    text: `Hi ${user.name},\n\nYour API key "${key.name}" (${key.preview}) was ${action} on ${when()}. Apps using it will stop accounting at their next daily check.\n\nManage your keys: ${appUrl()}/dashboard`,
    paragraphs: [
      `Hi ${esc(user.name)},`,
      `Your API key <strong>${esc(key.name)}</strong> (<code>${esc(key.preview)}</code>) was ${action} on ${when()}. Apps using it will stop accounting at their next daily check.`,
      `Manage your keys in your <a href="${appUrl()}/dashboard">dashboard</a>.`,
    ],
  });
}

export function sendPasswordResetOtp(user, otp) {
  send({
    to: user.email,
    subject: `${otp} is your Accounting Keys reset code`,
    text: `Hi ${user.name},

Your code to reset your Accounting Keys password is ${otp}. It expires in 10 minutes.

If you didn't ask for this, ignore this email: your password stays the same.`,
    paragraphs: [
      `Hi ${esc(user.name)},`,
      `Your code to reset your Accounting Keys password:`,
      `<span style="font:600 28px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:6px">${otp}</span>`,
      `It expires in 10 minutes. If you didn't ask for this, ignore this email: your password stays the same.`,
    ],
  });
}
