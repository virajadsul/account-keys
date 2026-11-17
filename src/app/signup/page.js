import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { getUserSession } from "@/lib/userAuth";

export const metadata = { title: "Create account · Accounting Keys" };

export default async function SignupPage() {
  if (await getUserSession()) redirect("/dashboard");
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free. You'll create your first API key right after."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-stone-900 underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
