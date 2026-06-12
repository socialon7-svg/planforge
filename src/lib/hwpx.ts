import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { GeneratedPlan } from "@/types/plan";
import { sectionKeys, type SectionKey } from "@/types/plan";
import { sectionPlaceholders } from "@/lib/sections";

const templatePath = path.join(process.cwd(), "templates", "official_template.hwpx");
const placeholderPattern = /\{\{[A-Z_]+\}\}/g;
const replacementPattern = /\{\{([A-Z_]+)\}\}/g;
const diagnosisHeading = "\uC790\uAC00\uC9C4\uB2E8";

function escapeXml(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textToHwpxText(value: string): string {
  return escapeXml(value.replace(/\r?\n/g, " "));
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

function replacePlaceholders(
  text: string,
  replacements: Record<string, string>,
): { text: string; replacementCount: number } {
  let replacementCount = 0;
  const replaced = text.replace(replacementPattern, (match, key: string, offset: number, source: string) => {
    if (!(key in replacements)) return match;
    replacementCount += 1;
    const before = source.slice(0, offset);
    const insideTextNode = before.lastIndexOf("<hp:t") > before.lastIndexOf("</hp:t>");
    return insideTextNode ? textToHwpxText(replacements[key]) : escapeXml(replacements[key]);
  });

  return { text: replaced, replacementCount };
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

function paragraph(
  id: number,
  text: string,
  options: { heading?: boolean; pageBreak?: boolean } = {},
): string {
  const paraPrIDRef = options.heading ? "38" : "51";
  const charPrIDRef = options.heading ? "35" : "29";
  return `<hp:p id="${id}" paraPrIDRef="${paraPrIDRef}" styleIDRef="0" pageBreak="${options.pageBreak ? "1" : "0"}" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPrIDRef}"><hp:t>${textToHwpxText(text)}</hp:t></hp:run></hp:p>`;
}

function paragraphs(
  startId: number,
  text: string,
  options: { heading?: boolean; pageBreak?: boolean } = {},
): { xml: string; nextId: number } {
  const lines = text.split(/\r?\n/);
  let nextId = startId;
  const xml = lines
    .map((line, index) =>
      paragraph(nextId++, line.trimEnd() || " ", {
        ...options,
        pageBreak: index === 0 ? options.pageBreak : false,
      }),
    )
    .join("");

  return { xml, nextId };
}

function compact(value: string, maxLength = 560): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const ellipsis = "...";
  const truncated = normalized.slice(0, Math.max(0, maxLength - ellipsis.length)).trimEnd();
  const sentenceEnds = [".", "?", "!", "다.", "요.", "함.", "됨.", "음."];
  const lastSentenceEnd = sentenceEnds.reduce((best, marker) => {
    const index = truncated.lastIndexOf(marker);
    return index > best ? index + marker.length : best;
  }, -1);

  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.slice(0, lastSentenceEnd).trimEnd();
  }

  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.5) {
    return `${truncated.slice(0, lastSpace).trimEnd()}${ellipsis}`;
  }

  return `${truncated}${ellipsis}`;
}

function generatedPlanLines(plan: GeneratedPlan): string[] {
  const lines = [
    "\u25A1 \uCC3D\uC5C5 \uC544\uC774\uD15C \uAC1C\uC694(\uC694\uC57D)",
    "",
    `<\uBA85\uCE6D> ${compact(plan.basicInfo.body.split("\n")[0] || plan.itemSummary.body, 120)}`,
    `<\uC544\uC774\uD15C \uAC1C\uC694> ${compact(plan.itemSummary.body, 420)}`,
    `<\uBB38\uC81C \uC778\uC2DD(Problem)> ${compact(plan.problem.body, 420)}`,
    `<\uC2E4\uD604 \uAC00\uB2A5\uC131(Solution)> ${compact(plan.solution.body, 420)}`,
    `<\uC131\uC7A5\uC804\uB7B5(Scale-up)> ${compact(`${plan.market.body} ${plan.businessModel.body} ${plan.scaleUp.body}`, 520)}`,
    `<\uD300 \uAD6C\uC131(Team)> ${compact(plan.team.body, 360)}`,
    `<\uC774\uBBF8\uC9C0> \uC81C\uD488\u00B7\uC11C\uBE44\uC2A4 \uAD6C\uC870\uB3C4 \uB610\uB294 MVP \uD654\uBA74 \uC774\uBBF8\uC9C0\uB97C \uC0BD\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`,
    "",
  ];

  const bodyOrder: Array<{ key: SectionKey; title: string }> = [
    { key: "problem", title: "1. \uBB38\uC81C \uC778\uC2DD (Problem)_\uCC3D\uC5C5 \uC544\uC774\uD15C\uC758 \uD544\uC694\uC131" },
    { key: "solution", title: "2. \uC2E4\uD604 \uAC00\uB2A5\uC131 (Solution)_\uCC3D\uC5C5 \uC544\uC774\uD15C\uC758 \uAC1C\uBC1C \uACC4\uD68D" },
    { key: "market", title: "3. \uC2DC\uC7A5 \uBC0F \uACE0\uAC1D \uC815\uC758" },
    { key: "competitor", title: "4. \uACBD\uC7C1 \uBD84\uC11D \uBC0F \uCC28\uBCC4\uD654 \uC804\uB7B5" },
    { key: "businessModel", title: "5. \uBE44\uC988\uB2C8\uC2A4 \uBAA8\uB378 \uBC0F \uC218\uC775\uD654 \uACC4\uD68D" },
    { key: "scaleUp", title: "6. \uC131\uC7A5\uC804\uB7B5 (Scale-up)_\uC2DC\uC7A5 \uC9C4\uC785 \uBC0F \uD655\uC7A5" },
    { key: "budget", title: "7. \uC0AC\uC5C5\uBE44 \uC0AC\uC6A9\uACC4\uD68D" },
    { key: "roadmap", title: "8. \uCD94\uC9C4 \uC77C\uC815 \uBC0F \uB85C\uB4DC\uB9F5" },
    { key: "team", title: "9. \uD300 \uAD6C\uC131 (Team)_\uC5ED\uB7C9 \uD65C\uC6A9 \uACC4\uD68D" },
    { key: "partners", title: "10. \uD611\uB825\uAE30\uAD00 \uBC0F \uD30C\uD2B8\uB108 \uD65C\uC6A9 \uACC4\uD68D" },
  ];

  bodyOrder.forEach((item) => {
    const section = plan[item.key];
    lines.push(item.title, "", section.body, "");
  });

  lines.push(diagnosisHeading, "");
  plan.selfDiagnosis.forEach((item) => {
    lines.push(`- ${item.label}: ${item.status} / ${item.comment}`);
  });

  return lines;
}

function buildGeneratedSectionXml(templateSectionXml: string, plan: GeneratedPlan): string {
  const rootOpen = extractRootOpen(templateSectionXml);
  const secPrParagraph = extractSectionPropertiesParagraph(templateSectionXml);
  let paragraphId = 1;
  const content = generatedPlanLines(plan)
    .flatMap((line, index) => {
      if (!line.trim()) return [paragraph(paragraphId++, " ")];
      const isHeading = index === 0 || /^\d+\.\s/.test(line) || line === diagnosisHeading;
      const result = paragraphs(paragraphId, line, { heading: isHeading });
      paragraphId = result.nextId;
      return [result.xml];
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
      const text = await file.async("string");
      const result = replacePlaceholders(text, replacements);
      replacementCount += result.replacementCount;
      zip.file(file.name, result.text);
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
