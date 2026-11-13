import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import { getAdminSession } from "@/lib/adminAuth";
import { getKey } from "@/lib/keysStore";
import { renewKeyAction, saveKeyDetails } from "../../actions";
import { ActiveToggle, StatusBadge, fmtDate } from "../../shared";

export const dynamic = "force-dynamic";

const RENEW_DAYS = Number(process.env.KEY_VALIDITY_DAYS || 365);

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
const locked = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500";

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default async function KeyDetailPage({ params, searchParams }) {
  const { id } = await params;
  const { edit, error } = (await searchParams) || {};
  const editing = edit === "1";

  if (!(await getAdminSession())) {
    redirect(`/api/admin/refresh?next=${encodeURIComponent(`/admin/keys/${id}${editing ? "?edit=1" : ""}`)}`);
  }

  const key = await getKey(id);
  if (!key) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <a href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        All keys
      </a>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{key.name}</h1>
          <StatusBadge status={key.status} />
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <a
              href={`/admin/keys/${key.id}?edit=1`}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </a>
          )}
          <form action={renewKeyAction}>
            <input type="hidden" name="id" value={key.id} />
            <button className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700">
              <RefreshCw className="h-3.5 w-3.5" />
              Renew {RENEW_DAYS} days
            </button>
          </form>
          <ActiveToggle row={key} />
        </div>
      </div>

      {key.renewalRequestedAt && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          The customer asked to renew on {fmtDate(key.renewalRequestedAt)}. After they pay, click <b>Renew</b>: their app unlocks
          within 5 minutes, with the same key.
        </p>
      )}

      <div className="mt-6 rounded-card border border-slate-200 bg-white p-6 shadow-card">
        {editing ? (
          <form action={saveKeyDetails} className="space-y-4">
            <input type="hidden" name="id" value={key.id} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
              <input name="name" defaultValue={key.name} required minLength={2} maxLength={80} className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Project</span>
              <input name="project" defaultValue={key.project} required minLength={2} maxLength={80} className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email (can't be changed)</span>
              <input value={key.email} readOnly disabled className={locked} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer ID / key (can't be changed)</span>
              <input value={key.customerId} readOnly disabled className={locked} />
            </label>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Name and project must be 2–80 characters.</p>}
            <div className="flex gap-2 pt-2">
              <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
              <a href={`/admin/keys/${key.id}`} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </a>
            </div>
          </form>
        ) : (
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Name">{key.name}</Field>
            <Field label="Email">{key.email}</Field>
            <Field label="Project">{key.project}</Field>
            <Field label="Plan"><span className="capitalize">{key.plan}</span></Field>
            <Field label="Customer ID"><span className="font-mono text-xs">{key.customerId}</span></Field>
            <Field label="Enabled">{key.isActive ? "Yes" : "No"}</Field>
            <Field label="Issued">{fmtDate(key.issuedAt)}</Field>
            <Field label="Expires">{fmtDate(key.expiresAt)}</Field>
            <Field label="Generated from IP">{key.ip || "—"}</Field>
            <Field label="Last online check">{key.lastCheckedAt ? new Date(key.lastCheckedAt).toLocaleString("en-IN") : "Never"}</Field>
            <Field label="Last renewed">{key.renewedAt ? fmtDate(key.renewedAt) : "—"}</Field>
            <Field label="Last edited">{key.updatedAt ? fmtDate(key.updatedAt) : "—"}</Field>
          </dl>
        )}
      </div>
    </main>
  );
}
