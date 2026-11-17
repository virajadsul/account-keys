import Link from "next/link";
import { Wordmark } from "@/components/site/Wordmark";

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Accounting Keys home">
          <Wordmark />
        </Link>
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-[400px]">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-stone-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-sm text-stone-600">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
