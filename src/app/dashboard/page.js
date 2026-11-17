import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/site/Wordmark";
import { CodeBlock } from "@/components/CodeBlock";
import { KeysPanel } from "@/components/dashboard/KeysPanel";
import { currentUser } from "@/lib/userAuth";
import { listKeys } from "@/lib/apiKeys";
import { maxKeysFor, planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Accounting Keys", robots: { index: false } };

const PKG = process.env.NEXT_PUBLIC_PACKAGE_NAME || "@virajadsul/accounting";
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function Header({ name }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="Accounting Keys home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/docs" className="text-stone-600 hover:text-stone-900">
            Docs
          </Link>
          {name && <span className="hidden text-stone-500 sm:inline">{name}</span>}
          <form action="/api/auth/logout" method="post">
            <button className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default async function DashboardPage() {
  const { session, user } = await currentUser();
  // Access token missing or expired: try the refresh token, then come back here.
  if (!session || !user) redirect("/api/auth/refresh?next=%2Fdashboard");

  if (user.isActive === false) {
    return (
      <div className="min-h-screen">
        <Header name={user.name} />
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h1 className="font-serif text-3xl font-semibold">Account deactivated</h1>
          <p className="mt-3 max-w-xl text-stone-600">
            This account has been deactivated, so its API keys don't work and new keys can't be created. Please contact
            the Accounting Keys team.
          </p>
        </main>
      </div>
    );
  }

  const keys = await listKeys(user._id);
  const limit = maxKeysFor(user.plan);

  return (
    <div className="min-h-screen">
      <Header name={user.name} />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          A key lets the accounting package run in your app. Name each key after where it's used, and delete it when that
          server is retired.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          {keys.length} of {limit} keys used
        </p>

        <section className="mt-8">
          <KeysPanel keys={keys} limit={limit} />
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-semibold">Use your key</h2>
          <p className="mt-1 text-sm text-stone-600">
            In your backend. The{" "}
            <Link href="/docs" className="font-medium text-stone-900 underline underline-offset-4">
              setup guide
            </Link>{" "}
            covers the rest.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CodeBlock title="terminal" code={`npm install ${PKG}\nnpx accounting init`} />
            <CodeBlock title=".env" code={"ACCOUNTING_LICENSE_KEY=acc_live_…"} />
          </div>
        </section>

        <section className="mt-14 border-t border-stone-200 pt-8">
          <h2 className="text-lg font-semibold">Account</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-stone-500">Name</dt>
            <dd>{user.name}</dd>
            <dt className="text-stone-500">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-stone-500">Phone</dt>
            <dd>{user.phone}</dd>
            <dt className="text-stone-500">Plan</dt>
            <dd>{planLabel(user.plan)}</dd>
            <dt className="text-stone-500">Member since</dt>
            <dd>{fmt(user.createdAt)}</dd>
          </dl>
        </section>
      </main>
    </div>
  );
}
