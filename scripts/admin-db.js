// Shared by the admin scripts: connects with MONGODB_URI from .env.local.
import { MongoClient } from "mongodb";

export const BCRYPT_ROUNDS = 12; // keep in sync with src/lib/adminAuth.js

export async function withAdmins(fn) {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env.local.");
    process.exit(1);
  }
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  try {
    const admins = client.db(process.env.MONGODB_DB || "accounting_keys").collection("admins");
    await admins.createIndex({ email: 1 }, { unique: true });
    return await fn(admins, client.db(process.env.MONGODB_DB || "accounting_keys"));
  } finally {
    await client.close();
  }
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
