import { ExternalLink, Info, ShieldCheck } from "lucide-react";
import { KeyGenerator } from "@/components/KeyGenerator";
import { KeyProvider, EnvBlock } from "@/components/KeyContext";
import { CodeBlock } from "@/components/CodeBlock";

const PKG = process.env.NEXT_PUBLIC_PACKAGE_NAME || "@virajadsul/accounting";
const NPM_URL = `https://www.npmjs.com/package/${PKG}`;

const INIT_CODE = `// accounting.js — next to where you connect MongoDB
import mongoose from "mongoose";
import { createAccounting } from "${PKG}";

export let accounting;

export async function initAccounting() {
  accounting = await createAccounting({
    connection: mongoose.connection,                 // your existing connection
    licenseKey: process.env.ACCOUNTING_LICENSE_KEY,
  });
}`;

const SERVER_CODE = `// server.js — your existing imports and app setup stay as they are
import { initAccounting, accounting } from "./accounting.js";

await mongoose.connect(process.env.MONGO_URI);   // 1. your DB first
await initAccounting();                          // 2. then accounting

// 3. mount it (before your 404 / error handlers)
app.use("/accounting", requireLogin, accounting.ui());

app.listen(5000);`;

const SAAS_CODE = `// When a customer signs up: create their books once, save the id
const { company } = await accounting.companies.create({
  name: business.name,
  financialYearLabel: "2026-27",
  financialYearStart: "2026-04-01",
  financialYearEnd: "2027-03-31",
});
business.accountingCompanyId = company._id;
await business.save();

// Mount with resolveContext: each user only ever sees their own company
app.use("/accounting", requireLogin, accounting.ui({
  resolveContext: (req) => ({
    companyId: req.user.accountingCompanyId,
    userId: req.user.id,
  }),
  brandName: "Acme Books",       // optional branding
  primaryColor: "#4f46e5",
  loginUrl: "/login",            // where "Sign in again" goes
}));`;

const CODE_USAGE = `import { rupeesToPaise } from "${PKG}";

// e.g. when an invoice is paid in your app
await accounting.vouchers.receipt(companyId, {
  financialYear: financialYearId,
  date: new Date(),
  receivedIntoLedger: bankLedgerId,
  receivedFromLedger: customerLedgerId,
  amount: rupeesToPaise(1500),     // amounts are in paise
  narration: "Invoice INV-1042 paid",
});

const pnl = await accounting.reports.profitAndLoss(companyId, financialYearId);`;

const TROUBLESHOOTING = [
  {
    problem: "Cannot find package / npm 404",
    fix: "Install inside your backend folder (the one with your server's package.json), not the project root.",
  },
  {
    problem: "LicenseError: Missing accounting license key",
    fix: "The key isn't reaching createAccounting(). Check the .env line, and if you have an env/config file, add ACCOUNTING_LICENSE_KEY to it too.",
  },
  {
    problem: "Route not found: GET /accounting",
    fix: "app.use(\"/accounting\", …) is missing, or it's placed after your 404 handler. Mount it before.",
  },
  {
    problem: "\"Authentication token missing\" / \"Your session has expired\"",
    fix: "Your own login middleware is blocking the request. Log in to your app in the same browser, then reload /accounting.",
  },
  {
    problem: "Your project uses require() (CommonJS)",
    fix: `The package is an ES module. Load it with: const { createAccounting } = await import("${PKG}");`,
  },
];

function Step({ n, title, children }) {
  return (
    <li className="relative pl-12">
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
        {n}
      </span>
      <h3 className="pt-1 text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </li>
  );
}

