import { MetricSnapshot } from "@/lib/domain";

export function MetricCard({ label, value, trend }: MetricSnapshot) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm text-slate-600">{trend}</p>
    </article>
  );
}
