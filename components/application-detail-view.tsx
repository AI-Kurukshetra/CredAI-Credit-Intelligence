"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { AuthenticatedShell } from "@/components/authenticated-shell";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/components/auth-provider";
import {
  ApplicationDetail,
  UnderwriterAction,
} from "@/lib/domain";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ApplicationDetailView({ id }: { id: string }) {
  const { accessToken, profile } = useAuth();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadDetail = useCallback(async () => {
    if (!accessToken) return;

    const response = await fetch(`/api/applications/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load application detail.");
      return;
    }

    setDetail(payload as ApplicationDetail);
  }, [accessToken, id]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadDetail();
    });
  }, [loadDetail]);

  const allowedRole = useMemo(() => profile?.role ?? "borrower", [profile?.role]);

  const submitDecision = (action: UnderwriterAction) => {
    startTransition(async () => {
      if (!accessToken) return;

      const response = await fetch(`/api/applications/${id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action,
          notes,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Failed to record underwriter action.");
        return;
      }

      setNotes("");
      await loadDetail();
    });
  };

  return (
    <AuthenticatedShell
      allowedRole={allowedRole}
      description="Application detail with borrower data, model metadata, reason codes, timeline, and underwriter action controls."
      title="Application detail"
    >
      {error ? (
        <div className="mb-8 rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {detail ? (
        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-8">
            <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                    Borrower
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                    {detail.borrower.firstName} {detail.borrower.lastName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">{detail.borrower.email}</p>
                  <p className="text-sm text-slate-600">{detail.borrower.phone}</p>
                </div>
                <StatusBadge tone={detail.applicationStatus} />
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <DataPoint label="Requested amount" value={currency.format(detail.requestedAmount)} />
                <DataPoint label="Annual income" value={currency.format(detail.annualIncome)} />
                <DataPoint label="Monthly debt" value={currency.format(detail.existingMonthlyDebt)} />
                <DataPoint label="Housing payment" value={currency.format(detail.monthlyHousingPayment)} />
                <DataPoint label="Employment years" value={detail.employmentYears.toFixed(1)} />
                <DataPoint label="Submitted" value={new Date(detail.submittedAt).toLocaleString()} />
              </div>
            </article>

            <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Alternative data
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <DataPoint label="Income consistency" value={`${detail.incomeConsistencyScore}/100`} />
                <DataPoint label="Average balance" value={currency.format(detail.averageMonthlyBalance)} />
                <DataPoint label="Rent on-time rate" value={`${detail.rentOnTimeRate}%`} />
                <DataPoint label="Utility on-time rate" value={`${detail.utilityOnTimeRate}%`} />
                <DataPoint label="NSF events" value={String(detail.nsfEventsLast90Days)} />
                <DataPoint label="Government ID" value={detail.hasGovernmentId ? "Verified" : "Pending"} />
              </div>
            </article>

            <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Application timeline
              </p>
              <div className="mt-6 space-y-4">
                {detail.timeline.map((item) => (
                  <div className="rounded-[24px] bg-slate-50 p-5" key={item.id}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-950">{item.label}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                    {item.actorName ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                        {item.actorName}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Supporting documents
              </p>
              <div className="mt-6 grid gap-4">
                {detail.documents.length > 0 ? (
                  detail.documents.map((document) => (
                    <div
                      className="flex flex-col gap-3 rounded-[24px] border border-slate-200 p-5 md:flex-row md:items-center md:justify-between"
                      key={document.id}
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {document.originalName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {document.mimeType} · {formatBytes(document.sizeBytes)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Uploaded {new Date(document.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      {document.downloadUrl ? (
                        <a
                          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                          href={document.downloadUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open document
                        </a>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    No documents uploaded for this application.
                  </div>
                )}
              </div>
            </article>
          </section>

          <aside className="space-y-8">
            <article className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-400">
                Model result
              </p>
              {detail.scoring ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Score</p>
                      <p className="mt-2 text-3xl font-semibold">{detail.scoring.score}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Risk band</p>
                      <p className="mt-2 text-3xl font-semibold">{detail.scoring.riskBand}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm text-slate-300">
                    <p>{detail.scoring.summary}</p>
                    <p>Model: {detail.scoring.modelVersion}</p>
                    <p>Scored at: {new Date(detail.scoring.scoredAt).toLocaleString()}</p>
                  </div>
                  <div className="mt-6 space-y-3">
                    {detail.scoring.factors.map((factor) => (
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
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-300">No scoring run recorded.</p>
              )}
            </article>

            <article className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Decision
              </p>
              {detail.latestDecision ? (
                <div className="mt-4 space-y-3">
                  <StatusBadge tone={detail.latestDecision.action} />
                  <p className="text-sm text-slate-700">{detail.latestDecision.notes}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    {detail.latestDecision.reviewerName} ·{" "}
                    {new Date(detail.latestDecision.decidedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  No manual underwriter decision has been recorded yet.
                </p>
              )}

              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  Adverse action reasons
                </p>
                {detail.scoring?.adverseActionReasons.length ? (
                  detail.scoring.adverseActionReasons.map((reason) => (
                    <div
                      className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3"
                      key={reason.code}
                    >
                      <p className="text-sm font-semibold text-rose-900">{reason.title}</p>
                      <p className="mt-1 text-sm text-rose-700">{reason.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    No adverse-action reasons generated.
                  </p>
                )}
              </div>

              {profile?.role === "lender" ? (
                <div className="mt-8 space-y-4 rounded-[24px] bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">
                    Underwriter review actions
                  </p>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add decision notes or request details..."
                    value={notes}
                  />
                  <div className="flex flex-wrap gap-3">
                    <ActionButton
                      disabled={isPending}
                      label="Approve"
                      onClick={() => submitDecision("approve")}
                    />
                    <ActionButton
                      disabled={isPending}
                      label="Decline"
                      onClick={() => submitDecision("decline")}
                    />
                    <ActionButton
                      disabled={isPending}
                      label="Request information"
                      onClick={() => submitDecision("request_information")}
                    />
                  </div>
                </div>
              ) : null}
            </article>
          </aside>
        </div>
      ) : (
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          Loading application detail...
        </div>
      )}
    </AuthenticatedShell>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ActionButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
