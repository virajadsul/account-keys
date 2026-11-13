// Server-only. The record of every issued license key.
// The key itself is never stored — only a SHA-256 fingerprint, so a leaked
// database exposes no usable keys but still lets us look a key up (revocation).
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";

const DAY = 86400000;
export const EXPIRING_SOON_DAYS = 30;

let indexesReady;

async function collection() {
  const db = await getDb();
  const col = db.collection("issued_keys");
  indexesReady ||= Promise.all([
    col.createIndex({ customerId: 1 }, { unique: true }),
    col.createIndex({ keyHash: 1 }, { unique: true, partialFilterExpression: { keyHash: { $type: "string" } } }),
    col.createIndex({ issuedAt: -1 }),
    col.createIndex({ expiresAt: 1 }),
    col.createIndex({ email: 1 }),
  ]).catch((err) => {
    indexesReady = null;
    throw err;
  });
  await indexesReady;
  return col;
}

export const fingerprint = (key) => createHash("sha256").update(key).digest("hex");

export async function recordIssuedKey({ key, customerId, name, email, project, plan, issuedAt, expiresAt, ip }) {
  const col = await collection();
  await col.insertOne({
    customerId,
    name,
    email,
    project,
    plan,
    ...(key && { keyHash: fingerprint(key) }),
    issuedAt: new Date(issuedAt),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    ip: ip || null,
  });
}

export function statusOf(record, now = Date.now()) {
  if (record.isActive === false) return "inactive";
  if (!record.expiresAt) return "active";
  const left = record.expiresAt.getTime() - now;
  if (left <= 0) return "expired";
  if (left <= EXPIRING_SOON_DAYS * DAY) return "expiring";
  return "active";
}

// Mongo filter for each dashboard tab.
function statusFilter(status, now) {
  const soon = new Date(now + EXPIRING_SOON_DAYS * DAY);
  const nowDate = new Date(now);
  const enabled = { isActive: { $ne: false } }; // records from before the flag existed count as enabled
  switch (status) {
    case "active":
      return { ...enabled, $or: [{ expiresAt: null }, { expiresAt: { $gt: soon } }] };
    case "expiring":
      return { ...enabled, expiresAt: { $gt: nowDate, $lte: soon } };
    case "expired":
      return { ...enabled, expiresAt: { $lte: nowDate } };
    case "inactive":
      return { isActive: false };
    case "renewal":
      return { renewalRequestedAt: { $ne: null } };
    default:
      return {};
  }
}

export async function getDashboardData({ status = "all", search = "" } = {}) {
  const col = await collection();
  const now = Date.now();
  const startOfMonth = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1);

  const [total, expiring, expired, inactive, thisMonth] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments(statusFilter("expiring", now)),
    col.countDocuments(statusFilter("expired", now)),
    col.countDocuments(statusFilter("inactive", now)),
    col.countDocuments({ issuedAt: { $gte: startOfMonth } }),
  ]);

  const filter = { ...statusFilter(status, now) };
  const q = search.trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$and = [{ $or: [{ name: rx }, { email: rx }, { project: rx }, { customerId: rx }] }];
  }

  const rows = await col
    .find(filter, { projection: { keyHash: 0, ip: 0 } })
    .sort({ issuedAt: -1 })
    .limit(500)
    .toArray();

  return {
    stats: { total, active: total - expiring - expired - inactive, expiring, expired, inactive, thisMonth },
    rows: rows.map((r) => toRow(r, now)),
  };
}

function toRow(r, now = Date.now()) {
  return {
    id: String(r._id),
    customerId: r.customerId,
    name: r.name,
    email: r.email,
    project: r.project,
    plan: r.plan,
    issuedAt: r.issuedAt.toISOString(),
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    status: statusOf(r, now),
    daysLeft: r.expiresAt ? Math.ceil((r.expiresAt.getTime() - now) / DAY) : null,
    isActive: r.isActive !== false,
    ip: r.ip || null,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    lastCheckedAt: r.lastCheckedAt ? r.lastCheckedAt.toISOString() : null,
    renewalRequestedAt: r.renewalRequestedAt ? r.renewalRequestedAt.toISOString() : null,
    renewedAt: r.renewedAt ? r.renewedAt.toISOString() : null,
  };
}

const idFilter = (id) => (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null);

// Online check: is this key still allowed, and until when? Also records when it last checked in.
// expiresAt here is the source of truth; renewals move it, the key's own date is only a fallback.
export async function keyStatusForCheck(key, customerId) {
  const col = await collection();
  const r = await col.findOne({ customerId });
  // A key replaced by a newer one for the same customer no longer counts.
  if (!r || (r.keyHash && r.keyHash !== fingerprint(key))) return { status: "unknown", expiresAt: null };
  await col.updateOne({ _id: r._id }, { $set: { lastCheckedAt: new Date() } });
  const expiresAt = r.expiresAt ? r.expiresAt.getTime() : null;
  if (r.isActive === false) return { status: "inactive", expiresAt };
  if (expiresAt && expiresAt <= Date.now()) return { status: "expired", expiresAt };
  return { status: "active", expiresAt };
}

// From the public /renew page. True only if the customer ID and email match a key.
export async function requestRenewal(customerId, email) {
  const col = await collection();
  const res = await col.updateOne({ customerId, email }, { $set: { renewalRequestedAt: new Date() } });
  return res.matchedCount === 1;
}

// Admin: extend by `days` from the later of today and the current end date, re-enable, clear the request.
export async function renewKey(id, days) {
  const filter = idFilter(id);
  if (!filter) return;
  const col = await collection();
  const r = await col.findOne(filter, { projection: { expiresAt: 1 } });
  if (!r) return;
  const from = Math.max(Date.now(), r.expiresAt ? r.expiresAt.getTime() : 0);
  await col.updateOne(filter, {
    $set: { expiresAt: new Date(from + days * DAY), isActive: true, renewedAt: new Date(), updatedAt: new Date() },
    $unset: { renewalRequestedAt: "" },
  });
}

export async function getKey(id) {
  const filter = idFilter(id);
  if (!filter) return null;
  const r = await (await collection()).findOne(filter, { projection: { keyHash: 0 } });
  return r && toRow(r);
}

// Admin record only: keys are verified offline, so this does not stop a key working in a customer's app.
export async function setKeyActive(id, isActive) {
  const filter = idFilter(id);
  if (filter) await (await collection()).updateOne(filter, { $set: { isActive, updatedAt: new Date() } });
}

// Name and project only. Key, email and customer ID are fixed; plan and expiry are signed into the key.
export async function updateKeyDetails(id, { name, project }) {
  const filter = idFilter(id);
  if (filter) await (await collection()).updateOne(filter, { $set: { name, project, updatedAt: new Date() } });
}
