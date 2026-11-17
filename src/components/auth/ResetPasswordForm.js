"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirmPassword) return setErrors({ confirmPassword: "Passwords don't match." });
    setLoading(true);
    setErrors({});
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrors(json.errors || {});
        setMessage(json.errors ? "" : json.message);
        setExpired(Boolean(json.expired));
        setLoading(false);
        return;
      }
      window.location.href = "/login?reset=1";
    } catch {
      setMessage("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  if (expired) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{message}</p>
        <Link href="/forgot-password" className="btn-primary w-full py-2.5">
          Get a new code
        </Link>
      </div>
    );
  }

  const field = (id, label, value, setValue, autoComplete, hint) => (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={Boolean(errors[id])}
        className={`input ${errors[id] ? "border-rose-400" : ""}`}
      />
      {errors[id] ? <p className="mt-1.5 text-sm text-rose-700">{errors[id]}</p> : hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {field("password", "New password", password, setPassword, "new-password", "At least 8 characters.")}
      {field("confirmPassword", "Confirm new password", confirmPassword, setConfirmPassword, "new-password")}
      {message && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{message}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Save new password
      </button>
    </form>
  );
}
