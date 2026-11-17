import { verifyOtp, RESET_TOKEN_TTL_SECONDS } from "@/lib/passwordReset";
import { requestMeta } from "@/lib/sessionAuth";
import { createLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Each code already allows only 5 tries; this caps guessing across many codes from one network.
const limiter = createLimiter({ max: 20, windowMs: 15 * 60 * 1000 });

const fail = (message, status) => Response.json({ success: false, message }, { status });

export async function POST(request) {
  const ip = requestMeta(request).ip || "local";
  if (limiter.blocked(ip)) return fail("Too many attempts. Try again in 15 minutes.", 429);
  limiter.hit(ip);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  let result;
  try {
    result = await verifyOtp(body?.email, body?.otp);
  } catch (err) {
    console.error("OTP check failed:", err);
    return fail("Couldn't check the code right now. Please try again shortly.", 503);
  }
  if (result.error) return fail(result.error, 400);

  // The reset token only ever travels in this cookie, and only to the reset endpoint.
  const cookie = [
    `ak_reset=${result.token}`,
    "Path=/api/auth/reset",
    `Max-Age=${RESET_TOKEN_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
    process.env.NODE_ENV === "production" && "Secure",
  ]
    .filter(Boolean)
    .join("; ");
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Set-Cookie": cookie } });
}
