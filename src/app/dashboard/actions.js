"use server";
// Key management for the signed-in user. Server actions are public endpoints,
// so each one checks the session and the account itself.
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/userAuth";
import { createKey, deleteKey } from "@/lib/apiKeys";
import { sendKeyCreated, sendKeyRevoked } from "@/lib/mailer";

async function activeUser() {
  const { user } = await currentUser();
  return user && user.isActive !== false ? user : null;
}

/** Returns { key, view } — the full key, shown once — or { error }. */
export async function createKeyAction(name) {
  const user = await activeUser();
  if (!user) return { error: "Your session has ended. Log in again." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || null;
  try {
    const result = await createKey(user, name, ip);
    if (result.error) return result;
    sendKeyCreated(user, result.view, ip);
    revalidatePath("/dashboard");
    return result;
  } catch (err) {
    console.error("Create key failed:", err);
    return { error: "Couldn't create the key. Please try again." };
  }
}

export async function deleteKeyAction(keyId) {
  const user = await activeUser();
  if (!user) return { error: "Your session has ended. Log in again." };
  try {
    const key = await deleteKey(user._id, keyId);
    if (!key) return { error: "That key was already deleted." };
    sendKeyRevoked(user, key, "user");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("Delete key failed:", err);
    return { error: "Couldn't delete the key. Please try again." };
  }
}
