// A ledger page: margin rule plus ruled lines. Drawn, not an icon-library glyph.
export function Wordmark({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="20" height="20" rx="3" fill="#1c1917" />
        <path d="M7 4v14" stroke="#5eead4" strokeWidth="1.5" />
        <path d="M9.5 8h8M9.5 11.5h8M9.5 15h5" stroke="#faf8f4" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="whitespace-nowrap font-serif text-[17px] font-semibold tracking-tight text-stone-900">Accounting Keys</span>
    </span>
  );
}
