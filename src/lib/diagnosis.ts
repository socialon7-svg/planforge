import type { DiagnosisItem, GeneratedPlan } from "@/types/plan";

const diagnosisEntries = [
  {
    en: "Problem recognition specificity",
    ko: "문제 인식 구체성",
    keywords: ["문제", "problem", "인식", "specific"],
  },
  {
    en: "Customer segment clarity",
    ko: "고객군 명확성",
    keywords: ["고객", "customer", "segment", "target"],
  },
  {
    en: "MVP-level solution concreteness",
    ko: "MVP 수준 해결책 구체성",
    keywords: ["mvp", "해결", "solution", "concrete"],
  },
  {
    en: "Competitor alternatives and differentiation",
    ko: "경쟁 대안 및 차별성",
    keywords: ["경쟁", "competitor", "대안", "차별", "different"],
  },
  {
    en: "Commercialization execution feasibility",
    ko: "사업화 실행 가능성",
    keywords: ["사업화", "commercialization", "실행", "execution"],
  },
  {
    en: "Budget and output connection",
    ko: "사업비와 산출물 연계성",
    keywords: ["사업비", "budget", "산출물", "output"],
  },
  {
    en: "Team capabilities and gap plan",
    ko: "팀 역량 및 보완계획",
    keywords: ["팀", "team", "역량", "capability", "gap", "보완"],
  },
] as const;

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

function findBestMatchIndex(label: string): number {
  const normalized = normalizeLabel(label);

  const exactIndex = diagnosisEntries.findIndex(
    (entry) => normalized === normalizeLabel(entry.en) || normalized === normalizeLabel(entry.ko),
  );
  if (exactIndex >= 0) return exactIndex;

  let bestIndex = -1;
  let bestScore = 0;
  diagnosisEntries.forEach((entry, index) => {
    const score = entry.keywords.reduce(
      (sum, keyword) => sum + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function normalizeDiagnosis(plan: GeneratedPlan): GeneratedPlan {
  const items = plan.selfDiagnosis ?? [];
  const used = new Set<number>();
  const result: DiagnosisItem[] = diagnosisEntries.map((entry) => ({
    label: entry.ko,
    status: "warning",
    comment: "검토가 필요합니다.",
  }));

  items.forEach((item, itemIndex) => {
    let targetIndex = findBestMatchIndex(item.label);
    if (targetIndex < 0 || used.has(targetIndex)) {
      targetIndex = itemIndex < diagnosisEntries.length && !used.has(itemIndex) ? itemIndex : -1;
    }
    if (targetIndex < 0) return;

    result[targetIndex] = {
      label: diagnosisEntries[targetIndex].ko,
      status: item.status,
      comment: item.comment,
    };
    used.add(targetIndex);
  });

  return {
    ...plan,
    selfDiagnosis: result,
  };
}
