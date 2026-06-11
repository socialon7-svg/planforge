import type { GeneratedPlan } from "@/types/plan";

const diagnosisLabels = [
  "Problem recognition specificity",
  "Customer segment clarity",
  "MVP-level solution concreteness",
  "Competitor alternatives and differentiation",
  "Commercialization execution feasibility",
  "Budget and output connection",
  "Team capabilities and gap plan",
];

export function normalizeDiagnosis(plan: GeneratedPlan): GeneratedPlan {
  const items = plan.selfDiagnosis?.length ? plan.selfDiagnosis : [];

  return {
    ...plan,
    selfDiagnosis: diagnosisLabels.map((label, index) => {
      const item = items[index];
      return {
        label,
        status: item?.status ?? "warning",
        comment: item?.comment ?? "Review needed.",
      };
    }),
  };
}
