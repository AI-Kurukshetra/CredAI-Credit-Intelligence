"use client";

import { useMemo, useState, useTransition } from "react";

import {
  ApplicationSubmissionResponse,
  LoanApplicationInput,
} from "@/lib/domain";
import { getAccessToken } from "@/lib/auth-client";
import { StatusBadge } from "@/components/status-badge";

const steps = [
  {
    title: "Borrower profile",
    description: "Identity and contact details for the applicant.",
  },
  {
    title: "Loan request",
    description: "Requested product, purpose, and repayment term.",
  },
  {
    title: "Employment and income",
    description: "Employment profile and verified repayment capacity.",
  },
  {
    title: "Obligations and cash flow",
    description: "Liabilities and alternative-data underwriting signals.",
  },
  {
    title: "Documents and consent",
    description: "Upload supporting files and complete required disclosures.",
  },
] as const;

const initialState: LoanApplicationInput = {
  borrower: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
  },
  requestedAmount: 10000,
  loanPurpose: "Debt consolidation",
  loanTermMonths: 24,
  productType: "Personal Loan",
  employerName: "",
  employmentType: "Full-time",
  jobTitle: "",
  annualIncome: 60000,
  monthlyNetIncome: 4200,
  secondaryIncome: 0,
  payFrequency: "Bi-weekly",
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
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<ApplicationSubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  const completedSteps = currentStep;
  const progress = (completedSteps / steps.length) * 100;
  const remainingSteps = steps.length - completedSteps;
  const isFinalStep = currentStep === steps.length - 1;

  const summaryItems = useMemo(
    () => [
      {
        label: "Requested amount",
        value: currency.format(form.requestedAmount),
      },
      {
        label: "Loan purpose",
        value: form.loanPurpose,
      },
      {
        label: "Annual income",
        value: currency.format(form.annualIncome),
      },
      {
        label: "Monthly debt",
        value: currency.format(form.existingMonthlyDebt),
      },
    ],
    [form],
  );

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

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          form.borrower.firstName.trim().length > 0 &&
          form.borrower.lastName.trim().length > 0 &&
          form.borrower.email.trim().length > 0 &&
          form.borrower.phone.trim().length > 0 &&
          form.borrower.dateOfBirth.trim().length > 0 &&
          form.borrower.addressLine1.trim().length > 0 &&
          form.borrower.city.trim().length > 0 &&
          form.borrower.state.trim().length > 0 &&
          form.borrower.postalCode.trim().length > 0
        );
      case 1:
        return (
          form.requestedAmount > 0 &&
          form.loanPurpose.trim().length > 0 &&
          form.loanTermMonths > 0 &&
          form.productType.trim().length > 0
        );
      case 2:
        return (
          form.employerName.trim().length > 0 &&
          form.employmentType.trim().length > 0 &&
          form.jobTitle.trim().length > 0 &&
          form.annualIncome > 0 &&
          form.monthlyNetIncome > 0 &&
          form.payFrequency.trim().length > 0
        );
      case 3:
        return (
          form.existingMonthlyDebt >= 0 &&
          form.monthlyHousingPayment >= 0 &&
          form.employmentYears >= 0 &&
          form.incomeConsistencyScore >= 0 &&
          form.averageMonthlyBalance >= 0 &&
          form.rentOnTimeRate >= 0 &&
          form.utilityOnTimeRate >= 0 &&
          form.nsfEventsLast90Days >= 0
        );
      case 4:
        return form.agreedToTerms;
      default:
        return false;
    }
  };

  const goNext = () => {
    setError(null);

    if (!validateCurrentStep()) {
      setError("Complete the required fields in this step before continuing.");
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!validateCurrentStep()) {
      setError("Complete the required fields in this step before submitting.");
      return;
    }

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
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form
        className="space-y-8 rounded-[32px] border border-sky-100 bg-white p-8 shadow-[var(--shadow)]"
        id="application-form"
        onSubmit={handleSubmit}
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                Borrower application
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {steps[currentStep].description}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] px-4 py-3 text-right text-sm text-slate-600">
              <p>{remainingSteps} step{remainingSteps === 1 ? "" : "s"} remaining</p>
              <p className="mt-1 font-semibold text-slate-950">
                {Math.round(progress)}% complete
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-sky-50">
              <div
                className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isComplete = index < currentStep;

                return (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white"
                        : isComplete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] text-slate-500"
                    }`}
                    key={step.title}
                  >
                    <p className="text-xs uppercase tracking-[0.14em]">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 font-semibold">{step.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {currentStep === 0 ? (
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
            <Field
              label="Date of birth"
              type="date"
              value={form.borrower.dateOfBirth}
              onChange={(value) => updateBorrower("dateOfBirth", value)}
            />
            <Field
              label="Address line 1"
              value={form.borrower.addressLine1}
              onChange={(value) => updateBorrower("addressLine1", value)}
            />
            <Field
              label="Address line 2"
              value={form.borrower.addressLine2}
              onChange={(value) => updateBorrower("addressLine2", value)}
            />
            <Field
              label="City"
              value={form.borrower.city}
              onChange={(value) => updateBorrower("city", value)}
            />
            <Field
              label="State"
              value={form.borrower.state}
              onChange={(value) => updateBorrower("state", value)}
            />
            <Field
              label="Postal code"
              value={form.borrower.postalCode}
              onChange={(value) => updateBorrower("postalCode", value)}
            />
          </section>
        ) : null}

        {currentStep === 1 ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Field
              label="Requested amount"
              type="number"
              value={String(form.requestedAmount)}
              onChange={(value) => update("requestedAmount", Number(value))}
            />
            <SelectField
              label="Product type"
              onChange={(value) => update("productType", value)}
              options={[
                "Personal Loan",
                "Debt Consolidation Loan",
                "Emergency Loan",
                "Credit Builder Loan",
              ]}
              value={form.productType}
            />
            <SelectField
              label="Loan purpose"
              onChange={(value) => update("loanPurpose", value)}
              options={[
                "Debt consolidation",
                "Emergency expense",
                "Home repair",
                "Medical expense",
                "Small business",
                "Education",
                "Other",
              ]}
              value={form.loanPurpose}
            />
            <SelectField
              label="Loan term"
              onChange={(value) => update("loanTermMonths", Number(value))}
              options={["12", "24", "36", "48", "60"]}
              value={String(form.loanTermMonths)}
              optionLabelSuffix=" months"
            />
          </section>
        ) : null}

        {currentStep === 2 ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Field
              label="Employer name"
              value={form.employerName}
              onChange={(value) => update("employerName", value)}
            />
            <SelectField
              label="Employment type"
              onChange={(value) => update("employmentType", value)}
              options={[
                "Full-time",
                "Part-time",
                "Self-employed",
                "Contract",
                "Gig worker",
              ]}
              value={form.employmentType}
            />
            <Field
              label="Job title"
              value={form.jobTitle}
              onChange={(value) => update("jobTitle", value)}
            />
            <Field
              label="Employment years"
              type="number"
              value={String(form.employmentYears)}
              onChange={(value) => update("employmentYears", Number(value))}
            />
            <Field
              label="Annual income"
              type="number"
              value={String(form.annualIncome)}
              onChange={(value) => update("annualIncome", Number(value))}
            />
            <Field
              label="Monthly net income"
              type="number"
              value={String(form.monthlyNetIncome)}
              onChange={(value) => update("monthlyNetIncome", Number(value))}
            />
            <Field
              label="Secondary income"
              type="number"
              value={String(form.secondaryIncome)}
              onChange={(value) => update("secondaryIncome", Number(value))}
            />
            <SelectField
              label="Pay frequency"
              onChange={(value) => update("payFrequency", value)}
              options={["Weekly", "Bi-weekly", "Semi-monthly", "Monthly"]}
              value={form.payFrequency}
            />
          </section>
        ) : null}

        {currentStep === 3 ? (
          <section className="grid gap-4 md:grid-cols-2">
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
              label="Income consistency score"
              type="number"
              value={String(form.incomeConsistencyScore)}
              onChange={(value) => update("incomeConsistencyScore", Number(value))}
            />
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
            <label className="flex items-center gap-3 rounded-2xl border border-sky-100 px-4 py-3 text-sm text-slate-600">
              <input
                checked={form.hasGovernmentId}
                className="h-4 w-4"
                onChange={(event) => update("hasGovernmentId", event.target.checked)}
                type="checkbox"
              />
              Borrower identity documents are available for verification
            </label>
          </section>
        ) : null}

        {currentStep === 4 ? (
          <section className="space-y-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                <span>Supporting documents</span>
              </label>
              <input
                className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-600"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                type="file"
              />
              <p className="text-xs text-slate-400">
                Upload ID, income proof, bank statements, utility records, or rent support documents for lender review.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-sky-100 px-4 py-4 text-sm text-slate-600">
              <input
                checked={form.agreedToTerms}
                className="h-4 w-4"
                onChange={(event) => update("agreedToTerms", event.target.checked)}
                type="checkbox"
              />
              I confirm the information is accurate and I consent to alternative-data review, disclosures, and underwriting decisions.
            </label>
          </section>
        ) : null}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-400">
            {isFinalStep
              ? "Submit the full loan request for scoring and lender review."
              : "Complete this step to continue to the next section."}
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentStep === 0 || isPending}
              onClick={goBack}
              type="button"
            >
              Back
            </button>

            {isFinalStep ? (
              <button
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Submitting..." : "Submit Application"}
              </button>
            ) : (
              <button
                className="rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                onClick={goNext}
                type="button"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </form>

      <aside className="space-y-6 rounded-[32px] border border-slate-900/20 bg-[linear-gradient(180deg,#020617_0%,#020817_100%)] p-8 text-slate-50 shadow-[0_28px_70px_rgba(2,6,23,0.24)]">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Intake summary
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Loan request overview</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The application is organized into borrower identity, loan request, employment and income, obligations and alternative data, then document and consent review.
          </p>
        </div>

        <div className="space-y-3">
          {summaryItems.map((item) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              key={item.label}
            >
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-2 text-sm text-slate-100">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
            Attached files
          </p>
          <p className="mt-2 text-sm text-slate-100">
            {files.length > 0 ? `${files.length} selected for upload` : "No documents selected yet"}
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
              <p className="mt-2 text-sm text-slate-200">Saved to Supabase</p>
            </div>

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

            <p className="text-sm text-slate-300">{result.scoring.summary}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "number" | "date";
}

function Field({ label, value, onChange, type = "text" }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      <span>{label}</span>
      <input
        className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
  optionLabelSuffix,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  optionLabelSuffix?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      <span>{label}</span>
      <select
        className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabelSuffix ? `${option}${optionLabelSuffix}` : option}
          </option>
        ))}
      </select>
    </label>
  );
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
