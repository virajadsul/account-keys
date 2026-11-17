import { cookies } from "next/headers";
import { resetPassword } from "@/lib/passwordReset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLEAR = "ak_reset=; Path=/api/auth/reset; Max-Age=0; HttpOnly; SameSite=Strict";

const reply = (body, status, clearCookie) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(clearCookie && { "Set-Cookie": CLEAR }) },
  });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ success: false, message: "Invalid request." }, 400);
  }

  const token = (await cookies()).get("ak_reset")?.value;
  let result;
  try {
    result = await resetPassword(token, body?.password, body?.confirmPassword);
  } catch (err) {
    console.error("Password reset failed:", err);
    return reply({ success: false, message: "Couldn't reset the password right now. Please try again shortly." }, 503);
  }
  if (result.errors) return reply({ success: false, message: "Please fix the highlighted fields.", errors: result.errors }, 400);
  if (result.error) return reply({ success: false, message: result.error, expired: true }, 400, true);
  return reply({ success: true }, 200, true);
}
