interface LoanApplicationInput {
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
}

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const model = {
  modelName: "credit_logistic_regression",
  version: "1.0.0",
  intercept: 0.02237872819777879,
  features: [
    "requested_amount",
    "annual_income",
    "existing_monthly_debt",
    "housing_payment",
    "employment_years",
    "income_consistency",
    "avg_balance",
    "rent_history",
    "utility_history",
    "nsf_events",
    "identity",
  ] as const,
  coefficients: [
    -4.1554290000339866e-05,
    -1.796515655652663e-05,
    -0.0020381365043946136,
    -5.859702522299641e-05,
    0.10380535632359005,
    0.005265096464925986,
    -0.00023216453540973164,
    -0.0003627040544353984,
    0.012738696428329062,
    0.0676910761056696,
    -0.027191200338037107,
  ],
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

function buildReasons(input: LoanApplicationInput, score: number) {
  const reasons = [];
  const monthlyIncome = input.annualIncome / 12;
  const debtToIncome = input.existingMonthlyDebt / Math.max(monthlyIncome, 1);

  if (!input.hasGovernmentId) {
    reasons.push({
      code: "IDV_001",
      title: "Identity verification incomplete",
      detail: "Government-issued identification has not been verified.",
    });
  }

  if (debtToIncome > 0.45) {
    reasons.push({
      code: "DTI_045",
      title: "High debt-to-income ratio",
      detail: "Existing obligations consume a high share of monthly income.",
    });
  }

  if (input.rentOnTimeRate < 85) {
    reasons.push({
      code: "ALT_RENT_085",
      title: "Weak rent payment history",
      detail: "Rent payment performance is below the configured threshold.",
    });
  }

  if (input.utilityOnTimeRate < 85) {
    reasons.push({
      code: "ALT_UTIL_085",
      title: "Weak utility payment history",
      detail: "Utility repayment performance is below the configured threshold.",
    });
  }

  if (input.incomeConsistencyScore < 65) {
    reasons.push({
      code: "INC_VAR_065",
      title: "Income pattern is inconsistent",
      detail: "Income volatility reduces repayment confidence.",
    });
  }

  if (input.nsfEventsLast90Days > 1) {
    reasons.push({
      code: "CF_NSF_002",
      title: "Recent overdraft behavior",
      detail: "Multiple non-sufficient-funds events were observed recently.",
    });
  }

  if (score < 640 && reasons.length === 0) {
    reasons.push({
      code: "MODEL_640",
      title: "Primary model score below approval threshold",
      detail: "The logistic regression model output falls below the approval threshold.",
    });
  }

  return reasons;
}

function calculateLogit(input: LoanApplicationInput) {
  const featureValues = [
    input.requestedAmount,
    input.annualIncome,
    input.existingMonthlyDebt,
    input.monthlyHousingPayment,
    input.employmentYears,
    input.incomeConsistencyScore,
    input.averageMonthlyBalance,
    input.rentOnTimeRate,
    input.utilityOnTimeRate,
    input.nsfEventsLast90Days,
    input.hasGovernmentId ? 1 : 0,
  ];

  return featureValues.reduce(
    (total, value, index) => total + value * model.coefficients[index],
    model.intercept,
  );
}

function riskBand(score: number) {
  if (score >= 740) return "Prime";
  if (score >= 680) return "Near Prime";
  if (score >= 620) return "Caution";
  return "High Risk";
}

function decision(score: number, input: LoanApplicationInput) {
  if (!input.hasGovernmentId) return "decline";

  const dti =
    input.existingMonthlyDebt / Math.max(input.annualIncome / 12, 1);

  if (dti > 0.6) return "decline";
  if (score >= 720) return "approve";
  if (score < 640) return "decline";

  return "review";
}

function scoreLoanApplication(input: LoanApplicationInput) {
  const probability = clamp(sigmoid(calculateLogit(input)));
  const score = Math.round(300 + probability * 550);
  const recommendation = decision(score, input);

  return {
    score,
    normalizedScore: Number(probability.toFixed(6)),
    riskBand: riskBand(score),
    recommendation,
    policyOutcome:
      recommendation === "approve"
        ? "auto_approve"
        : recommendation === "decline"
          ? "auto_decline"
          : "manual_review",
    summary:
      recommendation === "approve"
        ? "Logistic regression model output is above the approval threshold."
        : recommendation === "review"
          ? "Model inference completed, but the application requires manual review."
          : "Model and policy evaluation place the application below the approval threshold.",
    adverseActionReasons: buildReasons(input, score),
    modelName: model.modelName,
    modelVersion: model.version,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload = (await request.json()) as LoanApplicationInput;
  const scoring = scoreLoanApplication(payload);

  return Response.json(scoring);
});
