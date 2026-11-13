"use server";
import { redirect } from "next/navigation";
import { requestRenewal } from "@/lib/keysStore";

// shortcut: no rate limit — a match needs the random customer ID and the email; add one if it gets spammed.
export async function submitRenewal(formData) {
  const customer = String(formData.get("customer") || "").trim().slice(0, 100);
  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 120);
  const back = (q) => `/renew?customer=${encodeURIComponent(customer)}&${q}`;
  if (!customer || !email) redirect(back("error=missing"));
  let ok = false;
  try {
    ok = await requestRenewal(customer, email);
  } catch (err) {
    console.error("Renewal request failed:", err);
    redirect(back("error=server"));
  }
  redirect(back(ok ? "sent=1" : "error=nomatch"));
}
