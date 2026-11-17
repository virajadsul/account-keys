// Called by every installed copy of the package: at startup and every 24 h.
// Answers whether the API key is active, and whose it is. HTTPS protects the answer
// in transit; nothing is signed, and there is no master key that can mint keys.
import { checkKey } from "@/lib/apiKeys";
import { requestMeta } from "@/lib/sessionAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Days an installation keeps working after a missed 24 h check (we're down, or it's offline).
const graceEnv = Number(process.env.LICENSE_GRACE_DAYS ?? 7);
const GRACE_DAYS = Number.isFinite(graceEnv) && graceEnv >= 0 ? graceEnv : 7;

const fail = (message, status) => Response.json({ success: false, message }, { status });

// shortcut: no rate limit; keys are 256-bit random, so guessing is hopeless and each call is one indexed lookup.
export async function POST(request) {
  let key;
  try {
    key = String((await request.json())?.key || "");
  } catch {
    return fail("Invalid request body.", 400);
  }
  if (key.length > 200) return fail("Invalid license key.", 400);

  try {
    const result = await checkKey(key, requestMeta(request).ip);
    return Response.json({ success: true, data: { ...result, graceDays: GRACE_DAYS } });
  } catch (err) {
    console.error("License check failed:", err);
    return fail("License check is not available right now.", 503); // the package falls back to its grace period
  }
}
