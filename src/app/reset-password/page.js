import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Set a new password · Accounting Keys", robots: { index: false } };

// Reached after the emailed code is accepted; the permission to reset is an
// httpOnly cookie that only the reset endpoint receives.
export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="You'll be signed out everywhere else, then you can log in with it.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
