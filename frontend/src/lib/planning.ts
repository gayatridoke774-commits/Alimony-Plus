export type PlanningInputs = Record<string, number>;
export const financialFields = [
  ["applicantIncome", "Your monthly income"],
  ["respondentIncome", "Other party’s monthly income"],
  ["applicantEssentialExpenses", "Your essential expenses"],
  ["respondentEssentialExpenses", "Other party’s essential expenses"],
  ["childCosts", "Dependent care costs"],
  ["housingCost", "Housing costs"],
  ["medicalCosts", "Medical costs"],
  ["educationCosts", "Education costs"],
  ["applicantLiabilities", "Your monthly debt payments"],
  ["respondentLiabilities", "Other party’s monthly debt payments"],
  ["applicantAssetsIncome", "Your income from assets"],
  ["respondentAssetsIncome", "Other party’s income from assets"],
  ["existingSupport", "Support already received"],
  ["litigationCosts", "Monthly legal-cost budget"],
] as const;
export type PlanningResult = {
  applicantNeed: number;
  respondentCapacity: number;
  scenarios: {
    conservative: { amount: number };
    baseline: { amount: number };
    stress: { amount: number };
  };
  assumptions: string[];
  uncapturedFactors: string[];
  disclaimer: string;
};
// Mirrors maintenance-planning-v1.0 so the demo is explainable. This is a
// budgeting scenario, not a legal formula or a forecast of a court award.
export function calculateDemo(input: PlanningInputs): PlanningResult {
  for (const [key] of financialFields)
    if (!Number.isFinite(input[key]) || input[key] < 0)
      throw new Error(
        "Every amount must be known and non-negative. Unknown amounts cannot be treated as zero.",
      );
  const need = Math.max(
    0,
    input.applicantEssentialExpenses +
      input.childCosts +
      input.housingCost +
      input.medicalCosts +
      input.educationCosts +
      input.litigationCosts -
      input.applicantIncome -
      input.applicantAssetsIncome -
      input.existingSupport,
  );
  const capacity = Math.max(
    0,
    input.respondentIncome +
      input.respondentAssetsIncome -
      input.respondentEssentialExpenses -
      input.respondentLiabilities -
      input.existingSupport,
  );
  return {
    applicantNeed: Math.round(need),
    respondentCapacity: Math.round(capacity),
    scenarios: {
      conservative: { amount: Math.round(Math.min(need * 0.75, capacity)) },
      baseline: { amount: Math.round(Math.min(need, capacity)) },
      stress: { amount: Math.round(Math.min(need * 1.25, capacity)) },
    },
    assumptions: [
      "All amounts are monthly INR and entered by the user.",
      "Baseline is the lower of the remaining need and available capacity.",
      "Conservative and stress scenarios apply 75% and 125% to the need gap, capped by capacity. These are scenario assumptions, not legal percentages.",
    ],
    uncapturedFactors: [
      "Your debt payments are collected but not used by backend v1.0.",
      "Court assessment, disputed facts, overlapping orders and future income changes are not modelled.",
    ],
    disclaimer:
      "Illustrative planning only. This does not predict a court order or determine entitlement.",
  };
}
