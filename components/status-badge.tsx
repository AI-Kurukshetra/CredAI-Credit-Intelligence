import {
  ApplicationStatus,
  Recommendation,
  UnderwriterAction,
} from "@/lib/domain";

interface StatusBadgeProps {
  tone: ApplicationStatus | Recommendation | UnderwriterAction;
}

const styles: Record<StatusBadgeProps["tone"], string> = {
  submitted: "bg-white text-slate-700",
  scored: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
  approve: "bg-emerald-100 text-emerald-800",
  decline: "bg-rose-100 text-rose-800",
  request_information: "bg-violet-100 text-violet-800",
};

export function StatusBadge({ tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles[tone]}`}
    >
      {tone.replace("_", " ")}
    </span>
  );
}
