import { cookies } from "next/headers";
import { clearedCookies, refresh, REFRESH_COOKIE, requestMeta, sessionCookies } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only same-site relative paths, so this can't be used as an open redirect.
function safeNext(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

// Admin pages send the browser here when the 15-minute access token has
// expired; a valid refresh token gets a fresh pair and goes back.
export async function GET(request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const store = await cookies();

  let tokens = null;
  try {
    tokens = await refresh(store.get(REFRESH_COOKIE)?.value, requestMeta(request));
  } catch (err) {
    console.error("Admin refresh error:", err);
  }

  const headers = new Headers({ Location: tokens ? next : "/admin/login" });
  for (const c of tokens ? sessionCookies(tokens) : clearedCookies()) headers.append("Set-Cookie", c);
  return new Response(null, { status: 303, headers });
}
