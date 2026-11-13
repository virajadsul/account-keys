import { cookies } from "next/headers";
import { clearedCookies, logout, REFRESH_COOKIE } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  try {
    await logout(store.get(REFRESH_COOKIE)?.value); // ends the session server-side too
  } catch (err) {
    console.error("Admin logout error:", err);
  }
  const headers = new Headers({ Location: "/admin/login" });
  for (const c of clearedCookies()) headers.append("Set-Cookie", c);
  return new Response(null, { status: 303, headers });
}
