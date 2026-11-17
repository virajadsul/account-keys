"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", placeholder: "+91 98765 43210" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
];

export function SignupForm() {
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (values.password !== values.confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match." });
      return;
    }
    setLoading(true);
    setErrors({});
    setMessage("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) {
        setErrors(json.errors || {});
        setMessage(json.errors ? "" : json.message);
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setMessage("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="label">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
            value={values[f.name]}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            aria-invalid={Boolean(errors[f.name])}
            aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
            className={`input ${errors[f.name] ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
          />
          {errors[f.name] ? (
            <p id={`${f.name}-error`} className="mt-1.5 text-sm text-rose-700">
              {errors[f.name]}
            </p>
          ) : (
            f.hint && <p className="mt-1.5 text-xs text-stone-500">{f.hint}</p>
          )}
        </div>
      ))}

      {message && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{message}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
