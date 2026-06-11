import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { GeneratedPlan } from "@/types/plan";
import { sectionKeys } from "@/types/plan";
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

function placeholderMap(plan: GeneratedPlan): Record<string, string> {
  const values: Record<string, string> = {
    ITEM_NAME: plan.basicInfo.body.split("\n")[0] ?? "",
  };

  sectionKeys.forEach((key) => {
    values[sectionPlaceholders[key]] = plan[key].body;
  });

  return values;
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
}> {
  if (!(await hasHwpxTemplate())) {
    return { available: false, placeholders: [] };
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

  return { available: true, placeholders: [...placeholders].sort() };
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
    throw new Error("HWPX template has no supported placeholders.");
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
