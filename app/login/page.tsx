import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_40%,#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-amber-100 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm uppercase tracking-[0.18em] text-amber-700">
            Authentication
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            Sign in to the underwriting MVP.
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>Borrowers can sign up, submit applications, and view their own decisions.</p>
            <p>Lenders sign in to access the dashboard, queue, detail pages, and manual review actions.</p>
            <p>The role model for this MVP is intentionally simple: `borrower` and `lender`.</p>
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
