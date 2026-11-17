import Link from "next/link";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/#included", label: "What's included" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

/** `signedIn`: show Dashboard instead of Log in / Create account. */
export function SiteHeader({ signedIn = false }) {
  return (
    <header className="border-b border-stone-200 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="Accounting Keys home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-stone-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn whitespace-nowrap px-2 text-stone-700 hover:text-stone-900 sm:px-3">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary whitespace-nowrap">
                <span className="sm:hidden">Sign up</span>
                <span className="hidden sm:inline">Create account</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
