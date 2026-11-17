"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const RESEND_SECONDS = 60;

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState("email"); // "email" → "code"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode(e) {
    e?.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const json = await postJson("/api/auth/forgot", { email });
      if (!json.success) return setMessage(json.message);
      setStep("code");
      setOtp("");
      setWait(RESEND_SECONDS);
    } catch {
      setMessage("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function checkCode(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const json = await postJson("/api/auth/verify-otp", { email, otp });
      if (!json.success) {
        setMessage(json.message);
        setLoading(false);
        return;
      }
      window.location.href = "/reset-password";
    } catch {
      setMessage("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        {message && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{message}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={checkCode} className="space-y-4">
      <p className="text-sm text-stone-600">
        If <strong className="font-medium text-stone-900">{email}</strong> has an account, we've sent it a 6-digit code. It
        expires in 10 minutes.
      </p>
      <div>
        <label htmlFor="otp" className="label">
          Code
        </label>
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="input font-mono text-lg tracking-[0.4em]"
        />
      </div>
      {message && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{message}</p>}
      <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full py-2.5">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={() => (setStep("email"), setMessage(""))} className="text-stone-600 hover:text-stone-900">
          Use a different email
        </button>
        <button type="button" onClick={sendCode} disabled={wait > 0 || loading} className="font-medium text-stone-900 disabled:text-stone-400">
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
