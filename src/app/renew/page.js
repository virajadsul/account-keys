import { CheckCircle2, RefreshCw } from "lucide-react";
import { submitRenewal } from "./actions";

export const metadata = { title: "Renew plan · Accounting Keys" };

const ERRORS = {
  missing: "Enter your customer ID and the email you used when you got the key.",
  nomatch: "We couldn't find a license with that customer ID and email. Check both, or contact us.",
  server: "Something went wrong on our side. Please try again in a few minutes.",
};

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

// Customers land here from the "Renew plan" button in the accounting app.
export default async function RenewPage({ searchParams }) {
  const { customer = "", sent, error } = (await searchParams) || {};

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-slate-200 bg-white p-7 shadow-card">
        {sent ? (
          <>
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            <h1 className="mt-3 text-lg font-semibold text-slate-900">Renewal request sent</h1>
            <p className="mt-2 text-sm text-slate-600">
              We'll contact you by email about payment. Once your plan is renewed, accounting unlocks by itself within
              5 minutes. You keep the same key, and nothing needs to change on your server.
            </p>
          </>
        ) : (
          <form action={submitRenewal}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <RefreshCw className="h-4 w-4" />
            </span>
            <h1 className="mt-3 text-lg font-semibold text-slate-900">Renew your accounting plan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Confirm your details and we'll get in touch to renew. Your key stays the same.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer ID</span>
                <input name="customer" defaultValue={customer} required placeholder="cus_..." className={`${input} font-mono`} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Email used for the key</span>
                <input name="email" type="email" required autoComplete="email" className={input} />
              </label>
            </div>
            {ERRORS[error] && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{ERRORS[error]}</p>}
            <button className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
              Request renewal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
