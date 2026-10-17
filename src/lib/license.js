// Server-only. Mints license keys in the exact format the package verifies
// (account-backend/src/license/verify.js):
//   acc_<base64url(JSON payload)>.<base64url(Ed25519 signature)>
import { createPrivateKey, randomBytes, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let privateKey;

function loadPrivateKey() {
  if (privateKey) return privateKey;
  const inline = process.env.ACCOUNTING_LICENSE_PRIVATE_KEY;
  const path = process.env.ACCOUNTING_LICENSE_PRIVATE_KEY_PATH;
  let pem;
  if (inline) pem = inline.replace(/\\n/g, "\n");
  else if (path) pem = readFileSync(resolve(/*turbopackIgnore: true*/ process.cwd(), path), "utf8");
  else throw new Error("Signing key not configured: set ACCOUNTING_LICENSE_PRIVATE_KEY or ACCOUNTING_LICENSE_PRIVATE_KEY_PATH.");
  privateKey = createPrivateKey(pem);
  return privateKey;
}

export function issueLicenseKey({ customerName }) {
  const days = Number(process.env.KEY_VALIDITY_DAYS || 365);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    sub: `cus_${randomBytes(8).toString("hex")}`,
    name: customerName,
    plan: process.env.KEY_PLAN || "standard",
    iat: now,
    exp: days > 0 ? now + days * 86400 : null,
  };

  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signaturePart = sign(null, Buffer.from(payloadPart), loadPrivateKey()).toString("base64url");

  return {
    key: `acc_${payloadPart}.${signaturePart}`,
    customerId: payload.sub,
    plan: payload.plan,
    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
  };
}
