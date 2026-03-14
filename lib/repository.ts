import {
  ApplicationDetail,
  ApplicationRecord,
  ApplicationSubmissionResponse,
  ApplicationStatus,
  AuthProfile,
  DashboardSnapshot,
  DocumentRecord,
  LoanApplicationInput,
  Recommendation,
  TimelineItem,
  UnderwriterAction,
  UnderwriterDecisionInput,
  UnderwritingDecisionRecord,
} from "@/lib/domain";
import { creditLogisticRegressionModel } from "@/lib/model-artifact";
import { scoreLoanApplication } from "@/lib/scoring";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const DOCUMENT_BUCKET = "application-documents";

function requireAdminClient() {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    throw new Error(
      "Supabase service role client is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the server.",
    );
  }

  return supabase;
}

function mapStatusFromRecommendation(
  recommendation: Recommendation,
): ApplicationStatus {
  if (recommendation === "approve") return "approved";
  if (recommendation === "decline") return "declined";
  return "review";
}

function mapTimelineLabel(eventType: string) {
  const labels: Record<string, string> = {
    application_submitted: "Application submitted",
    score_generated: "Score generated",
    auto_decision_applied: "Auto decision applied",
    manual_decision_recorded: "Underwriter decision",
    information_requested: "Additional information requested",
    document_uploaded: "Supporting document uploaded",
  };

  return labels[eventType] ?? eventType.replaceAll("_", " ");
}

