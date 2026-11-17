import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CodeBlock } from "@/components/CodeBlock";
import { getUserSession } from "@/lib/userAuth";

export const metadata = { title: "Setup guide · Accounting Keys" };

const PKG = process.env.NEXT_PUBLIC_PACKAGE_NAME || "@virajadsul/accounting";

const INSTALL = `npm install ${PKG} mongoose     # MongoDB
npm install ${PKG} knex mysql2   # MySQL
npm install ${PKG} knex pg       # PostgreSQL`;

const ENV = `# .env (your backend)
ACCOUNTING_DATABASE_URL=mongodb+srv://user:pass@cluster/mydb   # or mysql://… or postgres://…
ACCOUNTING_LICENSE_KEY=acc_live_…`;

const MOUNT = `import express from "express";
import { createAccounting } from "${PKG}";

const app = express();
const accounting = await createAccounting();   // reads the two .env values

// Your own login first, and before your 404 / error handlers
app.use("/accounting", requireLogin, accounting.ui());

app.listen(5000);`;

const SAAS = `// When one of your customers signs up: create their books once, save the id
const { company } = await accounting.companies.create({
  name: business.name,
  financialYearLabel: "2026-27",
  financialYearStart: "2026-04-01",
  financialYearEnd: "2027-03-31",
});
business.accountingCompanyId = company._id;
await business.save();

// Each signed-in user only ever sees their own company's books
app.use("/accounting", requireLogin, accounting.ui({
  resolveContext: (req) => ({ companyId: req.user.accountingCompanyId, userId: req.user.id }),
  brandName: "Acme Books",
  loginUrl: "/login",
}));`;

const PROBLEMS = [
  ["Malformed accounting license key", "Copy the whole key. It starts with acc_live_ and is 52 characters long."],
  ["…key doesn't exist or was deleted", "The key was deleted, or there's a typo. Create a new key in your dashboard."],
  ["Accounting license key deactivated", "The key or the account was deactivated. Contact us."],
  ["…could not be verified online", "Your server can't reach Accounting Keys over HTTPS, and the 7-day grace period has run out. Allow outbound HTTPS."],
  ["Route not found: GET /accounting", "app.use(\"/accounting\", …) is missing, or comes after your 404 handler."],
  ["Your project uses require()", `The package is an ES module. Load it with: const { createAccounting } = await import("${PKG}");`],
];

function Step({ n, title, children }) {
  return (
    <li className="grid gap-4 border-t border-stone-200 pt-8 md:grid-cols-[200px_1fr]">
      <div>
        <p className="font-mono text-sm text-brand-800">{String(n).padStart(2, "0")}</p>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      </div>
      <div className="min-w-0 space-y-3 leading-relaxed text-stone-700">{children}</div>
    </li>
  );
}

const C = ({ children }) => <code className="rounded bg-stone-200/60 px-1.5 py-0.5 font-mono text-[13px] text-stone-800">{children}</code>;

export default async function DocsPage() {
  const signedIn = Boolean(await getUserSession());
  return (
    <div className="min-h-screen">
      <SiteHeader signedIn={signedIn} />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Setup guide</h1>
        <p className="mt-3 max-w-2xl text-lg text-stone-600">
          About ten minutes, in your backend project: the folder with your server's <C>package.json</C>. You need Node.js
          18.17+, Express 4 or 5, and a MongoDB, MySQL or PostgreSQL database.
        </p>

        <ol className="mt-12 space-y-10">
          <Step n={1} title="Create an API key">
            <p>
              <Link href={signedIn ? "/dashboard" : "/signup"} className="font-medium text-stone-900 underline underline-offset-4">
                {signedIn ? "Open your dashboard" : "Create an account"}
              </Link>{" "}
              and create a key. It's shown once, so copy it straight away. Name it after the server that will use it.
            </p>
          </Step>
          <Step n={2} title="Install the package">
            <CodeBlock title="terminal" code={INSTALL} />
          </Step>
          <Step n={3} title="Run the setup">
            <CodeBlock title="terminal" code="npx accounting init" />
            <p>
              It asks for your database URL and your key, checks both, creates the accounting tables and saves two lines
              to your <C>.env</C>:
            </p>
            <CodeBlock title=".env" code={ENV} />
            <p>Keep the key on the server. Never put it in frontend code.</p>
          </Step>
          <Step n={4} title="Mount it in your server">
            <CodeBlock title="server.js" code={MOUNT} />
            <p>
              Replace <C>requireLogin</C> with your own auth middleware, so only signed-in users can open accounting.
            </p>
          </Step>
          <Step n={5} title="Open /accounting">
            <p>
              Start your server and open <C>http://localhost:5000/accounting</C> while signed in to your app. Create your
              first company under Settings → Company. The package's tables (all prefixed <C>acc_</C>) sit beside yours and
              never touch them.
            </p>
          </Step>
        </ol>

        <section className="mt-20">
          <h2 className="font-serif text-2xl font-semibold">Going live in a SaaS</h2>
          <p className="mt-2 max-w-2xl text-stone-600">
            With the basic setup, any signed-in user can open every company's books. Before real customers use it, give
            each customer their own company and lock users to it:
          </p>
          <div className="mt-5">
            <CodeBlock title="server.js" code={SAAS} />
          </div>
        </section>

        <section className="mt-20">
          <h2 className="font-serif text-2xl font-semibold">How the key is checked</h2>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-stone-700">
            <li>When your server starts, and then once a day, the package sends your key to Accounting Keys over HTTPS. Nothing else is sent.</li>
            <li>A deleted or deactivated key stops accounting at the next check. The rest of your app keeps running.</li>
            <li>If Accounting Keys can't be reached, accounting keeps working for 7 days on the last successful check.</li>
            <li>Keys on the Free plan don't expire.</li>
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="font-serif text-2xl font-semibold">Troubleshooting</h2>
          <div className="mt-5 divide-y divide-stone-200 overflow-hidden rounded-card border border-stone-200 bg-white">
            {PROBLEMS.map(([problem, fix]) => (
              <div key={problem} className="grid gap-1 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                <p className="text-sm font-medium text-stone-900">{problem}</p>
                <p className="text-sm text-stone-600">{fix}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
