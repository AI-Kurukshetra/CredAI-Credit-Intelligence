export type UserRole = "borrower" | "lender";
export type Recommendation = "approve" | "review" | "decline";
export type RiskBand = "Prime" | "Near Prime" | "Caution" | "High Risk";
export type ApplicationStatus =
  | "submitted"
  | "scored"
  | "review"
  | "approved"
  | "declined";
export type UnderwriterAction = "approve" | "decline" | "request_information";

export interface BorrowerProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface LoanApplicationInput {
  borrower: BorrowerProfileInput;
  requestedAmount: number;
  annualIncome: number;
  existingMonthlyDebt: number;
  monthlyHousingPayment: number;
  employmentYears: number;
  incomeConsistencyScore: number;
  averageMonthlyBalance: number;
  rentOnTimeRate: number;
  utilityOnTimeRate: number;
  nsfEventsLast90Days: number;
  hasGovernmentId: boolean;
  agreedToTerms: boolean;
}

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthState {
  profile: AuthProfile | null;
  accessToken: string | null;
}

export interface ScoringFactorResult {
  key: string;
  label: string;
  value: string;
  contribution: number;
  direction: "positive" | "negative" | "neutral";
}

export interface DecisionReason {
  code: string;
  title: string;
  detail: string;
}

export interface ScoringResult {
  score: number;
  normalizedScore: number;
  riskBand: RiskBand;
  recommendation: Recommendation;
  policyOutcome: "auto_approve" | "manual_review" | "auto_decline";
  summary: string;
  factors: ScoringFactorResult[];
  adverseActionReasons: DecisionReason[];
}

export interface ApplicationRecord {
  id: string;
  borrowerName: string;
  email: string;
  requestedAmount: number;
  submittedAt: string;
  applicationStatus: ApplicationStatus;
  score: number;
  averageRiskScore?: number;
  riskBand: RiskBand;
  recommendation: Recommendation;
  summary: string;
  modelVersion: string;
}

export interface TimelineItem {
  id: string;
  eventType: string;
  label: string;
  detail: string;
  createdAt: string;
  actorName?: string;
}

export interface DocumentRecord {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  downloadUrl: string | null;
}

export interface UnderwritingDecisionRecord {
  id: string;
  action: UnderwriterAction;
  recommendation: Recommendation | null;
  notes: string;
  decidedAt: string;
  reviewerName: string;
}

export interface ApplicationDetail {
  id: string;
  borrower: BorrowerProfileInput;
  requestedAmount: number;
  annualIncome: number;
  existingMonthlyDebt: number;
  monthlyHousingPayment: number;
  employmentYears: number;
  incomeConsistencyScore: number;
  averageMonthlyBalance: number;
  rentOnTimeRate: number;
  utilityOnTimeRate: number;
  nsfEventsLast90Days: number;
  hasGovernmentId: boolean;
  applicationStatus: ApplicationStatus;
  submittedAt: string;
  scoring: (ScoringResult & {
    scoringRunId: string;
    modelId: string;
    modelVersion: string;
    scoredAt: string;
  }) | null;
  latestDecision: UnderwritingDecisionRecord | null;
  timeline: TimelineItem[];
  documents: DocumentRecord[];
}

export interface MetricSnapshot {
  label: string;
  value: string;
  trend: string;
}

export interface DashboardSnapshot {
  metrics: MetricSnapshot[];
  queue: ApplicationRecord[];
}

export interface ApplicationSubmissionResponse {
  applicationId: string;
  createdAt: string;
  storageMode: "supabase";
  scoring: ScoringResult;
}

export interface UnderwriterDecisionInput {
  action: UnderwriterAction;
  notes: string;
}
