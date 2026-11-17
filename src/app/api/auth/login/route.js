import { login, requestMeta, sessionCookies } from "@/lib/userAuth";
import { createLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const failures = createLimiter({ max: 5, windowMs: 15 * 60 * 1000 }); // 5 wrong passwords per network per 15 min

const fail = (message, status) => Response.json({ success: false, message }, { status });

export async function POST(request) {
  const meta = requestMeta(request);
  const ip = meta.ip || "local";
  if (failures.blocked(ip)) return fail("Too many failed attempts. Try again in 15 minutes.", 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  let tokens;
  try {
    tokens = await login(body?.email, body?.password, meta);
  } catch (err) {
    console.error("Login error:", err);
    return fail("Log in is unavailable right now. Please try again shortly.", 503);
  }
  if (!tokens) {
    failures.hit(ip);
    return fail("Incorrect email or password.", 401);
  }

  if (tokens.deactivated) return fail("This account has been deactivated.", 403);

  failures.reset(ip);
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const c of sessionCookies(tokens)) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
