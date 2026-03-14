import { LoginForm } from "@/components/login-form";
import { ProductLogo } from "@/components/product-logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <ProductLogo href="/login" />
        <span className="rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[var(--shadow)]">
          Borrower and lender access
        </span>
      </div>
      <div className="mx-auto mt-6 grid max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[40px] border border-amber-100 bg-white p-8 shadow-[var(--shadow)]">
          <div className="relative">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-700">
              Authentication
            </p>
            <h1 className="mt-3 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950">
              Sign in to the underwriting workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500">
              Borrowers can create accounts, complete a structured loan request,
              and track outcomes. Lenders use the same secure access point to
              work the queue, review documents, and finalize decisions.
            </p>

            <div className="mt-8 grid gap-4">
              <FeatureCard
                eyebrow="Portal"
                title="Guided intake"
                description="Multi-step borrower application with document capture and progress tracking."
              />
              <FeatureCard
                eyebrow="Decisioning"
                title="Model-backed review"
                description="Scoring, lender review, and explainable reasons in one flow."
              />
              <FeatureCard
                eyebrow="Operations"
                title="Clear roles"
                description="Borrowers submit and track requests. Lenders work the queue and final decisions."
              />
            </div>
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}

function FeatureCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-lg font-semibold text-slate-950">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </article>
  );
}