function Note({ children }) {
  return (
    <div className="flex gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Code({ children }) {
  return <code className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[13px] text-slate-800">{children}</code>;
}

function Section({ id, title, intro, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-200 py-14">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-slate-600">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <KeyProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <a href="#" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Accounting Keys
            </a>
            <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
              <a href="#setup" className="hover:text-slate-900">Setup</a>
              <a href="#saas" className="hidden hover:text-slate-900 sm:inline">Going live</a>
              <a href="#help" className="hidden hover:text-slate-900 sm:inline">Help</a>
              <a href={NPM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-slate-900">
                npm <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Hero */}
          <section className="grid gap-10 py-14 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="lg:pt-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-[44px] sm:leading-[1.1]">
                A complete accounting module for your Node.js app.
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                One npm package gives your project the full backend <em>and</em> the screens: ledgers, vouchers,
                journal entries and financial reports. Data is stored in your own MongoDB.
              </p>
              <div className="mt-6 text-sm text-slate-600">
                <p className="font-medium text-slate-800">Works with</p>
                <p className="mt-1">Node.js 18.17+ · Express 4 or 5 · MongoDB with Mongoose 8 or 9 · JavaScript or TypeScript</p>
              </div>
              <ol className="mt-8 space-y-2 text-sm text-slate-700">
                <li><span className="font-semibold text-brand-700">1.</span> Generate a free API key here.</li>
                <li><span className="font-semibold text-brand-700">2.</span> Follow the setup below (about 5 minutes).</li>
                <li><span className="font-semibold text-brand-700">3.</span> Open <Code>/accounting</Code> in your app.</li>
              </ol>
            </div>
            <KeyGenerator />
          </section>

          {/* Setup */}
          <Section id="setup" title="Setup" intro="Do these steps in your backend project, the folder that contains your server's package.json.">
            <ol className="space-y-10">
              <Step n={1} title="Install the package">
                <CodeBlock title="Terminal (in your backend folder)" code={`npm install ${PKG}`} />
                <p>It needs <Code>express</Code> and <Code>mongoose</Code>, which your project most likely already has.</p>
              </Step>

              <Step n={2} title="Add your key to .env">
                <EnvBlock title=".env" />
                <p>
                  Keep the key on the server only. Never put it in frontend code. If your project reads env vars through a
                  config file (e.g. <Code>env.ts</Code>), add <Code>ACCOUNTING_LICENSE_KEY</Code> there too.
                </p>
              </Step>

              <Step n={3} title="Create the accounting instance">
                <p>Add a small file next to where you connect to MongoDB:</p>
                <CodeBlock title="accounting.js" code={INIT_CODE} />
              </Step>

              <Step n={4} title="Start it and mount it in your server">
                <CodeBlock title="server.js" code={SERVER_CODE} />
                <ul className="list-disc space-y-1 pl-5">
                  <li>Connect MongoDB <strong>before</strong> calling <Code>initAccounting()</Code>.</li>
                  <li>Replace <Code>requireLogin</Code> with your own auth middleware, so only signed-in users can open it.</li>
                  <li>Mount it <strong>before</strong> your 404 and error handlers.</li>
                </ul>
              </Step>

              <Step n={5} title="Run your app and open /accounting">
                <p>
                  Start your server. You should see it start normally, and if the key is missing or invalid it stops
                  with a clear message. Then, signed in to your app, open:
                </p>
                <CodeBlock title="Browser" code="http://localhost:5000/accounting" />
                <p>
                  Create your first company under <strong>Settings → Company</strong>. The package creates its own collections
                  in your database (<Code>acc_companies</Code>, <Code>acc_ledgers</Code>, …) and never touches yours.
                </p>
              </Step>
            </ol>
            <div className="mt-10">
              <Note>
                <strong>TypeScript:</strong> types are included, nothing extra to install. Only need the API, with your own
                screens? Use <Code>app.use(&quot;/api/accounting&quot;, requireLogin, accounting.router())</Code> instead of{" "}
                <Code>ui()</Code>.
              </Note>
            </div>
          </Section>

          {/* SaaS */}
          <Section
            id="saas"
            title="Going live in a SaaS"
            intro="With the basic setup, any signed-in user can open every company's books. Before real customers use it, give each customer their own company and lock users to it."
          >
            <CodeBlock title="accounting.js" code={SAAS_CODE} />
            <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
              <li>With <Code>resolveContext</Code>, the company always comes from your session. Anything sent by the browser is ignored.</li>
              <li>Users see only their own company, and creating companies from the screens is turned off.</li>
              <li>Keys are valid for one year. Generate a new one here before it expires; the app shows a clear message if it does.</li>
            </ul>
          </Section>

          {/* From code */}
          <Section
            id="code"
            title="Post entries from your own code"
            intro="Every screen action is also a function, so your app can record accounting entries automatically, for example when an invoice is paid."
          >
            <CodeBlock title="anywhere in your backend" code={CODE_USAGE} />
            <p className="mt-4 text-sm text-slate-600">
              Also available: <Code>vouchers.payment / sale / purchase / contra</Code>, <Code>journal.create</Code>,{" "}
              <Code>ledgers.create</Code>, <Code>reports.trialBalance / balanceSheet</Code>. See the README on{" "}
              <a href={NPM_URL} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">npm</a> for the full list.
            </p>
          </Section>

          {/* Troubleshooting */}
          <Section id="help" title="Troubleshooting">
            <div className="divide-y divide-slate-200 overflow-hidden rounded-card border border-slate-200 bg-white">
              {TROUBLESHOOTING.map(({ problem, fix }) => (
                <div key={problem} className="grid gap-1 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                  <p className="text-sm font-medium text-slate-900">{problem}</p>
                  <p className="text-sm text-slate-600">{fix}</p>
                </div>
              ))}
            </div>
          </Section>
        </main>

        <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
          Accounting Keys · <a href={NPM_URL} target="_blank" rel="noreferrer" className="hover:text-slate-700">{PKG}</a>
        </footer>
      </div>
    </KeyProvider>
  );
}
