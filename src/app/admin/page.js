import { redirect } from "next/navigation";
import clsx from "clsx";
import { KeyRound, CalendarClock, CalendarX, CheckCircle2, Search, ShieldCheck, LogOut, CalendarPlus, PowerOff, Eye, Pencil } from "lucide-react";
import { getAdminSession } from "@/lib/adminAuth";
import { getDashboardData, EXPIRING_SOON_DAYS } from "@/lib/keysStore";
import { ActiveToggle, StatusBadge, fmtDate } from "./shared";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
  { value: "renewal", label: "Renewal requests" },
];

function Stat({ icon: Icon, label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={clsx("mt-2 text-2xl font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

function daysLeftText(row) {
  if (row.daysLeft === null) return "No expiry";
  if (row.daysLeft <= 0) return `Expired ${Math.abs(row.daysLeft)}d ago`;
  return `${row.daysLeft}d left`;
}

export default async function AdminDashboard({ searchParams }) {
  const params = await searchParams;
  const status = TABS.some((t) => t.value === params?.status) ? params.status : "all";
  const search = typeof params?.q === "string" ? params.q.slice(0, 100) : "";

  const session = await getAdminSession();
  if (!session) {
    // Access token missing or expired: try the refresh token, then come back here.
    const back = new URLSearchParams();
    if (status !== "all") back.set("status", status);
    if (search) back.set("q", search);
    const next = back.toString() ? `/admin?${back}` : "/admin";
    redirect(`/api/admin/refresh?next=${encodeURIComponent(next)}`);
  }

  let data;
  let loadError = null;
  try {
    data = await getDashboardData({ status, search });
  } catch (err) {
    console.error(err);
    loadError = "Could not load keys from the database. Check MONGODB_URI.";
  }

  const tabHref = (value) => {
    const qs = new URLSearchParams();
    if (value !== "all") qs.set("status", value);
    if (search) qs.set("q", search);
    const s = qs.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Accounting Keys · Admin
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {session.name} · {session.email}
            </span>
            <form action="/api/admin/logout" method="post">
              <button className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">License keys</h1>
        <p className="mt-1 text-sm text-slate-500">Everyone who generated a key, and when it expires.</p>

        {loadError ? (
          <p className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Stat icon={KeyRound} label="Total keys" value={data.stats.total} />
              <Stat icon={CheckCircle2} label="Active" value={data.stats.active} tone="text-emerald-700" />
              <Stat icon={CalendarClock} label={`Expiring ≤ ${EXPIRING_SOON_DAYS} days`} value={data.stats.expiring} tone="text-amber-700" />
              <Stat icon={CalendarX} label="Expired" value={data.stats.expired} tone="text-rose-700" />
              <Stat icon={PowerOff} label="Inactive" value={data.stats.inactive} tone="text-slate-500" />
              <Stat icon={CalendarPlus} label="Issued this month" value={data.stats.thisMonth} />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <nav className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm">
                {TABS.map((tab) => (
                  <a
                    key={tab.value}
                    href={tabHref(tab.value)}
                    className={clsx(
                      "rounded-md px-3 py-1.5 font-medium",
                      status === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {tab.label}
                  </a>
                ))}
              </nav>
              <form className="relative sm:w-72">
                {status !== "all" && <input type="hidden" name="status" value={status} />}
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={search}
                  placeholder="Search name, email, project…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </form>
            </div>

            <div className="mt-4 overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Issued</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8}className="px-4 py-12 text-center text-slate-500">
                        No keys match this view.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{row.name}</p>
                          <p className="text-xs text-slate-400">{row.customerId}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <a href={`mailto:${row.email}`} className="hover:underline">{row.email}</a>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.project}</td>
                        <td className="px-4 py-3 capitalize text-slate-700">{row.plan}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtDate(row.issuedAt)}</td>
                        <td className="px-4 py-3">
                          <p className="tabular-nums text-slate-700">{fmtDate(row.expiresAt)}</p>
                          <p className="text-xs text-slate-400">{daysLeftText(row)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                          {row.renewalRequestedAt && <p className="mt-1 text-xs font-medium text-amber-700">Renewal requested</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <a href={`/admin/keys/${row.id}`} title="View" className="rounded-md p-1.5 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900">
                              <Eye className="h-3.5 w-3.5" />
                              <span className="sr-only">View {row.name}</span>
                            </a>
                            <a href={`/admin/keys/${row.id}?edit=1`} title="Edit" className="rounded-md p-1.5 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900">
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit {row.name}</span>
                            </a>
                            <ActiveToggle row={row} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data.rows.length === 500 && <p className="mt-2 text-xs text-slate-500">Showing the latest 500. Use search to narrow down.</p>}
          </>
        )}
      </main>
    </div>
  );
}
