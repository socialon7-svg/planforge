import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { GeneratedPlan } from "@/types/plan";
import { sectionKeys } from "@/types/plan";
import { sectionPlaceholders } from "@/lib/sections";

const templatePath = path.join(process.cwd(), "templates", "official_template.hwpx");
const placeholderPattern = /\{\{[A-Z_]+\}\}/g;
const replacementPattern = /\{\{([A-Z_]+)\}\}/g;
const diagnosisHeading = "\uC790\uAC00\uC9C4\uB2E8";
const tableWidth = 48188;

type GeneratedBlock =
  | { kind: "paragraph"; text: string; heading?: boolean }
  | { kind: "table"; rows: string[][]; widths?: number[]; headerRows?: number };

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
  const match = sectionXml.match(/<hp:secPr\b[\s\S]*?<\/hp:secPr>/);
  if (!match) {
    throw new Error("HWPX section properties were not found.");
  }
  return `<hp:p id="0" paraPrIDRef="51" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="29"><hp:ctrl>${match[0]}</hp:ctrl></hp:run></hp:p>`;
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

function shortSegments(value: string, maxCount: number, maxLength = 110): string[] {
  const normalized = value
    .replace(/\r/g, "")
    .replace(/[•◦]/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/^[-\s]+/, "").trim())
    .filter(Boolean);

  const source = normalized.length ? normalized : [value.replace(/\s+/g, " ").trim()].filter(Boolean);
  return source.slice(0, maxCount).map((line) => compact(line, maxLength));
}

function bulletBlock(title: string, value: string, maxCount = 5): string {
  const bullets = shortSegments(value, maxCount).map((line) => `  - ${line}`);
  return [`\u25E6 ${title}`, ...bullets].join("\n");
}

