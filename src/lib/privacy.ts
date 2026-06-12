import type { GeneratedPlan, PlanSection } from "@/types/plan";

const privacyPatterns: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    replacement: "[이메일 비공개]",
  },
  {
    pattern: /(?:\+82[-.\s]?)?0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
    replacement: "[전화번호 비공개]",
  },
  {
    pattern: /\b\d{6}-[1-4]\d{6}\b/g,
    replacement: "[식별번호 비공개]",
  },
  {
    pattern: /(성명|이름|대표자명|팀원명)\s*[:：]\s*[가-힣]{2,4}/g,
    replacement: "$1: OOO",
  },
  {
    pattern: /(생년월일|생년월|출생일)\s*[:：]?\s*\d{2,4}[년./-]\s*\d{1,2}[월./-]\s*\d{1,2}일?/g,
    replacement: "$1: 비공개",
  },
  {
    pattern: /(학교명|출신학교|소속학교)\s*[:：]\s*[^\n,;]+/g,
    replacement: "$1: OOO",
  },
  {
    pattern: /(직장명|근무처|이전 직장|소속 회사|회사명)\s*[:：]\s*[^\n,;]+/g,
    replacement: "$1: OOO",
  },
  {
    pattern: /(주소|소재지)\s*[:：]\s*[^\n]+/g,
    replacement: "$1: 비공개",
  },
  {
    pattern: /source_file\s*[:=]\s*[^\s\n,;]+/gi,
    replacement: "source_file: [비공개]",
  },
  {
    pattern: /chunk_id\s*[:=]\s*[^\s\n,;]+/gi,
    replacement: "chunk_id: [비공개]",
  },
  {
    pattern: /page_range\s*[:=]\s*[^\s\n,;]+/gi,
    replacement: "page_range: [비공개]",
  },
  {
    pattern: /[^\s\n\\/]+\.pdf/gi,
    replacement: "[원본 파일명 비공개]",
  },
];

function sanitizeText(text: string): string {
  return privacyPatterns.reduce(
    (sanitized, { pattern, replacement }) => sanitized.replace(pattern, replacement),
    text,
  );
}

function sanitizeSection(section: PlanSection): PlanSection {
  return {
    title: sanitizeText(section.title),
    body: sanitizeText(section.body),
  };
}

export function sanitizeGeneratedPlan(plan: GeneratedPlan): GeneratedPlan {
  return {
    ...plan,
    basicInfo: sanitizeSection(plan.basicInfo),
    itemSummary: sanitizeSection(plan.itemSummary),
    problem: sanitizeSection(plan.problem),
    solution: sanitizeSection(plan.solution),
    market: sanitizeSection(plan.market),
    competitor: sanitizeSection(plan.competitor),
    businessModel: sanitizeSection(plan.businessModel),
    scaleUp: sanitizeSection(plan.scaleUp),
    budget: sanitizeSection(plan.budget),
    roadmap: sanitizeSection(plan.roadmap),
    team: sanitizeSection(plan.team),
    partners: sanitizeSection(plan.partners),
    selfDiagnosis: plan.selfDiagnosis.map((item) => ({
      label: sanitizeText(item.label),
      status: item.status,
      comment: sanitizeText(item.comment),
    })),
  };
}
