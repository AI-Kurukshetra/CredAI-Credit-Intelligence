import Link from "next/link";

export function ProductLogo({
  href = "/",
  size = "default",
  tone = "dark",
}: {
  href?: string;
  size?: "default" | "compact";
  tone?: "dark" | "light";
}) {
  const compact = size === "compact";
  const isLight = tone === "light";

  return (
    <Link className="inline-flex items-center gap-3" href={href}>
      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-900/20 bg-[linear-gradient(135deg,#020617_0%,#0f172a_52%,#2563eb_100%)] shadow-[0_16px_34px_rgba(15,23,42,0.22)]">
        <span className="absolute inset-[1px] rounded-[15px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_48%),linear-gradient(160deg,rgba(255,255,255,0.16),rgba(15,23,42,0.16))]" />
        <svg
          aria-hidden="true"
          className="relative h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 14.5 9.25 10l3 2.75L19 6.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="M18.75 6.5H15.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
          <path
            d="M18.75 6.5V9.75"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] ${
            isLight ? "bg-white/8 text-sky-200 ring-1 ring-white/12" : "bg-white text-slate-700"
          }`}
        >
          Credit Decisioning
        </span>
        <span
          className={`mt-2 block truncate font-semibold tracking-tight ${
            isLight ? "text-white" : "text-slate-950"
          } ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          CredAI
        </span>
      </span>
    </Link>
  );
}
