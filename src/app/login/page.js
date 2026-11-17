import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getUserSession } from "@/lib/userAuth";

export const metadata = { title: "Log in · Accounting Keys" };

// Only same-site relative paths, so ?next= can't send people to another site.
const safeNext = (v) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard");

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = safeNext(params?.next);
  if (await getUserSession()) redirect(next);
  return (
    <AuthShell
      title="Log in"
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-stone-900 underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      {params?.reset === "1" && (
        <p className="mb-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Password updated. Log in with your new password.</p>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
