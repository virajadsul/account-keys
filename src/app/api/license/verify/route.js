// Called by every installed copy of the package: at startup and every 24 h.
// Answers whether the key is still active, signed so the package can trust it.
import { readLicenseKey, signStatus } from "@/lib/license";
import { keyStatusForCheck } from "@/lib/keysStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Extra days an installation keeps working after a missed 24 h check (we're down, or it's offline).
const graceEnv = Number(process.env.LICENSE_GRACE_DAYS ?? 7);
const GRACE_DAYS = Number.isFinite(graceEnv) && graceEnv >= 0 ? graceEnv : 7;

const fail = (message, status) => Response.json({ success: false, message }, { status });

// shortcut: no rate limit (each call is one indexed lookup); add one if this gets abused.
export async function POST(request) {
  let key;
  try {
    key = String((await request.json())?.key || "");
  } catch {
    return fail("Invalid request body.", 400);
  }
  if (key.length > 2000) return fail("Invalid license key.", 400);

  let payload;
  try {
    payload = readLicenseKey(key);
  } catch (err) {
    console.error(err); // signing key not configured
    return fail("License check is not available right now.", 503);
  }
  if (!payload) return fail("Invalid license key.", 400);

  let result;
  try {
    result = await keyStatusForCheck(key, payload.sub);
  } catch (err) {
    console.error("License check failed:", err);
    return fail("License check is not available right now.", 503); // package falls back to its grace period
  }

  return Response.json(signStatus({ sub: payload.sub, ...result, checkedAt: Date.now(), graceDays: GRACE_DAYS }));
}
