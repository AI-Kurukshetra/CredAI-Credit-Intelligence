interface CreditLogisticRegressionModel {
  modelName: string;
  version: string;
  intercept: number;
  features: readonly string[];
  coefficients: readonly number[];
}

export const creditLogisticRegressionModel: CreditLogisticRegressionModel = {
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
} as const;

export type CreditModelFeature =
  (typeof creditLogisticRegressionModel.features)[number];
