// Display helpers shared by the admin list and the key detail page.
import clsx from "clsx";
import { Power } from "lucide-react";
import { toggleKeyActive } from "./actions";

const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  expiring: "bg-amber-50 text-amber-800 ring-amber-200",
  expired: "bg-rose-50 text-rose-700 ring-rose-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-300",
};
const STATUS_LABEL = { active: "Active", expiring: "Expiring soon", expired: "Expired", inactive: "Inactive" };

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never";

export function StatusBadge({ status }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ActiveToggle({ row }) {
  return (
    <form action={toggleKeyActive}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="active" value={String(!row.isActive)} />
      <button
        className={clsx(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1",
          row.isActive ? "text-rose-700 ring-rose-200 hover:bg-rose-50" : "text-emerald-700 ring-emerald-200 hover:bg-emerald-50"
        )}
      >
        <Power className="h-3.5 w-3.5" />
        {row.isActive ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}
