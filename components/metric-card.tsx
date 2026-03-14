import { MetricSnapshot } from "@/lib/domain";

export function MetricCard({ label, value, trend }: MetricSnapshot) {
  return (
    <article className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-[var(--shadow)]">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{trend}</p>
    </article>
  );
}
