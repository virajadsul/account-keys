"use server";
// Admin-only mutations. Server actions are public endpoints, so each one checks the session itself.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { renewKey, setKeyActive, updateKeyDetails } from "@/lib/keysStore";

async function requireAdmin(back) {
  if (!(await getAdminSession())) redirect(`/api/admin/refresh?next=${encodeURIComponent(back)}`);
}

export async function toggleKeyActive(formData) {
  const id = String(formData.get("id") || "");
  await requireAdmin(`/admin/keys/${id}`);
  await setKeyActive(id, formData.get("active") === "true");
  revalidatePath("/admin", "layout");
}

export async function renewKeyAction(formData) {
  const id = String(formData.get("id") || "");
  await requireAdmin(`/admin/keys/${id}`);
  await renewKey(id, Number(process.env.KEY_VALIDITY_DAYS || 365));
  revalidatePath("/admin", "layout");
}

export async function saveKeyDetails(formData) {
  const id = String(formData.get("id") || "");
  await requireAdmin(`/admin/keys/${id}?edit=1`);
  const name = String(formData.get("name") || "").trim();
  const project = String(formData.get("project") || "").trim();
  // Same limits as key generation (src/app/api/keys/route.js).
  if (name.length < 2 || name.length > 80 || project.length < 2 || project.length > 80) {
    redirect(`/admin/keys/${id}?edit=1&error=1`);
  }
  await updateKeyDetails(id, { name, project });
  revalidatePath("/admin", "layout");
  redirect(`/admin/keys/${id}`);
}
