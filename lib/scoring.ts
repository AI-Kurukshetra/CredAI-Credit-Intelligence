import {
  DecisionReason,
  LoanApplicationInput,
  ScoringFactorResult,
  ScoringResult,
} from "@/lib/domain";
import {
  creditLogisticRegressionModel,
  CreditModelFeature,
} from "@/lib/model-artifact";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const featureLabels: Record<CreditModelFeature, string> = {
  requested_amount: "Requested amount",
  annual_income: "Annual income",
  existing_monthly_debt: "Existing monthly debt",
  housing_payment: "Housing payment",
  employment_years: "Employment tenure",
  income_consistency: "Income consistency",
  avg_balance: "Average monthly balance",
  rent_history: "Rent payment history",
  utility_history: "Utility payment history",
  nsf_events: "NSF events",
  identity: "Identity verification",
};

function mapFeatures(input: LoanApplicationInput): Record<CreditModelFeature, number> {
  return {
    requested_amount: input.requestedAmount,
    annual_income: input.annualIncome,
    existing_monthly_debt: input.existingMonthlyDebt,
    housing_payment: input.monthlyHousingPayment,
    employment_years: input.employmentYears,
    income_consistency: input.incomeConsistencyScore,
    avg_balance: input.averageMonthlyBalance,
    rent_history: input.rentOnTimeRate,
    utility_history: input.utilityOnTimeRate,
    nsf_events: input.nsfEventsLast90Days,
    identity: input.hasGovernmentId ? 1 : 0,
  };
}

function formatFeatureValue(feature: CreditModelFeature, value: number) {
  switch (feature) {
    case "requested_amount":
    case "annual_income":
    case "existing_monthly_debt":
    case "housing_payment":
    case "avg_balance":
      return `$${Math.round(value).toLocaleString()}`;
    case "employment_years":
      return `${value.toFixed(1)} yrs`;
    case "income_consistency":
    case "rent_history":
    case "utility_history":
      return `${Math.round(value)}%`;
    case "nsf_events":
      return `${value} events`;
    case "identity":
      return value === 1 ? "Verified" : "Pending";
    default:
      return String(value);
  }
}

function buildFactors(input: LoanApplicationInput): ScoringFactorResult[] {
  const featureVector = mapFeatures(input);

  return creditLogisticRegressionModel.features.map((feature, index) => {
    const value = featureVector[feature];
    const coefficient = creditLogisticRegressionModel.coefficients[index];
    const contribution = value * coefficient;

    return {
      key: feature,
      label: featureLabels[feature],
      value: formatFeatureValue(feature, value),
      contribution: Number(contribution.toFixed(6)),
      direction:
        contribution > 0 ? "positive" : contribution < 0 ? "negative" : "neutral",
    };
  });
}

function buildReasons(input: LoanApplicationInput, score: number): DecisionReason[] {
  const reasons: DecisionReason[] = [];
  const monthlyIncome = input.annualIncome / 12;
  const debtToIncome = input.existingMonthlyDebt / Math.max(monthlyIncome, 1);

  if (!input.hasGovernmentId) {
    reasons.push({
      code: "IDV_001",
      title: "Identity verification incomplete",
      detail:
        "Government-issued identification has not been verified for this application.",
    });
  }

  if (debtToIncome > 0.45) {
    reasons.push({
      code: "DTI_045",
      title: "High debt-to-income ratio",
      detail:
        "Recurring debt obligations consume a high share of verified monthly income.",
    });
  }

  if (input.rentOnTimeRate < 85) {
    reasons.push({
      code: "ALT_RENT_085",
      title: "Weak rent payment history",
      detail:
        "Alternative data indicates below-target rent repayment behavior over recent history.",
    });
  }

  if (input.utilityOnTimeRate < 85) {
    reasons.push({
      code: "ALT_UTIL_085",
      title: "Weak utility payment history",
      detail:
        "Utility repayment consistency is below the minimum threshold configured for the primary model.",
    });
  }

  if (input.incomeConsistencyScore < 65) {
    reasons.push({
      code: "INC_VAR_065",
      title: "Income pattern is inconsistent",
      detail:
        "Verified income is present but shows volatility that reduces repayment confidence.",
    });
  }

  if (input.nsfEventsLast90Days > 1) {
    reasons.push({
      code: "CF_NSF_002",
      title: "Recent overdraft behavior",
      detail:
        "Multiple non-sufficient-funds events were observed in the recent cash-flow window.",
    });
  }

  if (score < 640 && reasons.length === 0) {
    reasons.push({
      code: "MODEL_640",
      title: "Primary model score below approval threshold",
      detail:
        "The logistic regression model output falls below the configured threshold for approval.",
    });
  }

  return reasons;
}

function calculateLogit(input: LoanApplicationInput) {
  const features = mapFeatures(input);

  return creditLogisticRegressionModel.features.reduce<number>(
    (total, feature, index) => {
      return (
        total +
        features[feature] * creditLogisticRegressionModel.coefficients[index]
      );
    },
    creditLogisticRegressionModel.intercept,
  );
}

function riskBand(score: number): ScoringResult["riskBand"] {
  if (score >= 740) return "Prime";
  if (score >= 680) return "Near Prime";
  if (score >= 620) return "Caution";

  return "High Risk";
}

function decision(score: number, input: LoanApplicationInput) {
  if (!input.hasGovernmentId) return "decline" as const;

  const debtToIncome =
    input.existingMonthlyDebt / Math.max(input.annualIncome / 12, 1);

  if (debtToIncome > 0.6) return "decline" as const;
  if (score >= 720) return "approve" as const;
  if (score < 640) return "decline" as const;

  return "review" as const;
}

export function scoreLoanApplication(input: LoanApplicationInput): ScoringResult {
  const logit = calculateLogit(input);
  const approvalProbability = clamp(sigmoid(logit));
  const score = Math.round(300 + approvalProbability * 550);
  const recommendation = decision(score, input);
  const factors = buildFactors(input);
  const adverseActionReasons = buildReasons(input, score);

  const policyOutcome =
    recommendation === "approve"
      ? "auto_approve"
      : recommendation === "decline"
        ? "auto_decline"
        : "manual_review";

  const summaryMap = {
    approve:
      "Logistic regression model output is above the approval threshold and policy rules do not force a decline.",
    review:
      "Model inference completed successfully, but the score falls into the manual-underwriting band.",
    decline:
      "Model and policy evaluation place this application below the current approval threshold.",
  } satisfies Record<ScoringResult["recommendation"], string>;

  return {
    score,
    normalizedScore: Number(approvalProbability.toFixed(6)),
    riskBand: riskBand(score),
    recommendation,
    policyOutcome,
    summary: summaryMap[recommendation],
    factors,
    adverseActionReasons,
  };
}
