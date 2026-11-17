import { cookies } from "next/headers";
import { clearedCookies, logout, USER_REFRESH_COOKIE } from "@/lib/userAuth";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  try {
    await logout(store.get(USER_REFRESH_COOKIE)?.value); // ends the session server-side too
  } catch (err) {
    console.error("Logout error:", err);
  }
  const headers = new Headers({ Location: "/login" });
  for (const c of clearedCookies()) headers.append("Set-Cookie", c);
  return new Response(null, { status: 303, headers });
}
