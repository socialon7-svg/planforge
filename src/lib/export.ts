import type { GeneratedPlan, SectionKey } from "@/types/plan";
import { sectionKeys } from "@/types/plan";
import { sectionLabels } from "@/lib/sections";

export function planToMarkdown(plan: GeneratedPlan): string {
  const sections = sectionKeys.map((key: SectionKey) => {
    const section = plan[key];
    return `## ${section?.title || sectionLabels[key]}\n\n${section?.body || ""}`;
  });

  const diagnosis = plan.selfDiagnosis
    .map((item) => `- ${item.label}: ${item.status} - ${item.comment}`)
    .join("\n");

  return `# PSST Business Plan Draft\n\n${sections.join("\n\n")}\n\n## Self Diagnosis\n\n${diagnosis}\n`;
}

export function planToPlainText(plan: GeneratedPlan): string {
  return sectionKeys.map((key) => `[${plan[key].title}]\n${plan[key].body}`).join("\n\n");
}
