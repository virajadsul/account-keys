import Link from "next/link";
import { Wordmark } from "./Wordmark";

const PKG = process.env.NEXT_PUBLIC_PACKAGE_NAME || "@virajadsul/accounting";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/docs" className="hover:text-stone-800">Setup guide</Link>
          <a href={`https://www.npmjs.com/package/${PKG}`} target="_blank" rel="noreferrer" className="hover:text-stone-800">npm package</a>
          <Link href="/login" className="hover:text-stone-800">Log in</Link>
        </div>
      </div>
    </footer>
  );
}
