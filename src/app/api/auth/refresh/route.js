import { cookies } from "next/headers";
import { clearedCookies, refresh, requestMeta, sessionCookies, USER_REFRESH_COOKIE } from "@/lib/userAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only same-site relative paths, so this can't be used as an open redirect.
const safeNext = (v) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard");

// Pages send the browser here when the 15-minute access token has expired;
// a valid refresh token gets a fresh pair and goes back, otherwise to log in.
export async function GET(request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const store = await cookies();
  let tokens = null;
  try {
    tokens = await refresh(store.get(USER_REFRESH_COOKIE)?.value, requestMeta(request));
  } catch (err) {
    console.error("Refresh error:", err);
  }
  const headers = new Headers({ Location: tokens ? next : `/login?next=${encodeURIComponent(next)}` });
  for (const c of tokens ? sessionCookies(tokens) : clearedCookies()) headers.append("Set-Cookie", c);
  return new Response(null, { status: 303, headers });
}
