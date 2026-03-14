"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth-provider";
import { ApplicationRecord } from "@/lib/domain";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function BorrowerApplicationsList() {
  const { accessToken } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    const response = await fetch("/api/applications", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load borrower applications.");
      setIsLoading(false);
      return;
    }

    setApplications(payload as ApplicationRecord[]);
    setError(null);
    setIsLoading(false);
  }, [accessToken]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadApplications();
    });
  }, [loadApplications]);

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-sky-100 bg-white p-6 text-sm text-slate-500 shadow-[var(--shadow)]">
        Loading decision history...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Borrower history
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Applications, decisions, and status history
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Review each submission, current status, risk result, and lender
            decision details in one place.
          </p>
        </div>
        <Link
          className="inline-flex rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-slate-950"
          href="/apply"
        >
          Start another application
        </Link>
      </div>

      <div className="grid gap-4">
        {applications.length > 0 ? (
          applications.map((application) => (
            <Link
              className="rounded-[28px] border border-sky-100 bg-white p-6 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-sky-200"
              href={`/applications/${application.id}`}
              key={application.id}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Submitted {new Date(application.submittedAt).toLocaleString()}
                  </p>
                  <p className="text-2xl font-semibold text-slate-950">
                    {currency.format(application.requestedAmount)}
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">
                    {application.summary}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[380px]">
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </p>
                    <div className="mt-3">
                      <StatusBadge tone={application.applicationStatus} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Score
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {application.score}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f9fcff_100%)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Model
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {application.riskBand}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {application.modelVersion}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-sky-100 bg-white p-8 text-sm text-slate-400">
            No applications submitted yet.
          </div>
        )}
      </div>
    </section>
  );
}
