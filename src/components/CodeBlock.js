import { CopyButton } from "./CopyButton";

export function CodeBlock({ title, code }) {
  return (
    <div className="overflow-hidden rounded-card bg-stone-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs text-stone-400">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-stone-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