function firstLabeledValue(text: string, labels: string[], fallback: string): string {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:\uFF1A]\\s*([^\\n]+)`));
    if (match?.[1]) return compact(match[1], 90);
  }
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-\s]+/, "").trim())
    .find(Boolean);
  return compact(firstLine || fallback, 90);
}

function tableBlock(rows: string[][], widths?: number[], headerRows = 1): GeneratedBlock {
  return { kind: "table", rows, widths, headerRows };
}

function generatedPlanBlocks(plan: GeneratedPlan): GeneratedBlock[] {
  const itemName = firstLabeledValue(plan.basicInfo.body, ["창업아이템명", "명칭"], plan.itemSummary.body);
  const category = firstLabeledValue(plan.basicInfo.body, ["산업 분야", "범주"], plan.market.body);
  const outputs = firstLabeledValue(plan.basicInfo.body, ["목표 산출물", "산출물"], plan.budget.body);
  const problemSegments = shortSegments(`${plan.problem.body}\n${plan.market.body}`, 4, 95);
  const solutionSegments = shortSegments(plan.solution.body, 4, 95);
  const scaleSegments = shortSegments(`${plan.businessModel.body}\n${plan.scaleUp.body}`, 4, 95);
  const teamSegments = shortSegments(`${plan.team.body}\n${plan.partners.body}`, 4, 95);
  const roadmapSegments = shortSegments(plan.roadmap.body, 4, 90);
  const budgetSegments = shortSegments(plan.budget.body, 4, 90);
  const competitorSegments = shortSegments(plan.competitor.body, 3, 90);

  return [
    { kind: "paragraph", text: "\u25A1 \uCC3D\uC5C5 \uC544\uC774\uD15C \uAC1C\uC694(\uC694\uC57D)", heading: true },
    tableBlock(
      [
        ["명칭", itemName],
        ["범주", category],
        ["아이템 개요", compact(plan.itemSummary.body, 220)],
        ["문제 인식\n(Problem)", problemSegments.join(" ")],
        ["실현 가능성\n(Solution)", solutionSegments.join(" ")],
        ["성장전략\n(Scale-up)", scaleSegments.join(" ")],
        ["팀 구성\n(Team)", teamSegments.join(" ")],
        ["이미지", "제품·서비스 구조도 또는 MVP 화면 이미지를 삽입할 수 있습니다."],
      ],
      [8500, tableWidth - 8500],
      0,
    ),
    { kind: "paragraph", text: `\u25C7 \uBAA9\uD45C \uC0B0\uCD9C\uBB3C: ${compact(outputs, 180)}` },
    { kind: "paragraph", text: "1. \uBB38\uC81C \uC778\uC2DD (Problem)_\uCC3D\uC5C5 \uC544\uC774\uD15C\uC758 \uD544\uC694\uC131", heading: true },
    { kind: "paragraph", text: bulletBlock("시장·고객 문제 및 해결 필요성", `${plan.problem.body}\n${plan.market.body}`, 7) },
    { kind: "paragraph", text: "2. \uC2E4\uD604 \uAC00\uB2A5\uC131 (Solution)_\uCC3D\uC5C5 \uC544\uC774\uD15C\uC758 \uAC1C\uBC1C \uACC4\uD68D", heading: true },
    { kind: "paragraph", text: bulletBlock("MVP 개발 범위 및 차별성", plan.solution.body, 7) },
    tableBlock(
      [
        ["구분", "추진 내용", "추진 기간", "세부 내용"],
        ...roadmapSegments.map((line, index) => [
          `${index + 1}`,
          index === 0 ? "MVP 개발" : index === 1 ? "고객 검증" : index === 2 ? "개선 및 고도화" : "확장 준비",
          index === 0 ? "협약기간 내" : index === 1 ? "1년차" : "2~3년차",
          line,
        ]),
      ],
      [4200, 12000, 9000, tableWidth - 25200],
    ),
    { kind: "paragraph", text: "3. \uC131\uC7A5\uC804\uB7B5 (Scale-up)_\uC0AC\uC5C5\uD654 \uCD94\uC9C4 \uC804\uB7B5", heading: true },
    { kind: "paragraph", text: bulletBlock("시장 진입, 수익모델, 확장 전략", `${plan.businessModel.body}\n${plan.scaleUp.body}`, 7) },
    tableBlock(
      [
        ["경쟁/대체재", "주요 특징", "한계 및 차별화 방향"],
        ["기존 방식", competitorSegments[0] ?? "수기·범용 도구 중심의 대체재", competitorSegments[1] ?? "업무 맥락 반영과 결과 추적이 제한적입니다."],
        ["직접 경쟁군", "동일 고객 문제를 해결하는 제품·서비스", competitorSegments[2] ?? compact(plan.solution.body, 90)],
        ["본 아이템", compact(itemName, 80), "고객 업무 흐름과 검증 산출물 중심으로 차별화합니다."],
      ],
      [10500, 18000, tableWidth - 28500],
    ),
    { kind: "paragraph", text: "4. \uC0AC\uC5C5\uBE44 \uC0AC\uC6A9\uACC4\uD68D \uBC0F \uCD94\uC9C4 \uC77C\uC815", heading: true },
    tableBlock(
      [
        ["비목", "산출 근거", "사업비"],
        ["개발비", budgetSegments[0] ?? "핵심 기능 구현 및 MVP 개발", "총 사업비 내 배분"],
        ["실증비", budgetSegments[1] ?? "고객 검증, 파일럿 운영, 결과 리포트 작성", "총 사업비 내 배분"],
        ["사업화비", budgetSegments[2] ?? "데모 자료, 랜딩 페이지, 초기 고객 확보 활동", "총 사업비 내 배분"],
      ],
      [9000, tableWidth - 21000, 12000],
    ),
    { kind: "paragraph", text: "5. \uD300 \uAD6C\uC131 (Team)_\uC5ED\uB7C9 \uD65C\uC6A9 \uACC4\uD68D", heading: true },
    tableBlock(
      [
        ["구분", "담당 역할", "보유 역량 및 보완계획"],
        ["대표자/기획", teamSegments[0] ?? "고객 문제 정의 및 사업화 전략", teamSegments[1] ?? "고객 검증과 파트너 발굴을 담당합니다."],
        ["개발/제품", "MVP 구현 및 기능 고도화", teamSegments[2] ?? "기술 구현과 사용성 개선을 담당합니다."],
        ["외부 협력", compact(plan.partners.body, 95), teamSegments[3] ?? "부족 역량은 외부 전문가와 협력기관으로 보완합니다."],
      ],
      [9000, 16500, tableWidth - 25500],
    ),
    { kind: "paragraph", text: diagnosisHeading, heading: true },
    tableBlock(
      [
        ["진단 항목", "상태", "검토 의견"],
        ...plan.selfDiagnosis.map((item) => [item.label, item.status, compact(item.comment, 110)]),
      ],
      [15000, 7000, tableWidth - 22000],
    ),
  ];
}

function generatedPlanLines(plan: GeneratedPlan): string[] {
  return generatedPlanBlocks(plan).flatMap((block) =>
    block.kind === "paragraph" ? [block.text, ""] : [...block.rows.map((row) => row.join(" | ")), ""],
  );
}

function tableCellXml({
  col,
  row,
  width,
  height,
  text,
  header,
}: {
  col: number;
  row: number;
  width: number;
  height: number;
  text: string;
  header: boolean;
}): string {
  const paraPrIDRef = header ? "28" : "51";
  const charPrIDRef = header ? "35" : "29";
  const borderFillIDRef = header ? "11" : "7";

  return `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${borderFillIDRef}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0"><hp:p id="2147483648" paraPrIDRef="${paraPrIDRef}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPrIDRef}"><hp:t>${textToHwpxText(text)}</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${width}" height="${height}"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`;
}

function tableXml(id: number, block: Extract<GeneratedBlock, { kind: "table" }>): string {
  const colCount = Math.max(...block.rows.map((row) => row.length));
  const widths =
    block.widths && block.widths.length === colCount
      ? block.widths
      : Array.from({ length: colCount }, () => Math.floor(tableWidth / colCount));
  const rowHeights = block.rows.map((row) => {
    const maxCellLength = Math.max(...row.map((cell) => compact(cell, 180).length), 1);
    return Math.min(5200, Math.max(1500, 1000 + Math.ceil(maxCellLength / 34) * 550));
  });
  const height = rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);

  const rows = block.rows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: colCount }, (_, colIndex) =>
        tableCellXml({
          col: colIndex,
          row: rowIndex,
          width: widths[colIndex],
          height: rowHeights[rowIndex],
          text: compact(row[colIndex] ?? "", 180),
          header: rowIndex < (block.headerRows ?? 1),
        }),
      ).join("");
      return `<hp:tr>${cells}</hp:tr>`;
    })
    .join("");

  return `<hp:tbl id="${id}" zOrder="5" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${block.rows.length}" colCnt="${colCount}" cellSpacing="0" borderFillIDRef="4" noAdjust="1"><hp:sz width="${tableWidth}" widthRelTo="ABSOLUTE" height="${height}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="141" right="141" top="141" bottom="141"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${rows}</hp:tbl>`;
}

function tableParagraph(paragraphId: number, tableId: number, block: Extract<GeneratedBlock, { kind: "table" }>): string {
  return `<hp:p id="${paragraphId}" paraPrIDRef="51" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="29">${tableXml(tableId, block)}</hp:run></hp:p>`;
}

function buildGeneratedSectionXml(templateSectionXml: string, plan: GeneratedPlan): string {
  const rootOpen = extractRootOpen(templateSectionXml);
  const secPrParagraph = extractSectionPropertiesParagraph(templateSectionXml);
  let paragraphId = 1;
  let tableId = 1763000000;
  const content = generatedPlanBlocks(plan)
    .map((block) => {
      if (block.kind === "table") {
        return tableParagraph(paragraphId++, tableId++, block);
      }

      if (!block.text.trim()) return paragraph(paragraphId++, " ");
      const result = paragraphs(paragraphId, block.text, { heading: block.heading });
      paragraphId = result.nextId;
      return result.xml;
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
