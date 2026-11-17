import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getAdminSession } from "@/lib/adminAuth";
import { adminOverview } from "@/lib/apiKeys";
import { planLabel } from "@/lib/plans";
import { AdminHeader, StatusBadge, fmtDate, lastUsed } from "./shared";

export const dynamic = "force-dynamic";

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums text-stone-900">{value}</p>
    </div>
  );
}

export default async function AdminUsersPage({ searchParams }) {
  const q = (await searchParams)?.q;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const session = await getAdminSession();
  if (!session) {
    const next = search ? `/admin?q=${encodeURIComponent(search)}` : "/admin";
    redirect(`/api/admin/refresh?next=${encodeURIComponent(next)}`);
  }

  let data;
  let loadError = null;
  try {
    data = await adminOverview({ search });
  } catch (err) {
    console.error(err);
    loadError = "Could not load accounts from the database. Check MONGODB_URI.";
  }

  return (
    <div className="min-h-screen">
      <AdminHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-serif text-2xl font-semibold">Accounts</h1>
        <p className="mt-1 text-sm text-stone-500">Everyone who signed up, and their API keys.</p>

        {loadError ? (
          <p className="mt-6 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Accounts" value={data.stats.users} />
              <Stat label="New this month" value={data.stats.newThisMonth} />
              <Stat label="Live keys" value={data.stats.liveKeys} />
              <Stat label="Deactivated keys" value={data.stats.deactivatedKeys} />
              <Stat label="Deactivated accounts" value={data.stats.inactiveAccounts} />
            </div>

            <form className="relative mt-8 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input name="q" defaultValue={search} placeholder="Search name, email or phone" className="input pl-9" />
            </form>

            <div className="mt-4 overflow-x-auto rounded-card border border-stone-200 bg-white">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Keys</th>
                    <th className="px-4 py-3 font-medium">Last key check</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-stone-500">
                        {search ? "No accounts match this search." : "No accounts yet."}
                      </td>
                    </tr>
                  ) : (
                    data.users.map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${u.id}`} className="font-medium text-stone-900 hover:underline">
                            {u.name}
                          </Link>
                          <p className="text-xs text-stone-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-700">{u.phone}</td>
                        <td className="px-4 py-3 text-stone-700">{planLabel(u.plan)}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-stone-700">{u.keyCount}</td>
                        <td className="px-4 py-3 text-stone-700">{lastUsed(u.lastUsedAt)}</td>
                        <td className="px-4 py-3 text-stone-700">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.isActive ? "active" : "deactivated"} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data.users.length === 500 && <p className="mt-2 text-xs text-stone-500">Showing the latest 500. Search to narrow down.</p>}
          </>
        )}
      </main>
    </div>
  );
}
