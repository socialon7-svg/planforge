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

  return `# PSST \uC0AC\uC5C5\uACC4\uD68D\uC11C \uCD08\uC548\n\n${sections.join("\n\n")}\n\n## \uC790\uAC00\uC9C4\uB2E8\n\n${diagnosis}\n`;
}

export function planToPlainText(plan: GeneratedPlan): string {
  return sectionKeys.map((key) => `[${plan[key].title}]\n${plan[key].body}`).join("\n\n");
}
