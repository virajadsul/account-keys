"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Plus, Trash2, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { createKeyAction, deleteKeyAction } from "@/app/dashboard/actions";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

function lastUsed(iso) {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return fmt(iso);
}

/** The full key, once. Closing it is the last chance to copy. */
function NewKey({ created, onClose }) {
  return (
    <div className="rounded-card border border-stone-900 bg-white p-5" role="status">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Copy your new key now</h3>
          <p className="mt-1 text-sm text-stone-600">
            “{created.view.name}” won't be shown again. If you lose it, delete it and create a new one.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Done">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md bg-stone-900 p-2 pl-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-brand-200">{created.key}</code>
        <CopyButton text={created.key} label="Copy key" />
      </div>
      <p className="mt-3 text-sm text-stone-600">
        Put it in your backend's <code className="font-mono text-[13px]">.env</code> as{" "}
        <code className="font-mono text-[13px]">ACCOUNTING_LICENSE_KEY</code>. Never in frontend code.
      </p>
    </div>
  );
}

export function KeysPanel({ keys, limit }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [pending, startTransition] = useTransition();
  const atLimit = keys.length >= limit;

  function create(e) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createKeyAction(name);
      if (result.error) return setError(result.error);
      setCreated(result);
      setName("");
    });
  }

  function remove(id) {
    setError("");
    startTransition(async () => {
      const result = await deleteKeyAction(id);
      setConfirming(null);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="key-name" className="sr-only">
          Key name
        </label>
        <input
          id="key-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Key name, e.g. Production server"
          disabled={atLimit || pending}
          className="input sm:max-w-sm"
        />
        <button type="submit" disabled={atLimit || pending || !name.trim()} className="btn-primary shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create key
        </button>
      </form>
      {atLimit && <p className="text-sm text-stone-600">You've reached {limit} keys. Delete one to create another.</p>}
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}

      {created && <NewKey created={created} onClose={() => setCreated(null)} />}

      {keys.length === 0 ? (
        <div className="rounded-card border border-dashed border-stone-300 px-6 py-12 text-center">
          <p className="font-medium text-stone-800">No API keys yet</p>
          <p className="mt-1 text-sm text-stone-500">Name your first key above, e.g. after the server that will use it.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last used</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {keys.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-stone-600">{k.preview}</td>
                  <td className="px-4 py-3 text-stone-600">{fmt(k.createdAt)}</td>
                  <td className="px-4 py-3 text-stone-600">{lastUsed(k.lastUsedAt)}</td>
                  <td className="px-4 py-3">
                    {k.isActive ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700" title="Deactivated by the Accounting Keys team">
                        <AlertTriangle className="h-3.5 w-3.5" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirming === k.id ? (
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span className="text-stone-600">Delete?</span>
                        <button type="button" onClick={() => remove(k.id)} disabled={pending} className="font-medium text-rose-700 hover:underline">
                          Delete
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="text-stone-500 hover:underline">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(k.id)}
                        className="inline-flex items-center gap-1 rounded p-1 text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                        aria-label={`Delete key ${k.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-stone-500">Deleting a key stops it working in apps that use it at their next daily check.</p>
    </div>
  );
}
