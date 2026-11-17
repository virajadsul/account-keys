import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CodeBlock } from "@/components/CodeBlock";
import { getUserSession } from "@/lib/userAuth";

const PKG = process.env.NEXT_PUBLIC_PACKAGE_NAME || "@virajadsul/accounting";

// A worked example: every figure adds up, the way the module's own trial balance does.
const TRIAL_BALANCE = [
  ["LG0001", "Cash", "Current Assets", "48,500.00", ""],
  ["LG0002", "Bank", "Current Assets", "1,26,000.00", ""],
  ["LG0013", "Rahul Traders", "Accounts Receivable", "36,000.00", ""],
  ["LG0003", "Owner Capital", "Capital", "", "2,00,000.00"],
  ["LG0005", "Sales Income", "Income", "", "85,000.00"],
  ["LG0007", "Rent", "Expenses", "25,000.00", ""],
  ["LG0008", "Salary", "Expenses", "49,500.00", ""],
];

const INCLUDED = [
  {
    heading: "Books",
    items: ["Companies and financial years", "Chart of accounts, set up with standard groups", "Ledgers with opening balances", "Each company's books kept separate"],
  },
  {
    heading: "Vouchers",
    items: ["Payment, receipt, contra, sales and purchase", "Manual journal entries", "Cancel by reversal: posted history is never edited", "Gap-free voucher numbers per year"],
  },
  {
    heading: "Reports",
    items: ["Trial balance, profit & loss, balance sheet", "Ledger statement and cash book", "Dashboard with cash, bank, receivables, payables", "PDF and Excel export"],
  },
  {
    heading: "Controls",
    items: ["Debits must equal credits, or nothing is saved", "Year-end close with balances carried forward", "Audit log of every posting and change", "Runs on MongoDB, MySQL or PostgreSQL"],
  },
];

const SETUP = `# MongoDB. MySQL: knex mysql2 · PostgreSQL: knex pg
npm install ${PKG} mongoose

# asks for your database URL and API key
npx accounting init`;

const MOUNT = `import { createAccounting } from "${PKG}";

const accounting = await createAccounting();
app.use("/accounting", requireLogin, accounting.ui());`;

const FAQ = [
  {
    q: "Where is the accounting data stored?",
    a: "In your own database. The package creates its own tables or collections there, all prefixed acc_, next to your app's data. We never receive it.",
  },
  {
    q: "What does the package send to Accounting Keys?",
    a: "Only your API key, once at startup and then once a day, to confirm it's still active. No accounting data, no customer data.",
  },
  {
    q: "What happens if your server is down?",
    a: "Accounting keeps working for 7 days on the last successful check, so an outage on our side never stops your app.",
  },
  {
    q: "Do I need to build the screens myself?",
    a: "No. The package serves the full accounting UI from your backend. If you'd rather build your own, mount only the REST API.",
  },
];

