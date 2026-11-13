// One-time import of the old file log (data/issued-keys.jsonl) into MongoDB.
// Safe to run twice: keys already in the database are skipped.
//   npm run keys:import
import { existsSync, readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const LOG = new URL("../data/issued-keys.jsonl", import.meta.url);
if (!existsSync(LOG)) {
  console.log("No data/issued-keys.jsonl found. Nothing to import.");
  process.exit(0);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local.");
  process.exit(1);
}

const entries = readFileSync(LOG, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || "accounting_keys").collection("issued_keys");

let imported = 0;
for (const e of entries) {
  const res = await col.updateOne(
    { customerId: e.customerId },
    {
      $setOnInsert: {
        customerId: e.customerId,
        name: e.name,
        email: e.email,
        project: e.project,
        plan: e.plan,
        // no keyHash: the old log never stored keys, so there is nothing to fingerprint
        issuedAt: new Date(e.issuedAt),
        expiresAt: e.expiresAt ? new Date(e.expiresAt) : null,
        ip: null,
        importedFrom: "issued-keys.jsonl",
      },
    },
    { upsert: true }
  );
  if (res.upsertedCount) imported++;
}
await client.close();
console.log(`Imported ${imported} of ${entries.length} keys (${entries.length - imported} were already in the database).`);
