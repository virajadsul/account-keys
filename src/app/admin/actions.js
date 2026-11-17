"use server";
// Admin-only mutations. Server actions are public endpoints, so each one checks the session itself.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { adminSetAccountActive, adminSetKeyActive, adminSetPlan } from "@/lib/apiKeys";
import { endAllSessions } from "@/lib/userAuth";
import { sendKeyRevoked } from "@/lib/mailer";
import { PLANS } from "@/lib/plans";

async function requireAdmin(back) {
  if (!(await getAdminSession())) redirect(`/api/admin/refresh?next=${encodeURIComponent(back)}`);
}

export async function toggleKeyAction(formData) {
  const userId = String(formData.get("userId") || "");
  await requireAdmin(`/admin/users/${userId}`);
  const active = formData.get("active") === "true";
  const result = await adminSetKeyActive(String(formData.get("keyId") || ""), active);
  // Alert the owner when a key is turned off (not when it's turned back on).
  if (result?.user && !active) sendKeyRevoked(result.user, result.key, "admin");
  revalidatePath("/admin", "layout");
}

export async function toggleAccountAction(formData) {
  const userId = String(formData.get("userId") || "");
  await requireAdmin(`/admin/users/${userId}`);
  const active = formData.get("active") === "true";
  const user = await adminSetAccountActive(userId, active);
  // A deactivated account is signed out everywhere; its keys stop at their next check.
  if (user && !active) await endAllSessions(user._id);
  revalidatePath("/admin", "layout");
}

export async function setPlanAction(formData) {
  const userId = String(formData.get("userId") || "");
  await requireAdmin(`/admin/users/${userId}`);
  const plan = String(formData.get("plan") || "");
  if (!PLANS[plan]) redirect(`/admin/users/${userId}?error=plan`);
  await adminSetPlan(userId, plan);
  revalidatePath("/admin", "layout");
}