async function getBorrowerIdForProfile(profileId: string) {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("borrowers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load borrower profile: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function getDashboardSnapshot(
  profile: AuthProfile,
): Promise<DashboardSnapshot> {
  if (profile.role !== "lender") {
    throw new Error("Only lenders can access the dashboard.");
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("loan_applications")
    .select(
      `
        id,
        application_status,
        submitted_at,
        requested_amount,
        borrowers!inner (
          email,
          first_name,
          last_name
        ),
        scoring_runs (
          score,
          risk_band,
          recommendation,
          summary,
          model_version,
          scored_at
        )
      `,
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load dashboard snapshot: ${error.message}`);
  }

  const queue: ApplicationRecord[] = (data ?? []).map((row) => {
    const scoring = row.scoring_runs?.[0];
    const borrower = Array.isArray(row.borrowers) ? row.borrowers[0] : row.borrowers;

    return {
      id: row.id,
      borrowerName: borrower
        ? `${borrower.first_name} ${borrower.last_name}`
        : "Unknown borrower",
      email: borrower?.email ?? "No email",
      requestedAmount: Number(row.requested_amount),
      submittedAt: row.submitted_at,
      applicationStatus: row.application_status as ApplicationStatus,
      score: scoring?.score ?? 0,
      riskBand: (scoring?.risk_band as ApplicationRecord["riskBand"]) ?? "High Risk",
      recommendation:
        (scoring?.recommendation as Recommendation) ?? "review",
      summary: scoring?.summary ?? "Awaiting score generation.",
      modelVersion:
        scoring?.model_version ?? creditLogisticRegressionModel.version,
    };
  });

  const total = queue.length;
  const approved = queue.filter(
    (item) => item.applicationStatus === "approved",
  ).length;
  const averageRiskScore =
    queue.length > 0
      ? Math.round(
          queue.reduce((totalScore, item) => totalScore + item.score, 0) /
            queue.length,
        )
      : 0;
  const manualReview = queue.filter(
    (item) => item.applicationStatus === "review",
  ).length;
  const scored = queue.filter((item) => item.score > 0).length;

  return {
    metrics: [
      {
        label: "Applications scored",
        value: String(scored),
        trend: `${total} total applications`,
      },
      {
        label: "Approval rate",
        value: total ? `${Math.round((approved / total) * 100)}%` : "0%",
        trend: "Approved over total applications",
      },
      {
        label: "Manual review queue",
        value: String(manualReview),
        trend: "Applications awaiting lender action",
      },
      {
        label: "Average risk score",
        value: String(averageRiskScore),
        trend: "Average across the live portfolio",
      },
    ],
    queue,
  };
}

export async function listBorrowerApplications(
  profile: AuthProfile,
): Promise<ApplicationRecord[]> {
  if (profile.role !== "borrower") {
    throw new Error("Only borrowers can view borrower applications.");
  }

  const borrowerId = await getBorrowerIdForProfile(profile.id);

  if (!borrowerId) {
    return [];
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("loan_applications")
    .select(
      `
        id,
        application_status,
        submitted_at,
        requested_amount,
        borrowers!inner (
          email,
          first_name,
          last_name
        ),
        scoring_runs (
          score,
          risk_band,
          recommendation,
          summary,
          model_version,
          scored_at
        )
      `,
    )
    .eq("borrower_id", borrowerId)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load borrower applications: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const scoring = row.scoring_runs?.[0];
    const borrower = Array.isArray(row.borrowers) ? row.borrowers[0] : row.borrowers;

    return {
      id: row.id,
      borrowerName: borrower
        ? `${borrower.first_name} ${borrower.last_name}`
        : profile.fullName,
      email: borrower?.email ?? profile.email,
      requestedAmount: Number(row.requested_amount),
      submittedAt: row.submitted_at,
      applicationStatus: row.application_status as ApplicationStatus,
      score: scoring?.score ?? 0,
      riskBand: (scoring?.risk_band as ApplicationRecord["riskBand"]) ?? "High Risk",
      recommendation:
        (scoring?.recommendation as Recommendation) ?? "review",
      summary: scoring?.summary ?? "Awaiting score generation.",
      modelVersion:
        scoring?.model_version ?? creditLogisticRegressionModel.version,
    };
  });
}

export async function submitApplication(
  payload: LoanApplicationInput,
  profile: AuthProfile,
): Promise<ApplicationSubmissionResponse> {
  if (profile.role !== "borrower") {
    throw new Error("Only borrowers can submit applications.");
  }

  const supabase = requireAdminClient();
  const scoring = scoreLoanApplication(payload);

  const { data: borrower, error: borrowerError } = await supabase
    .from("borrowers")
    .upsert(
      {
        profile_id: profile.id,
        email: profile.email,
        first_name: payload.borrower.firstName,
        last_name: payload.borrower.lastName,
        phone: payload.borrower.phone,
        consent_captured: payload.agreedToTerms,
      },
      { onConflict: "profile_id" },
    )
    .select("id")
    .single();

  if (borrowerError || !borrower) {
    throw new Error(`Failed to upsert borrower record: ${borrowerError?.message}`);
  }

  const { data: application, error: applicationError } = await supabase
    .from("loan_applications")
    .insert({
      borrower_id: borrower.id,
      requested_amount: payload.requestedAmount,
      annual_income: payload.annualIncome,
      existing_monthly_debt: payload.existingMonthlyDebt,
      monthly_housing_payment: payload.monthlyHousingPayment,
      employment_years: payload.employmentYears,
      application_status: "submitted",
    })
    .select("id, submitted_at")
    .single();

  if (applicationError || !application) {
    throw new Error(
      `Failed to insert loan application: ${applicationError?.message}`,
    );
  }

  const { error: alternativeDataError } = await supabase
    .from("alternative_data_inputs")
    .insert({
      application_id: application.id,
      income_consistency_score: payload.incomeConsistencyScore,
      average_monthly_balance: payload.averageMonthlyBalance,
      rent_on_time_rate: payload.rentOnTimeRate,
      utility_on_time_rate: payload.utilityOnTimeRate,
      nsf_events_last_90_days: payload.nsfEventsLast90Days,
      has_government_id: payload.hasGovernmentId,
    });

  if (alternativeDataError) {
    throw new Error(
      `Failed to insert alternative-data record: ${alternativeDataError.message}`,
    );
  }

  const { data: model, error: modelError } = await supabase
    .from("score_models")
    .select("id, version")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (modelError) {
    throw new Error(`Failed to load active score model: ${modelError.message}`);
  }

  if (!model) {
    throw new Error(
      "No active score model found in Supabase. Insert an active row into score_models first.",
    );
  }

  const { data: scoringRun, error: scoringError } = await supabase
    .from("scoring_runs")
    .insert({
      application_id: application.id,
      model_id: model.id,
      model_version: model.version,
      score: scoring.score,
      normalized_score: scoring.normalizedScore,
      risk_band: scoring.riskBand,
      recommendation: scoring.recommendation,
      policy_outcome: scoring.policyOutcome,
      summary: scoring.summary,
      factors: scoring.factors,
      adverse_action_reasons: scoring.adverseActionReasons,
      scored_at: new Date().toISOString(),
    })
    .select("id, scored_at")
    .single();

  if (scoringError || !scoringRun) {
    throw new Error(`Failed to insert scoring run: ${scoringError?.message}`);
  }

  const finalStatus = mapStatusFromRecommendation(scoring.recommendation);

  const { error: statusError } = await supabase
    .from("loan_applications")
    .update({
      application_status: finalStatus,
    })
    .eq("id", application.id);

  if (statusError) {
    throw new Error(`Failed to update application status: ${statusError.message}`);
  }

  const auditPayload = [
    {
      application_id: application.id,
      actor_id: profile.id,
      event_type: "application_submitted",
      event_payload: {
        requestedAmount: payload.requestedAmount,
        consentCaptured: payload.agreedToTerms,
      },
    },
    {
      application_id: application.id,
      actor_id: profile.id,
      event_type: "score_generated",
      event_payload: {
        score: scoring.score,
        recommendation: scoring.recommendation,
        modelVersion: model.version,
      },
    },
    {
      application_id: application.id,
      actor_id: profile.id,
      event_type: "auto_decision_applied",
      event_payload: {
        applicationStatus: finalStatus,
        recommendation: scoring.recommendation,
      },
    },
  ];

  const { error: auditError } = await supabase.from("audit_logs").insert(auditPayload);

  if (auditError) {
    throw new Error(`Failed to write audit logs: ${auditError.message}`);
  }

  return {
    applicationId: application.id,
    createdAt: application.submitted_at,
    storageMode: "supabase",
    scoring,
  };
}

async function assertApplicationAccess(
  applicationId: string,
  profile: AuthProfile,
) {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("loan_applications")
    .select("id, borrower_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Application not found.");
  }

  if (profile.role === "borrower") {
    const borrowerId = await getBorrowerIdForProfile(profile.id);

    if (!borrowerId || borrowerId !== data.borrower_id) {
      throw new Error("You do not have access to this application.");
    }
  }

  return data;
}

async function createDocumentUrls(
  documents: Array<{ storage_path: string }>,
): Promise<string[]> {
  if (documents.length === 0) {
    return [];
  }

  const supabase = requireAdminClient();
  const paths = documents.map((document) => document.storage_path);
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrls(paths, 60 * 60);

  if (error) {
    throw new Error(`Failed to create signed document URLs: ${error.message}`);
  }

  return data.map((item) => item.signedUrl ?? "");
}

export async function getApplicationDetail(
  applicationId: string,
  profile: AuthProfile,
): Promise<ApplicationDetail> {
  await assertApplicationAccess(applicationId, profile);

  const supabase = requireAdminClient();

  const { data: application, error: applicationError } = await supabase
    .from("loan_applications")
    .select(
      `
        id,
        application_status,
        submitted_at,
        requested_amount,
        annual_income,
        existing_monthly_debt,
        monthly_housing_payment,
        employment_years,
        borrowers!inner (
          email,
          first_name,
          last_name,
          phone
        ),
        alternative_data_inputs (
          income_consistency_score,
          average_monthly_balance,
          rent_on_time_rate,
          utility_on_time_rate,
          nsf_events_last_90_days,
          has_government_id
        ),
        scoring_runs (
          id,
          model_id,
          model_version,
          score,
          normalized_score,
          risk_band,
          recommendation,
          policy_outcome,
          summary,
          factors,
          adverse_action_reasons,
          scored_at
        ),
        underwriting_decisions (
          id,
          action,
          final_recommendation,
          review_notes,
          decided_at,
          reviewer:profiles (
            full_name
          )
        ),
        audit_logs (
          id,
          actor_id,
          event_type,
          event_payload,
          created_at,
          actor:profiles (
            full_name
          )
        ),
        documents (
          id,
          original_name,
          mime_type,
          size_bytes,
          uploaded_at,
          storage_path
        )
      `,
    )
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    throw new Error(`Failed to load application detail: ${applicationError?.message}`);
  }

  const borrower = Array.isArray(application.borrowers)
    ? application.borrowers[0]
    : application.borrowers;
  const alternativeData = application.alternative_data_inputs?.[0];
  const scoring = application.scoring_runs?.[0];
  const decision = application.underwriting_decisions?.[0];
  const documents = application.documents ?? [];
  const signedUrls = await createDocumentUrls(documents);

  const timeline: TimelineItem[] = (application.audit_logs ?? []).map((item) => {
    const actor = Array.isArray(item.actor) ? item.actor[0] : item.actor;
    const payload = item.event_payload as Record<string, unknown>;

    return {
      id: item.id,
      eventType: item.event_type,
      label: mapTimelineLabel(item.event_type),
      detail:
        typeof payload?.recommendation === "string"
          ? `Recommendation: ${payload.recommendation}`
          : JSON.stringify(payload),
      createdAt: item.created_at,
      actorName: actor?.full_name,
    };
  });

  const latestDecision: UnderwritingDecisionRecord | null = decision
    ? {
        id: decision.id,
        action: decision.action as UnderwriterAction,
        recommendation: decision.final_recommendation as Recommendation | null,
        notes: decision.review_notes ?? "",
        decidedAt: decision.decided_at,
        reviewerName: (Array.isArray(decision.reviewer)
          ? decision.reviewer[0]
          : decision.reviewer
        )?.full_name ?? "Lender reviewer",
      }
    : null;

  const mappedDocuments: DocumentRecord[] = documents.map((document, index) => ({
    id: document.id,
    originalName: document.original_name,
    mimeType: document.mime_type,
    sizeBytes: document.size_bytes,
    uploadedAt: document.uploaded_at,
    downloadUrl: signedUrls[index] || null,
  }));

  return {
    id: application.id,
    borrower: {
      firstName: borrower.first_name,
      lastName: borrower.last_name,
      email: borrower.email,
      phone: borrower.phone ?? "",
    },
    requestedAmount: Number(application.requested_amount),
    annualIncome: Number(application.annual_income),
    existingMonthlyDebt: Number(application.existing_monthly_debt),
    monthlyHousingPayment: Number(application.monthly_housing_payment),
    employmentYears: Number(application.employment_years),
    incomeConsistencyScore: alternativeData?.income_consistency_score ?? 0,
    averageMonthlyBalance: Number(alternativeData?.average_monthly_balance ?? 0),
    rentOnTimeRate: alternativeData?.rent_on_time_rate ?? 0,
    utilityOnTimeRate: alternativeData?.utility_on_time_rate ?? 0,
    nsfEventsLast90Days: alternativeData?.nsf_events_last_90_days ?? 0,
    hasGovernmentId: alternativeData?.has_government_id ?? false,
    applicationStatus: application.application_status as ApplicationStatus,
    submittedAt: application.submitted_at,
    scoring: scoring
      ? {
          scoringRunId: scoring.id,
          score: scoring.score,
          normalizedScore: Number(scoring.normalized_score),
          riskBand: scoring.risk_band,
          recommendation: scoring.recommendation,
          policyOutcome: scoring.policy_outcome,
          summary: scoring.summary,
          factors: scoring.factors,
          adverseActionReasons: scoring.adverse_action_reasons,
          modelId: scoring.model_id,
          modelVersion: scoring.model_version,
          scoredAt: scoring.scored_at,
        }
      : null,
    latestDecision,
    timeline,
    documents: mappedDocuments,
  };
}

export async function recordUnderwriterDecision(
  applicationId: string,
  payload: UnderwriterDecisionInput,
  profile: AuthProfile,
) {
  if (profile.role !== "lender") {
    throw new Error("Only lenders can record underwriter decisions.");
  }

  const supabase = requireAdminClient();
  const detail = await getApplicationDetail(applicationId, profile);

  const recommendation: Recommendation | null =
    payload.action === "request_information"
      ? null
      : payload.action === "approve"
        ? "approve"
        : "decline";

  const applicationStatus: ApplicationStatus =
    payload.action === "approve"
      ? "approved"
      : payload.action === "decline"
        ? "declined"
        : "review";

  const { error: decisionError } = await supabase
    .from("underwriting_decisions")
    .insert({
      application_id: applicationId,
      scoring_run_id: detail.scoring?.scoringRunId ?? null,
      action: payload.action,
      final_recommendation: recommendation,
      reviewer_id: profile.id,
      review_notes: payload.notes,
      decided_at: new Date().toISOString(),
    });

  if (decisionError) {
    throw new Error(`Failed to record underwriter decision: ${decisionError.message}`);
  }

  const { error: statusError } = await supabase
    .from("loan_applications")
    .update({ application_status: applicationStatus })
    .eq("id", applicationId);

  if (statusError) {
    throw new Error(
      `Failed to update application lifecycle status: ${statusError.message}`,
    );
  }

  const eventType =
    payload.action === "request_information"
      ? "information_requested"
      : "manual_decision_recorded";

  const { error: auditError } = await supabase.from("audit_logs").insert({
    application_id: applicationId,
    actor_id: profile.id,
    event_type: eventType,
    event_payload: {
      action: payload.action,
      recommendation,
      applicationStatus,
      notes: payload.notes,
    },
  });

  if (auditError) {
    throw new Error(`Failed to write decision audit log: ${auditError.message}`);
  }
}

export async function uploadApplicationDocument(
  applicationId: string,
  file: File,
  profile: AuthProfile,
) {
  await assertApplicationAccess(applicationId, profile);

  if (profile.role !== "borrower") {
    throw new Error("Only borrowers can upload application documents.");
  }

  const supabase = requireAdminClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${applicationId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload document to storage: ${uploadError.message}`);
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      application_id: applicationId,
      storage_bucket: DOCUMENT_BUCKET,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    throw new Error(`Failed to save document metadata: ${documentError?.message}`);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    application_id: applicationId,
    actor_id: profile.id,
    event_type: "document_uploaded",
    event_payload: {
      documentId: document.id,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  });

  if (auditError) {
    throw new Error(`Failed to log document upload: ${auditError.message}`);
  }
}
