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

function labeledValue(text: string, labels: string[], maxLength = 90): string | undefined {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:\uFF1A]\\s*([^\\n]+)`));
    if (match?.[1]) return compact(match[1], maxLength);
  }
  return undefined;
}

function firstContentLine(text: string): string | undefined {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-\s]+/, "").trim())
    .find(Boolean);
  return firstLine ? compact(firstLine, 90) : undefined;
}

function firstLabeledValue(text: string, labels: string[], fallback: string): string {
  return labeledValue(text, labels) ?? firstContentLine(text) ?? compact(fallback, 90);
}

function replacementValue(value: string, maxLength = 170): string {
  return compact(value, maxLength) || "추가 작성이 필요합니다.";
}

function setTemplateReplacement(replacements: Map<number, string>, index: number, value: string, maxLength = 170): void {
  replacements.set(index, replacementValue(value, maxLength));
}

function setTemplateRows(
  replacements: Map<number, string>,
  indexes: number[],
  values: string[],
  maxLength = 120,
): void {
  indexes.forEach((index, valueIndex) => {
    setTemplateReplacement(replacements, index, values[valueIndex] ?? "세부 실행계획 추가 작성 필요", maxLength);
  });
}

function amountRows(totalBudget: string): string[] {
  const budget = compact(totalBudget, 40);
  return budget && !budget.includes("추가 작성")
    ? [`${budget} 내 배분`, `${budget} 내 배분`, `${budget} 내 배분`, `${budget} 내 배분`]
    : ["산출근거 기반 산정", "산출근거 기반 산정", "산출근거 기반 산정", "산출근거 기반 산정"];
}

function makeTemplateTextReplacements(plan: GeneratedPlan): Map<number, string> {
  const itemName = firstLabeledValue(plan.basicInfo.body, ["창업아이템명", "명칭"], plan.itemSummary.body);
  const category = firstLabeledValue(plan.basicInfo.body, ["산업 분야", "범주"], plan.market.body);
  const outputs = firstLabeledValue(plan.basicInfo.body, ["목표 산출물", "산출물"], plan.budget.body);
  const totalBudget =
    labeledValue(plan.basicInfo.body, ["예상 정부지원사업비", "정부지원사업비", "사업비"], 60) ??
    firstContentLine(plan.budget.body) ??
    "추가 작성 필요";
  const problemSegments = shortSegments(`${plan.problem.body}\n${plan.market.body}`, 6, 170);
  const solutionSegments = shortSegments(plan.solution.body, 5, 170);
  const competitorSegments = shortSegments(plan.competitor.body, 4, 160);
  const businessSegments = shortSegments(`${plan.businessModel.body}\n${plan.scaleUp.body}`, 6, 165);
  const budgetSegments = shortSegments(plan.budget.body, 6, 150);
  const roadmapSegments = shortSegments(plan.roadmap.body, 8, 150);
  const teamSegments = shortSegments(`${plan.team.body}\n${plan.partners.body}`, 5, 160);
  const amounts = amountRows(totalBudget);
  const replacements = new Map<number, string>();

  setTemplateReplacement(replacements, 3, itemName, 90);
  setTemplateReplacement(replacements, 5, category, 90);
  setTemplateReplacement(replacements, 7, plan.itemSummary.body, 300);
  setTemplateReplacement(replacements, 8, `목표 산출물: ${outputs}`, 160);
  setTemplateReplacement(replacements, 10, `${plan.problem.body}\n${plan.market.body}`, 320);
  setTemplateReplacement(replacements, 12, plan.solution.body, 280);
  setTemplateReplacement(replacements, 13, plan.competitor.body, 220);
  setTemplateReplacement(replacements, 15, `${plan.businessModel.body}\n${plan.scaleUp.body}`, 320);
  setTemplateReplacement(replacements, 17, `${plan.team.body}\n${plan.partners.body}`, 260);
  setTemplateReplacement(replacements, 19, "MVP 화면, 서비스 흐름도, 고객 사용 장면은 별도 이미지로 삽입 예정입니다.", 95);
  setTemplateReplacement(replacements, 20, "제품·서비스 구조도 또는 검증 화면 이미지를 삽입할 수 있습니다.", 95);
  setTemplateReplacement(replacements, 21, "MVP 화면 또는 서비스 흐름도", 70);
  setTemplateReplacement(replacements, 22, "제품·서비스 구조도", 70);

  setTemplateReplacement(replacements, 25, `${plan.problem.body}\n${plan.market.body}`, 380);
  setTemplateRows(replacements, [26, 27, 28, 29, 30, 31], problemSegments, 170);

  setTemplateReplacement(replacements, 34, `${plan.solution.body}\n${plan.budget.body}`, 380);
  setTemplateRows(
    replacements,
    [35, 36, 37, 38, 39],
    [...solutionSegments.slice(0, 3), budgetSegments[0], competitorSegments[0]],
    170,
  );

  setTemplateRows(replacements, [48, 52, 56, 60], ["MVP 핵심 기능 개발", "고객 검증 및 파일럿", "개선·고도화", "시제품 완성 및 사업화 준비"], 80);
  setTemplateRows(replacements, [49, 53, 57, 61], ["협약 1~2개월", "협약 3~4개월", "협약 5개월", "협약기간 말"], 50);
  setTemplateRows(replacements, [50, 54, 58, 62], roadmapSegments.slice(0, 4), 150);

  setTemplateReplacement(replacements, 65, `1단계 정부지원사업비는 ${totalBudget} 기준으로 MVP 개발, 고객 검증, 사업화 자료 제작 산출물과 직접 연결되도록 집행합니다.`, 170);
  setTemplateRows(replacements, [69, 74, 77], ["개발비", "실증·외주용역비", "사업화비"], 50);
  setTemplateRows(replacements, [70, 72, 75, 78], budgetSegments.slice(0, 4), 150);
  setTemplateRows(replacements, [71, 73, 76, 79], amounts, 55);
  setTemplateReplacement(replacements, 82, totalBudget, 55);

  setTemplateReplacement(replacements, 84, `2단계 사업비는 1단계 검증 결과를 근거로 기능 고도화, 유료 고객 전환, 파트너십 확장, 시장진입 자료 제작에 배분합니다.`, 170);
  setTemplateRows(replacements, [88, 93, 96], ["고도화 개발비", "검증·외주용역비", "시장진입비"], 50);
  setTemplateRows(replacements, [89, 91, 94, 97], budgetSegments.slice(2, 6), 150);
  setTemplateRows(replacements, [90, 92, 95, 98], amounts, 55);
  setTemplateReplacement(replacements, 101, "추가 검증 후 확정", 55);

  setTemplateReplacement(replacements, 104, `${plan.competitor.body}\n${plan.scaleUp.body}`, 320);
  setTemplateReplacement(replacements, 105, plan.businessModel.body, 280);
  setTemplateReplacement(replacements, 106, plan.roadmap.body, 260);
  setTemplateReplacement(replacements, 107, "환경·사회적 가치는 고객 검증 후 정량 지표를 추가 검증 필요 항목으로 관리하고, 실제 절감 효과가 확인된 범위에서만 제시합니다.", 160);
  setTemplateReplacement(replacements, 108, "초기 고객과 협력기관의 피드백을 반영해 서비스 접근성, 사용성, 운영 프로세스를 개선하고 반복 적용 가능한 도입 절차를 정리합니다.", 160);
  setTemplateReplacement(replacements, 109, "개인정보와 고객 데이터를 최소 수집하고 운영 기준을 문서화하여, 사업화 과정에서 신뢰성과 관리 체계를 함께 확보합니다.", 160);
  setTemplateRows(replacements, [110, 111, 112, 113, 114, 115], businessSegments, 165);

  setTemplateRows(replacements, [124, 128, 132, 136], ["MVP 설계 및 프로토타입", "파일럿 운영", "유료 베타 전환", "시장 확대 및 파트너십"], 80);
  setTemplateRows(replacements, [125, 129, 133, 137], ["1년차 상반기", "1년차 하반기", "2년차", "3년차"], 50);
  setTemplateRows(replacements, [126, 130, 134, 138], roadmapSegments.slice(4, 8), 150);

  setTemplateReplacement(replacements, 16, "팀 구성\n(Team)", 40);
  setTemplateReplacement(replacements, 17, teamSegments.join(" "), 260);

  return replacements;
}

function fillOfficialTemplateSectionXml(sectionXml: string, plan: GeneratedPlan): string {
  const replacements = makeTemplateTextReplacements(plan);
  let textNodeIndex = -1;
  let appliedCount = 0;
  const filled = sectionXml.replace(/<hp:t>([\s\S]*?)<\/hp:t>/g, (match) => {
    textNodeIndex += 1;
    const value = replacements.get(textNodeIndex);
    if (value === undefined) return match;
    appliedCount += 1;
    return `<hp:t>${textToHwpxText(value)}</hp:t>`;
  });

  if (textNodeIndex < 120 || appliedCount < 40) {
    throw new Error("The HWPX template structure did not match the expected PSST form.");
  }

  return filled;
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
    try {
      zip.file("Contents/section0.xml", fillOfficialTemplateSectionXml(sectionXml, plan));
    } catch (error) {
      if (process.env.HWPX_ALLOW_SYNTHETIC_FALLBACK !== "true") {
        throw error;
      }
      zip.file("Contents/section0.xml", buildGeneratedSectionXml(sectionXml, plan));
    }
  }

  zip.file("Preview/PrvText.txt", generatedPlanLines(plan).join("\r\n"));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
