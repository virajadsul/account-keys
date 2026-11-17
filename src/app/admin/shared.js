// Pieces shared by the admin pages.
import Link from "next/link";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/site/Wordmark";

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function lastUsed(iso) {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return fmtDate(iso);
}

const STATUS = {
  active: ["Active", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  deactivated: ["Deactivated", "bg-rose-50 text-rose-700 ring-rose-200"],
  deleted: ["Deleted by user", "bg-stone-100 text-stone-500 ring-stone-200"],
};

export function StatusBadge({ status }) {
  const [label, style] = STATUS[status];
  return <span className={clsx("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1", style)}>{label}</span>;
}

export function AdminHeader({ session }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/admin" className="flex items-center gap-3">
          <Wordmark />
          <span className="rounded bg-stone-900 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">Admin</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-stone-500 sm:inline">
            {session.name} · {session.email}
          </span>
          <form action="/api/admin/logout" method="post">
            <button className="inline-flex items-center gap-1.5 font-medium text-stone-600 hover:text-stone-900">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
