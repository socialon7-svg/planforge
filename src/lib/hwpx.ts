import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { GeneratedPlan } from "@/types/plan";
import { sectionKeys, type SectionKey } from "@/types/plan";
import { sectionPlaceholders } from "@/lib/sections";

const templatePath = path.join(process.cwd(), "templates", "official_template.hwpx");
const placeholderPattern = /\{\{[A-Z_]+\}\}/g;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textToHwpxText(value: string): string {
  return escapeXml(value)
    .split(/\r?\n/)
    .map((line) => line || " ")
    .join("<hp:lineBreak/>");
}

function placeholderMap(plan: GeneratedPlan): Record<string, string> {
  const values: Record<string, string> = {
    ITEM_NAME: plan.basicInfo.body.split("\n")[0] ?? "",
  };

  sectionKeys.forEach((key) => {
    values[sectionPlaceholders[key]] = plan[key].body;
  });

  return values;
}

function extractRootOpen(sectionXml: string): string {
  const match = sectionXml.match(/^<\?xml[^>]*\s*\?><hs:sec[^>]*>/);
  if (!match) {
    throw new Error("Invalid HWPX section XML.");
  }
  return match[0];
}

function extractSectionPropertiesParagraph(sectionXml: string): string {
  const match = sectionXml.match(/<hp:p\b[\s\S]*?<hp:secPr\b[\s\S]*?<\/hp:p>/);
  if (!match) {
    throw new Error("HWPX section properties were not found.");
  }
  return match[0];
}

function paragraph(text: string, options: { heading?: boolean; pageBreak?: boolean } = {}): string {
  const paraPrIDRef = options.heading ? "38" : "51";
  const charPrIDRef = options.heading ? "35" : "29";
  return `<hp:p id="0" paraPrIDRef="${paraPrIDRef}" styleIDRef="0" pageBreak="${options.pageBreak ? "1" : "0"}" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPrIDRef}"><hp:t>${textToHwpxText(text)}</hp:t></hp:run><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1200" textheight="1200" baseline="1020" spacing="360" horzpos="0" horzsize="48188" flags="393216"/></hp:linesegarray></hp:p>`;
}

function compact(value: string, maxLength = 560): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function generatedPlanLines(plan: GeneratedPlan): string[] {
  const lines = [
    "□ 창업 아이템 개요(요약)",
    "",
    `<명칭> ${compact(plan.basicInfo.body.split("\n")[0] || plan.itemSummary.body, 120)}`,
    `<아이템 개요> ${compact(plan.itemSummary.body, 420)}`,
    `<문제 인식(Problem)> ${compact(plan.problem.body, 420)}`,
    `<실현 가능성(Solution)> ${compact(plan.solution.body, 420)}`,
    `<성장전략(Scale-up)> ${compact(`${plan.market.body} ${plan.businessModel.body} ${plan.scaleUp.body}`, 520)}`,
    `<팀 구성(Team)> ${compact(plan.team.body, 360)}`,
    "<이미지> 제품·서비스 구조도 또는 MVP 화면 이미지를 삽입할 수 있습니다.",
    "",
  ];

  const bodyOrder: Array<{ key: SectionKey; title: string }> = [
    { key: "problem", title: "1. 문제 인식 (Problem)_창업 아이템의 필요성" },
    { key: "solution", title: "2. 실현 가능성 (Solution)_창업 아이템의 개발 계획" },
    { key: "market", title: "3. 시장 및 고객 정의" },
    { key: "competitor", title: "4. 경쟁 분석 및 차별화 전략" },
    { key: "businessModel", title: "5. 비즈니스 모델 및 수익화 계획" },
    { key: "scaleUp", title: "6. 성장전략 (Scale-up)_시장 진입 및 확장" },
    { key: "budget", title: "7. 사업비 사용계획" },
    { key: "roadmap", title: "8. 추진 일정 및 로드맵" },
    { key: "team", title: "9. 팀 구성 (Team)_역량 활용 계획" },
    { key: "partners", title: "10. 협력기관 및 파트너 활용 계획" },
  ];

  bodyOrder.forEach((item) => {
    const section = plan[item.key];
    lines.push(item.title, "", section.body, "");
  });

  lines.push("자가진단", "");
  plan.selfDiagnosis.forEach((item) => {
    lines.push(`- ${item.label}: ${item.status} / ${item.comment}`);
  });

  return lines;
}

function buildGeneratedSectionXml(templateSectionXml: string, plan: GeneratedPlan): string {
  const rootOpen = extractRootOpen(templateSectionXml);
  const secPrParagraph = extractSectionPropertiesParagraph(templateSectionXml);
  const content = generatedPlanLines(plan)
    .flatMap((line, index) => {
      if (!line.trim()) return [paragraph(" ")];
      const isHeading = index === 0 || /^\d+\.\s|^자가진단/.test(line);
      return [paragraph(line, { heading: isHeading })];
    })
    .join("");

  return `${rootOpen}${secPrParagraph}${content}</hs:sec>`;
}

export async function hasHwpxTemplate(): Promise<boolean> {
  try {
    await fs.access(templatePath);
    return true;
  } catch {
    return false;
  }
}

export async function getHwpxTemplateStatus(): Promise<{
  available: boolean;
  placeholders: string[];
  generatedExport: boolean;
}> {
  if (!(await hasHwpxTemplate())) {
    return { available: false, placeholders: [], generatedExport: false };
  }

  const buffer = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const placeholders = new Set<string>();

  await Promise.all(
    Object.values(zip.files).map(async (file) => {
      if (file.dir || !/\.(xml|txt|hpf|rdf)$/i.test(file.name)) return;
      const text = await file.async("string");
      const matches = text.match(placeholderPattern) ?? [];
      matches.forEach((match) => placeholders.add(match));
    }),
  );

  return { available: true, placeholders: [...placeholders].sort(), generatedExport: true };
}

export async function createHwpxFromTemplate(plan: GeneratedPlan): Promise<Buffer> {
  const buffer = await fs.readFile(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const replacements = placeholderMap(plan);
  let replacementCount = 0;

  await Promise.all(
    Object.values(zip.files).map(async (file) => {
      if (file.dir || !/\.(xml|txt|hpf|rdf)$/i.test(file.name)) return;
      let text = await file.async("string");
      Object.entries(replacements).forEach(([key, value]) => {
        const marker = `{{${key}}}`;
        if (text.includes(marker)) replacementCount += text.split(marker).length - 1;
        text = text.replaceAll(marker, escapeXml(value));
      });
      zip.file(file.name, text);
    }),
  );

  if (replacementCount === 0) {
    const sectionFile = zip.file("Contents/section0.xml");
    if (!sectionFile) {
      throw new Error("HWPX section XML was not found.");
    }
    const sectionXml = await sectionFile.async("string");
    zip.file("Contents/section0.xml", buildGeneratedSectionXml(sectionXml, plan));
  }

  zip.file("Preview/PrvText.txt", generatedPlanLines(plan).join("\r\n"));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