function TrialBalanceCard() {
  return (
    <figure className="overflow-hidden rounded-card border border-stone-300 bg-white shadow-card">
      <div className="flex items-baseline justify-between border-b border-stone-200 px-5 py-3">
        <figcaption className="font-serif text-base font-semibold">Trial Balance</figcaption>
        <span className="text-xs text-stone-500">Demo Traders · FY 2026-27</span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-stone-200 text-left text-[11px] uppercase tracking-wider text-stone-500">
            <th className="py-2 pl-5 font-medium">Account</th>
            <th className="hidden py-2 font-medium sm:table-cell">Group</th>
            <th className="py-2 text-right font-medium">Debit</th>
            <th className="py-2 pr-5 text-right font-medium">Credit</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {TRIAL_BALANCE.map(([code, account, group, dr, cr]) => (
            <tr key={code} className="border-b border-stone-100">
              <td className="py-1.5 pl-5 font-sans text-stone-800">{account}</td>
              <td className="hidden py-1.5 font-sans text-stone-500 sm:table-cell">{group}</td>
              <td className="py-1.5 text-right text-stone-800">{dr}</td>
              <td className="py-1.5 pr-5 text-right text-stone-800">{cr}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-mono tabular-nums">
          <tr className="border-t-2 border-double border-stone-400 font-medium">
            <td className="py-2 pl-5 font-sans">Total</td>
            <td className="hidden sm:table-cell" />
            <td className="py-2 text-right">2,85,000.00</td>
            <td className="py-2 pr-5 text-right">2,85,000.00</td>
          </tr>
        </tfoot>
      </table>
    </figure>
  );
}

export default async function Home() {
  const session = await getUserSession();

  return (
    <div className="min-h-screen">
      <SiteHeader signedIn={Boolean(session)} />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1fr_minmax(0,500px)] lg:items-center lg:pt-24">
          <div>
            <p className="text-sm font-medium text-brand-800">For teams building on Node.js</p>
            <h1 className="mt-3 font-serif text-[40px] font-semibold leading-[1.08] tracking-tight text-stone-900 sm:text-[52px]">
              The accounting module you were about to build.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
              Ledgers, vouchers, journal entries and financial reports for your app, as one npm package. The backend and
              the screens are included, and every entry is stored in your own database.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={session ? "/dashboard" : "/signup"} className="btn-primary px-5 py-2.5">
                {session ? "Go to your dashboard" : "Create a free account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/docs" className="btn-secondary px-5 py-2.5">
                Read the setup guide
              </Link>
            </div>
            <p className="mt-6 text-sm text-stone-500">Free plan · MongoDB, MySQL or PostgreSQL · Express 4 or 5 · JavaScript or TypeScript</p>
          </div>
          <TrialBalanceCard />
        </section>

        {/* What's included */}
        <section id="included" className="scroll-mt-16 border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">What's in the package</h2>
              <p className="mt-3 text-stone-600">
                The parts of accounting that take months to get right are already done and tested: balancing, reversals,
                numbering and the year-end close.
              </p>
            </div>
            <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {INCLUDED.map((group) => (
                <div key={group.heading}>
                  <h3 className="border-b border-stone-900 pb-2 text-sm font-semibold uppercase tracking-wider text-stone-900">{group.heading}</h3>
                  <ul className="divide-y divide-stone-200">
                    {group.items.map((item) => (
                      <li key={item} className="py-2.5 text-[15px] text-stone-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why */}
        <section className="border-t border-stone-200">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-3">
            <div>
              <h3 className="font-serif text-xl font-semibold">Skip the hard parts</h3>
              <p className="mt-3 leading-relaxed text-stone-600">
                Double-entry rules, reversals instead of edits, and closing a financial year are where home-grown
                accounting goes wrong. They're built in.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold">Keep your data</h3>
              <p className="mt-3 leading-relaxed text-stone-600">
                Entries live in your database, beside your own tables. Back them up, query them and move them like
                anything else you own.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold">Fits your app</h3>
              <p className="mt-3 leading-relaxed text-stone-600">
                It mounts as Express middleware behind your existing login, and each of your customers sees only their
                own company's books.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-10 grid gap-10 lg:grid-cols-3">
              <li>
                <p className="font-mono text-sm text-brand-800">01</p>
                <h3 className="mt-2 text-lg font-semibold">Create an API key</h3>
                <p className="mt-2 text-stone-600">
                  Sign up, open your dashboard and create a key. It's shown once, so copy it into your backend's{" "}
                  <code className="font-mono text-[13px]">.env</code>.
                </p>
              </li>
              <li>
                <p className="font-mono text-sm text-brand-800">02</p>
                <h3 className="mt-2 text-lg font-semibold">Install and connect</h3>
                <p className="mt-2 text-stone-600">Install the package and run the setup. It checks your database and key, then creates the tables.</p>
              </li>
              <li>
                <p className="font-mono text-sm text-brand-800">03</p>
                <h3 className="mt-2 text-lg font-semibold">Mount it</h3>
                <p className="mt-2 text-stone-600">
                  One line in your server. Open <code className="font-mono text-[13px]">/accounting</code> and the whole
                  module is there.
                </p>
              </li>
            </ol>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <CodeBlock title="terminal" code={SETUP} />
              <CodeBlock title="server.js" code={MOUNT} />
            </div>
            <p className="mt-6 text-sm text-stone-600">
              The full walk-through, including multi-tenant setup, is in the{" "}
              <Link href="/docs" className="font-medium text-stone-900 underline underline-offset-4">
                setup guide
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-t border-stone-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Pricing</h2>
            <div className="mt-10 max-w-md rounded-card border border-stone-300 bg-white p-7 shadow-card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">Free</h3>
                <p className="font-serif text-3xl font-semibold">₹0</p>
              </div>
              <ul className="mt-6 space-y-3 text-[15px] text-stone-700">
                {["The complete accounting module", "Backend, REST API and screens", "Up to 5 API keys", "Keys that don't expire"].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={session ? "/dashboard" : "/signup"} className="btn-primary mt-8 w-full py-2.5">
                {session ? "Go to your dashboard" : "Create a free account"}
              </Link>
            </div>
            <p className="mt-4 text-sm text-stone-500">Paid plans are on the way.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Questions</h2>
            <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <dt className="font-semibold text-stone-900">{q}</dt>
                  <dd className="mt-2 leading-relaxed text-stone-600">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
