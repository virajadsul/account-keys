import { CopyButton } from "./CopyButton";

export function CodeBlock({ title, code }) {
  return (
    <div className="overflow-hidden rounded-card bg-slate-900 shadow-card">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
