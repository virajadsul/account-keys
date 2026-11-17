import { requestMeta, sessionCookies, signup } from "@/lib/userAuth";
import { sendWelcome } from "@/lib/mailer";
import { createLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createLimiter({ max: 5, windowMs: 60 * 60 * 1000 }); // 5 sign-ups per network per hour

const fail = (message, status, errors) => Response.json({ success: false, message, errors }, { status });

export async function POST(request) {
  const meta = requestMeta(request);
  const ip = meta.ip || "local";
  if (limiter.blocked(ip)) return fail("Too many sign-ups from this network. Try again in an hour.", 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  let result;
  try {
    result = await signup(body, meta);
  } catch (err) {
    console.error("Sign-up error:", err);
    return fail("Sign-up is unavailable right now. Please try again shortly.", 503);
  }
  if (result.errors) return fail("Please fix the highlighted fields.", 400, result.errors);

  limiter.hit(ip);
  sendWelcome(result.account);
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const c of sessionCookies(result.tokens)) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify({ success: true }), { status: 201, headers });
}
