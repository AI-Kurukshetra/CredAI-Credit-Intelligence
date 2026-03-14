"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApplicationForm } from "@/components/application-form";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth-provider";
import { ApplicationRecord } from "@/lib/domain";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

      <ApplicationForm onSubmitted={loadApplications} />

      <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
              My applications
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">
              Decisions and status history
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {applications.length > 0 ? (
            applications.map((application) => (
              <Link
                className="rounded-[24px] border border-slate-200 p-5 transition hover:border-slate-950"
                href={`/applications/${application.id}`}
                key={application.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      {new Date(application.submittedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {currency.format(application.requestedAmount)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {application.summary}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <StatusBadge tone={application.applicationStatus} />
                    <p className="text-2xl font-semibold text-slate-950">
                      {application.score}
                    </p>
                    <p className="text-sm text-slate-500">
                      {application.riskBand} · {application.modelVersion}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              No applications submitted yet.
            </div>
          )}
        </div>
      </section>
    </AuthenticatedShell>
  );
}
