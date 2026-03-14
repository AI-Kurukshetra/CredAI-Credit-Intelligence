"use client";

import { useState, useTransition } from "react";

import { ApplicationSubmissionResponse, LoanApplicationInput } from "@/lib/domain";
import { getAccessToken } from "@/lib/auth-client";
import { StatusBadge } from "@/components/status-badge";

const initialState: LoanApplicationInput = {
  borrower: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  },
  requestedAmount: 10000,
  annualIncome: 60000,
  existingMonthlyDebt: 1200,
  monthlyHousingPayment: 1400,
  employmentYears: 2,
  incomeConsistencyScore: 72,
  averageMonthlyBalance: 2500,
  rentOnTimeRate: 92,
  utilityOnTimeRate: 90,
  nsfEventsLast90Days: 0,
  hasGovernmentId: true,
  agreedToTerms: false,
};

interface ApplicationFormProps {
  onSubmitted?: () => Promise<void> | void;
}

export function ApplicationForm({ onSubmitted }: ApplicationFormProps) {
  const [form, setForm] = useState(initialState);
  const [result, setResult] = useState<ApplicationSubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof LoanApplicationInput>(
    key: K,
    value: LoanApplicationInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateBorrower = (
    key: keyof LoanApplicationInput["borrower"],
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      borrower: { ...current.borrower, [key]: value },
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setError("You must be logged in as a borrower to submit an application.");
        return;
      }

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Application scoring failed.");
        return;
      }

      const payload = (await response.json()) as ApplicationSubmissionResponse;

      if (files.length > 0) {
        const uploadData = new FormData();

        for (const file of files) {
          uploadData.append("files", file);
        }

        const uploadResponse = await fetch(
          `/api/applications/${payload.applicationId}/documents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: uploadData,
          },
        );

        if (!uploadResponse.ok) {
          const uploadPayload = (await uploadResponse.json()) as { error?: string };
          setError(uploadPayload.error ?? "Document upload failed.");
          return;
        }
      }

      setResult(payload);
      setFiles([]);
      await onSubmitted?.();
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
      <form
        className="space-y-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
        onSubmit={handleSubmit}
      >
        <section className="grid gap-4 md:grid-cols-2">
          <Field
            label="First name"
            value={form.borrower.firstName}
            onChange={(value) => updateBorrower("firstName", value)}
          />
          <Field
            label="Last name"
            value={form.borrower.lastName}
            onChange={(value) => updateBorrower("lastName", value)}
          />
          <Field
            label="Email"
            type="email"
            value={form.borrower.email}
            onChange={(value) => updateBorrower("email", value)}
          />
          <Field
            label="Phone"
            value={form.borrower.phone}
            onChange={(value) => updateBorrower("phone", value)}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field
            label="Requested amount"
            type="number"
            value={String(form.requestedAmount)}
            onChange={(value) => update("requestedAmount", Number(value))}
          />
          <Field
            label="Annual income"
            type="number"
            value={String(form.annualIncome)}
            onChange={(value) => update("annualIncome", Number(value))}
          />
          <Field
            label="Existing monthly debt"
            type="number"
            value={String(form.existingMonthlyDebt)}
            onChange={(value) => update("existingMonthlyDebt", Number(value))}
          />
          <Field
            label="Housing payment"
            type="number"
            value={String(form.monthlyHousingPayment)}
            onChange={(value) => update("monthlyHousingPayment", Number(value))}
          />
          <Field
            label="Employment years"
            type="number"
            value={String(form.employmentYears)}
            onChange={(value) => update("employmentYears", Number(value))}
          />
          <Field
            label="Income consistency score"
            type="number"
            value={String(form.incomeConsistencyScore)}
            onChange={(value) => update("incomeConsistencyScore", Number(value))}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field
            label="Average monthly balance"
            type="number"
            value={String(form.averageMonthlyBalance)}
            onChange={(value) => update("averageMonthlyBalance", Number(value))}
          />
          <Field
            label="Rent on-time rate"
            type="number"
            value={String(form.rentOnTimeRate)}
            onChange={(value) => update("rentOnTimeRate", Number(value))}
          />
          <Field
            label="Utility on-time rate"
            type="number"
            value={String(form.utilityOnTimeRate)}
            onChange={(value) => update("utilityOnTimeRate", Number(value))}
          />
          <Field
            label="NSF events (90 days)"
            type="number"
            value={String(form.nsfEventsLast90Days)}
            onChange={(value) => update("nsfEventsLast90Days", Number(value))}
          />
        </section>

        <section className="grid gap-3">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              checked={form.hasGovernmentId}
              className="h-4 w-4"
              onChange={(event) => update("hasGovernmentId", event.target.checked)}
              type="checkbox"
            />
            Borrower identity documents are available for verification
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              checked={form.agreedToTerms}
              className="h-4 w-4"
              onChange={(event) => update("agreedToTerms", event.target.checked)}
              type="checkbox"
            />
            Borrower consent, disclosures, and alternative-data permissions have been captured
          </label>
        </section>

        <section className="grid gap-2">
          <label className="text-sm font-medium text-slate-700">
            Supporting documents
          </label>
          <input
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            multiple
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []))
            }
            type="file"
          />
          <p className="text-xs text-slate-500">
            Upload income proof, bank statements, or identity documents for lender review.
          </p>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            This MVP flow captures borrower intake, alternative data inputs, and real-time scoring.
          </p>
          <button
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Scoring..." : "Submit Application"}
          </button>
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </form>

      <aside className="space-y-6 rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Decision Preview
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Primary credit model</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Weighted model using income, debt, cash-flow stability, and alternative payment behavior with policy thresholds layered on top.
          </p>
        </div>

        {result ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Application ID</p>
                <p className="mt-1 font-mono text-sm">{result.applicationId}</p>
              </div>
              <StatusBadge tone={result.scoring.recommendation} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Persistence
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {result.storageMode === "supabase"
                  ? "Saved to Supabase"
                  : "Simulation only"}
              </p>
            </div>

            {files.length === 0 ? null : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Documents
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {files.length} file(s) attached for upload with this application.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Score
                </p>
                <p className="mt-2 text-3xl font-semibold">{result.scoring.score}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Risk band
                </p>
                <p className="mt-2 text-3xl font-semibold">{result.scoring.riskBand}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-300">{result.scoring.summary}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-200">Decision factors</p>
              {result.scoring.factors.map((factor) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  key={factor.key}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-200">{factor.label}</span>
                    <span className="text-sm text-slate-400">{factor.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-200">Adverse action readiness</p>
              {result.scoring.adverseActionReasons.length > 0 ? (
                result.scoring.adverseActionReasons.map((reason) => (
                  <div
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3"
                    key={reason.code}
                  >
                    <p className="text-sm font-medium text-rose-100">{reason.title}</p>
                    <p className="mt-1 text-sm text-rose-50/80">{reason.detail}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  No adverse-action reasons generated. The application meets auto-approval policy thresholds.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-6 text-sm leading-6 text-slate-300">
            Submit the borrower intake form to generate a model score, policy decision, and compliance-ready reason codes.
          </div>
        )}
      </aside>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "number";
}

function Field({ label, value, onChange, type = "text" }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
