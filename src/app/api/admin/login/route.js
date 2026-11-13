import { login, requestMeta, sessionCookies } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Slow down password guessing: 5 failed attempts per IP per 15 minutes.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

function recentFailures(ip) {
  const now = Date.now();
  const recent = (failures.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  failures.set(ip, recent);
  return recent;
}

function fail(message, status) {
  return Response.json({ success: false, message }, { status });
}

export async function POST(request) {
  const meta = requestMeta(request);
  const ip = meta.ip || "local";
  if (recentFailures(ip).length >= MAX_FAILURES) return fail("Too many failed attempts. Try again in 15 minutes.", 429);

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
    console.error("Admin login error:", err);
    return fail("Sign in is unavailable right now.", 503);
  }

  if (!tokens) {
    recentFailures(ip).push(Date.now());
    return fail("Incorrect email or password.", 401);
  }

  failures.delete(ip);
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const c of sessionCookies(tokens)) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
