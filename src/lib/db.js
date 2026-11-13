// Server-only. One shared MongoDB client per server process (and across
// dev hot reloads), so each request doesn't open a new connection.
import { MongoClient } from "mongodb";

const globalCache = globalThis.__accountingKeysMongo ?? (globalThis.__accountingKeysMongo = {});

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  if (!globalCache.promise) {
    globalCache.promise = new MongoClient(uri).connect().catch((err) => {
      globalCache.promise = null; // allow a retry on the next request
      throw err;
    });
  }
  const client = await globalCache.promise;
  return client.db(process.env.MONGODB_DB || "accounting_keys");
}
