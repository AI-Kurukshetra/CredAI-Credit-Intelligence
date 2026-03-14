"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { useAuth } from "@/components/auth-provider";
import { DashboardSnapshot } from "@/lib/domain";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function LenderDashboard() {
  const { accessToken } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    void (async () => {
      const response = await fetch("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Failed to load lender dashboard.");
        return;
      }

      setSnapshot(payload as DashboardSnapshot);
    })();
  }, [accessToken]);

  return (
    <AuthenticatedShell
      allowedRole="lender"
      description="Lender dashboard with queue visibility, approval metrics, average risk score, and drill-down underwriting detail."
      title="Lender dashboard"
    >
      {error ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {snapshot ? (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {snapshot.metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div>
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                  Underwriting queue
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  Review and decision workspace
                </h2>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-4">Borrower</th>
                    <th className="px-5 py-4">Request</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {snapshot.queue.map((application) => (
                    <tr key={application.id}>
                      <td className="px-5 py-5 align-top">
                        <Link
                          className="block"
                          href={`/applications/${application.id}`}
                        >
                          <p className="font-semibold text-slate-950">
                            {application.borrowerName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{application.email}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-5 align-top text-sm text-slate-700">
                        {currency.format(application.requestedAmount)}
                      </td>
                      <td className="px-5 py-5 align-top">
                        <p className="text-2xl font-semibold text-slate-950">
                          {application.score}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {application.riskBand}
                        </p>
                      </td>
                      <td className="space-y-3 px-5 py-5 align-top">
                        <StatusBadge tone={application.applicationStatus} />
                        <p className="max-w-xs text-sm leading-6 text-slate-600">
                          {application.summary}
                        </p>
                      </td>
                      <td className="px-5 py-5 align-top text-sm text-slate-700">
                        {application.modelVersion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          Loading queue and portfolio metrics...
        </div>
      )}
    </AuthenticatedShell>
  );
}
