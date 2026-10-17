"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ArrowDown, KeyRound, Loader2, RotateCcw } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { useApiKey } from "./KeyContext";

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        required
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        {...props}
      />
    </label>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function KeyGenerator() {
  const [form, setForm] = useState({ name: "", email: "", project: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const { setApiKey } = useApiKey();

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setResult(json.data);
      setApiKey(json.data.key);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setApiKey(null);
    setForm({ name: "", email: "", project: "" });
  }

  if (result) {
    return (
      <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <KeyRound className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold">Your API key is ready</h2>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-900 p-3">
          <code className="min-w-0 flex-1 truncate text-[13px] text-brand-200" title={result.key}>
            {result.key}
          </code>
          <CopyButton text={result.key} label="Copy key" />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {result.expiresAt ? `Valid until ${formatDate(result.expiresAt)}` : "Never expires"} · Plan: {result.plan}
        </p>

        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Copy it now. We don&apos;t store your key, so it can&apos;t be shown again. Keep it in your .env, never in frontend code.</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <a
            href="#setup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Next: set it up
            <ArrowDown className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Generate another key
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-lg font-semibold">Generate your API key</h2>
      <p className="mt-1 text-sm text-slate-500">Free. Takes ten seconds.</p>

      <div className="mt-5 space-y-4">
        <Field label="Your name" value={form.name} onChange={update("name")} placeholder="Priya Sharma" autoComplete="name" />
        <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="priya@company.com" autoComplete="email" />
        <Field label="Project or company" value={form.project} onChange={update("project")} placeholder="Acme Billing" />
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={clsx(
          "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors",
          "hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {loading ? "Generating…" : "Generate API key"}
      </button>
    </form>
  );
}
