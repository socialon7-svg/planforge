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
  const existing = new Map(plan.selfDiagnosis?.map((item) => [item.label, item]));
  const items = plan.selfDiagnosis?.length ? plan.selfDiagnosis : [];

  return {
    ...plan,
    selfDiagnosis:
      items.length >= 7
        ? items.slice(0, 7)
        : diagnosisLabels.map((label) => {
            const item = existing.get(label);
            return (
              item ?? {
                label,
                status: "warning",
                comment: "Review needed.",
              }
            );
          }),
  };
}
