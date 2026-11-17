import { requestReset } from "@/lib/passwordReset";
import { requestMeta } from "@/lib/sessionAuth";
import { createLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createLimiter({ max: 10, windowMs: 60 * 60 * 1000 }); // 10 requests per network per hour

const fail = (message, status) => Response.json({ success: false, message }, { status });

export async function POST(request) {
  const ip = requestMeta(request).ip || "local";
  if (limiter.blocked(ip)) return fail("Too many requests from this network. Try again in an hour.", 429);
  limiter.hit(ip);

  let email;
  try {
    email = String((await request.json())?.email || "");
  } catch {
    return fail("Invalid request.", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail("Enter a valid email address.", 400);

  try {
    await requestReset(email);
  } catch (err) {
    console.error("Password reset request failed:", err);
    return fail("Couldn't send a code right now. Please try again shortly.", 503);
  }
  // Same answer whether or not the email has an account.
  return Response.json({ success: true });
}
