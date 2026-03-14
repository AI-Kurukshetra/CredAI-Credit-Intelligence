"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApplicationForm } from "@/components/application-form";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { useAuth } from "@/components/auth-provider";
import { ApplicationRecord } from "@/lib/domain";

export function BorrowerWorkspace() {
  const { accessToken } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (!accessToken) return;

    const response = await fetch("/api/applications", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load borrower applications.");
      return;
    }

    setApplications(payload as ApplicationRecord[]);
  }, [accessToken]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadApplications();
    });
  }, [loadApplications]);

  return (
    <AuthenticatedShell
      allowedRole="borrower"
      description="Borrower portal with authenticated application submission and personal decision visibility."
      title="Borrower application portal"
    >
      {error ? (
        <div className="mb-8 rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="mb-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[32px] border border-sky-100 bg-white p-8 shadow-[var(--shadow)]">
          <p className="text-sm uppercase tracking-[0.18em] text-sky-600">
            Borrower workspace
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Submit one clean application, then track lender outcomes separately.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            This flow is now focused on intake only: identity, loan request,
            repayment capacity, alternative data, and supporting documents. Your
            decision history lives in a dedicated page so this screen stays
            clear and task-focused.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-slate-950"
              href="/my-applications"
            >
              View application history
            </Link>
            <a
              className="rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-slate-950"
              href="#application-form"
            >
              Jump to form
            </a>
          </div>
        </article>

        <article className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <StatCard
            label="Total applications"
            value={String(applications.length)}
            detail="All submissions in your borrower workspace"
          />
          <StatCard
            label="Need review"
            value={String(
              applications.filter(
                (application) => application.applicationStatus === "review",
              ).length,
            )}
            detail="Applications waiting on lender review"
          />
          <StatCard
            label="Approved"
            value={String(
              applications.filter(
                (application) => application.applicationStatus === "approved",
              ).length,
            )}
            detail="Applications with final approval"
          />
        </article>
      </section>

      <ApplicationForm onSubmitted={loadApplications} />
    </AuthenticatedShell>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-[var(--shadow)]">
      <p className="text-sm uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </article>
  );
}
