import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { issueLicenseKey } from "@/lib/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple per-IP limit so the page can't be scripted into minting thousands
// of keys. In-memory: resets on restart and is per server instance.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function fail(message, status = 400) {
  return Response.json({ success: false, message }, { status });
}

// Record of who was issued what — never the key itself.
async function logIssuedKey(entry) {
  try {
    const dir = resolve(/*turbopackIgnore: true*/ process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    await appendFile(resolve(dir, "issued-keys.jsonl"), JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("Could not record issued key:", err.message);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request body.");
  }

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const project = String(body?.project || "").trim();

  if (name.length < 2 || name.length > 80) return fail("Please enter your name.");
  if (!EMAIL_PATTERN.test(email) || email.length > 120) return fail("Please enter a valid email address.");
  if (project.length < 2 || project.length > 80) return fail("Please enter your project or company name.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return fail("Too many keys generated from this network. Try again in an hour.", 429);

  let issued;
  try {
    issued = issueLicenseKey({ customerName: project });
  } catch (err) {
    console.error(err);
    return fail("Key generation is not available right now.", 500);
  }

  await logIssuedKey({
    customerId: issued.customerId,
    name,
    email,
    project,
    plan: issued.plan,
    issuedAt: new Date().toISOString(),
    expiresAt: issued.expiresAt,
  });

  return Response.json({ success: true, data: issued }, { status: 201 });
}
