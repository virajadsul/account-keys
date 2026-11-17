import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Power } from "lucide-react";
import clsx from "clsx";
import { getAdminSession } from "@/lib/adminAuth";
import { adminUserDetail } from "@/lib/apiKeys";
import { PLANS } from "@/lib/plans";
import { setPlanAction, toggleAccountAction, toggleKeyAction } from "../../actions";
import { AdminHeader, StatusBadge, fmtDate, lastUsed } from "../../shared";

export const dynamic = "force-dynamic";

function ToggleButton({ on, children }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ring-1",
        on ? "text-rose-700 ring-rose-200 hover:bg-rose-50" : "text-emerald-700 ring-emerald-200 hover:bg-emerald-50"
      )}
    >
      <Power className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export default async function AdminUserPage({ params, searchParams }) {
  const { id } = await params;
  const planError = (await searchParams)?.error === "plan";
  const session = await getAdminSession();
  if (!session) redirect(`/api/admin/refresh?next=${encodeURIComponent(`/admin/users/${id}`)}`);

  const data = await adminUserDetail(id);
  if (!data) notFound();
  const { user, keys } = data;

  return (
    <div className="min-h-screen">
      <AdminHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" />
          All accounts
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold">{user.name}</h1>
            <p className="mt-1 text-sm text-stone-500">{user.email}</p>
          </div>
          <form action={toggleAccountAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="active" value={String(!user.isActive)} />
            <ToggleButton on={user.isActive}>{user.isActive ? "Deactivate account" : "Reactivate account"}</ToggleButton>
          </form>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="h-fit rounded-card border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-stone-500">Status</dt>
                <dd className="mt-0.5">
                  <StatusBadge status={user.isActive ? "active" : "deactivated"} />
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Phone</dt>
                <dd className="mt-0.5">{user.phone}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Joined</dt>
                <dd className="mt-0.5">{fmtDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Last login</dt>
                <dd className="mt-0.5">{lastUsed(user.lastLoginAt)}</dd>
              </div>
            </dl>
            <form action={setPlanAction} className="mt-5 border-t border-stone-200 pt-5">
              <input type="hidden" name="userId" value={user.id} />
              <label htmlFor="plan" className="label">
                Plan
              </label>
              <div className="flex gap-2">
                <select id="plan" name="plan" defaultValue={user.plan} className="input">
                  {Object.entries(PLANS).map(([value, p]) => (
                    <option key={value} value={value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary shrink-0">Save</button>
              </div>
              {planError && <p className="mt-2 text-sm text-rose-700">Unknown plan.</p>}
            </form>
            {!user.isActive && (
              <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                Deactivated: can't log in, and every key stops at its next daily check.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">API keys</h2>
            <div className="mt-3 overflow-x-auto rounded-card border border-stone-200 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Last check</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {keys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                        No keys created yet.
                      </td>
                    </tr>
                  ) : (
                    keys.map((k) => (
                      <tr key={k.id} className={k.deletedAt ? "text-stone-400" : ""}>
                        <td className="px-4 py-3 font-medium">{k.name}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px]">{k.preview}</td>
                        <td className="whitespace-nowrap px-4 py-3">{fmtDate(k.createdAt)}</td>
                        <td className="px-4 py-3">{lastUsed(k.lastUsedAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={k.deletedAt ? "deleted" : k.isActive ? "active" : "deactivated"} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!k.deletedAt && (
                            <form action={toggleKeyAction}>
                              <input type="hidden" name="userId" value={user.id} />
                              <input type="hidden" name="keyId" value={k.id} />
                              <input type="hidden" name="active" value={String(!k.isActive)} />
                              <ToggleButton on={k.isActive}>{k.isActive ? "Deactivate" : "Activate"}</ToggleButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-stone-500">Changes reach the customer's app at its next daily check (within 5 minutes once a key is reactivated).</p>
          </section>
        </div>
      </main>
    </div>
  );
}
