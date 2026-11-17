// Server-only. API keys: acc_live_<43 random base64url chars> (256 bits).
// Only a SHA-256 hash of each key is stored, so neither a database leak nor we
// can recover a key; it is shown to the user once, at creation.
// A key works while: it isn't deleted, it isn't deactivated by an admin, and its
// account is active. The package asks /api/license/verify about this every 24 h.
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { maxKeysFor } from "./plans";

const KEY_PATTERN = /^acc_live_[A-Za-z0-9_-]{43}$/;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const keyPreview = (key) => `${key.slice(0, 13)}…${key.slice(-4)}`;

let indexesReady;
async function collections() {
  const db = await getDb();
  const keys = db.collection("api_keys");
  indexesReady ||= Promise.all([keys.createIndex({ keyHash: 1 }, { unique: true }), keys.createIndex({ userId: 1, createdAt: -1 })]).catch(
    (err) => {
      indexesReady = null;
      throw err;
    }
  );
  await indexesReady;
  return { keys, users: db.collection("users") };
}

export const toObjectId = (id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : null);

function toView(k) {
  return {
    id: String(k._id),
    name: k.name,
    preview: k.preview,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    isActive: k.isActive !== false,
    deletedAt: k.deletedAt ? k.deletedAt.toISOString() : null,
  };
}

// ---------- the account owner ----------

/** The account's keys that haven't been deleted, newest first. */
export async function listKeys(userId) {
  const { keys } = await collections();
  const rows = await keys.find({ userId, deletedAt: null }).sort({ createdAt: -1 }).toArray();
  return rows.map(toView);
}

/** Returns { key, view } — the only time the full key exists — or { error }. */
export async function createKey(user, rawName, ip) {
  const name = String(rawName || "").trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 50) return { error: "Give the key a name (up to 50 characters)." };

  const { keys } = await collections();
  const limit = maxKeysFor(user.plan);
  // shortcut: two simultaneous creates can both pass this count; fine at this scale.
  if ((await keys.countDocuments({ userId: user._id, deletedAt: null })) >= limit) {
    return { error: `You can have up to ${limit} keys. Delete one to create another.` };
  }

  const key = `acc_live_${randomBytes(32).toString("base64url")}`;
  const doc = {
    userId: user._id,
    name,
    keyHash: sha256(key),
    preview: keyPreview(key),
    createdAt: new Date(),
    createdIp: ip || null,
    isActive: true,
    deletedAt: null,
    lastUsedAt: null,
  };
  const { insertedId } = await keys.insertOne(doc);
  return { key, view: toView({ ...doc, _id: insertedId }) };
}

/** Soft delete: the key stops working, the record stays for the admin history. */
export async function deleteKey(userId, keyId) {
  const _id = toObjectId(keyId);
  if (!_id) return null;
  const { keys } = await collections();
  return keys.findOneAndUpdate({ _id, userId, deletedAt: null }, { $set: { deletedAt: new Date() } }, { returnDocument: "after" });
}

// ---------- the package's online check ----------

/** "active" | "inactive" | "unknown", plus the owner for an active or inactive key. */
export async function checkKey(rawKey, ip) {
  const key = String(rawKey || "").trim();
  if (!KEY_PATTERN.test(key)) return { status: "unknown" };
  const { keys, users } = await collections();
  const record = await keys.findOne({ keyHash: sha256(key), deletedAt: null });
  if (!record) return { status: "unknown" };
  const user = await users.findOne({ _id: record.userId }, { projection: { name: 1, plan: 1, isActive: 1 } });
  if (!user) return { status: "unknown" };

  await keys.updateOne({ _id: record._id }, { $set: { lastUsedAt: new Date(), lastUsedIp: ip || null } });
  const active = record.isActive !== false && user.isActive !== false;
  return {
    status: active ? "active" : "inactive",
    customerId: String(user._id),
    customerName: user.name,
    plan: user.plan,
    expiresAt: null, // the free plan never ends; paid plans will set this
  };
}

// ---------- superadmin ----------

const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function adminOverview({ search = "" } = {}) {
  const { keys, users } = await collections();
  const filter = {};
  const q = search.trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [userCount, newThisMonth, inactiveAccounts, liveKeys, deactivatedKeys, rows] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ createdAt: { $gte: startOfMonth() } }),
    users.countDocuments({ isActive: false }),
    keys.countDocuments({ deletedAt: null, isActive: { $ne: false } }),
    keys.countDocuments({ deletedAt: null, isActive: false }),
    users
      .aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $limit: 500 },
        {
          $lookup: {
            from: "api_keys",
            let: { uid: "$_id" },
            pipeline: [{ $match: { $expr: { $eq: ["$userId", "$$uid"] }, deletedAt: null } }, { $project: { isActive: 1, lastUsedAt: 1 } }],
            as: "keys",
          },
        },
        { $project: { passwordHash: 0 } },
      ])
      .toArray(),
  ]);

  return {
    stats: { users: userCount, newThisMonth, inactiveAccounts, liveKeys, deactivatedKeys },
    users: rows.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      plan: u.plan,
      isActive: u.isActive !== false,
      createdAt: u.createdAt.toISOString(),
      keyCount: u.keys.length,
      lastUsedAt: u.keys.reduce((max, k) => (k.lastUsedAt && (!max || k.lastUsedAt > max) ? k.lastUsedAt : max), null)?.toISOString() || null,
    })),
  };
}

export async function adminUserDetail(id) {
  const _id = toObjectId(id);
  if (!_id) return null;
  const { keys, users } = await collections();
  const user = await users.findOne({ _id }, { projection: { passwordHash: 0 } });
  if (!user) return null;
  const rows = await keys.find({ userId: _id }).sort({ deletedAt: 1, createdAt: -1 }).toArray();
  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      plan: user.plan,
      isActive: user.isActive !== false,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    },
    keys: rows.map(toView),
  };
}

/** Returns { key, user } (for the alert email), or null if not found. */
export async function adminSetKeyActive(keyId, isActive) {
  const _id = toObjectId(keyId);
  if (!_id) return null;
  const { keys, users } = await collections();
  const key = await keys.findOneAndUpdate(
    { _id, deletedAt: null },
    { $set: { isActive, deactivatedAt: isActive ? null : new Date() } },
    { returnDocument: "after" }
  );
  if (!key) return null;
  return { key, user: await users.findOne({ _id: key.userId }) };
}

export async function adminSetAccountActive(userId, isActive) {
  const _id = toObjectId(userId);
  if (!_id) return null;
  const { users } = await collections();
  return users.findOneAndUpdate({ _id }, { $set: { isActive, updatedAt: new Date() } }, { returnDocument: "after" });
}

export async function adminSetPlan(userId, plan) {
  const _id = toObjectId(userId);
  if (!_id) return null;
  const { users } = await collections();
  return users.findOneAndUpdate({ _id }, { $set: { plan, updatedAt: new Date() } }, { returnDocument: "after" });
}
