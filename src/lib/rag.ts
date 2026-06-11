import fs from "node:fs";
import path from "node:path";
import type { IdeaInput, RagChunk, RagReference, SectionKey } from "@/types/plan";
import { sectionDatasetLabels, sectionLabels } from "@/lib/sections";

const dataPath = path.join(process.cwd(), "data", "rag_chunks_redacted.jsonl");
let cachedChunks: RagChunk[] | null = null;

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length >= 2),
  );
}

export function loadRagChunks(): RagChunk[] {
  if (cachedChunks) return cachedChunks;
  if (!fs.existsSync(dataPath)) {
    cachedChunks = [];
    return cachedChunks;
  }

  cachedChunks = fs
    .readFileSync(dataPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as RagChunk];
      } catch {
        return [];
      }
    });

  return cachedChunks;
}

function inputText(input: IdeaInput): string {
  return [
    input.itemName,
    input.oneLine,
    input.industry,
    input.customers,
    input.customerProblem,
    input.solution,
    input.coreTech,
    input.competitors,
    input.revenueModel,
    input.currentStatus,
    input.team,
    input.expectedBudget,
    input.targetOutputs,
    input.notes,
  ].join(" ");
}

export function searchRagReferences(
  input: IdeaInput,
  sectionKey: SectionKey,
  limit = 5,
): RagReference[] {
  const chunks = loadRagChunks();
  const queryText = inputText(input);
  const normalizedQueryText = normalize(queryText);
  const queryTokens = tokenize(queryText);
  const industryTokens = tokenize(input.industry);
  const sectionLabel = normalize(sectionDatasetLabels[sectionKey]);

  return chunks
    .map((chunk) => {
      const tags = chunk.tags ?? [];
      const searchable = [
        chunk.section,
        chunk.industry,
        chunk.purpose,
        chunk.reusable_logic,
        tags.join(" "),
      ].join(" ");
      const chunkTokens = tokenize(searchable);
      let overlap = 0;
      queryTokens.forEach((token) => {
        if (chunkTokens.has(token)) overlap += 1;
      });

      let industryMatch = 0;
      const chunkIndustry = tokenize(chunk.industry ?? "");
      industryTokens.forEach((token) => {
        if (chunkIndustry.has(token)) industryMatch += 1;
      });

      const sectionMatch = normalize(chunk.section) === sectionLabel ? 8 : 0;
      const tagMatch = tags.reduce((sum, tag) => {
        const tagText = normalize(tag);
        return sum + (tagText && normalizedQueryText.includes(tagText) ? 2 : 0);
      }, 0);

      return {
        chunkId: chunk.chunk_id,
        section: chunk.section ?? "Unknown",
        industry: chunk.industry,
        purpose: chunk.purpose,
        tags,
        reusableLogic: chunk.reusable_logic,
        score: overlap + industryMatch * 2 + sectionMatch + tagMatch,
      } satisfies RagReference;
    })
    .filter((reference) => reference.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildRagContext(input: IdeaInput): Record<SectionKey, RagReference[]> {
  return Object.fromEntries(
    (Object.keys(sectionLabels) as SectionKey[]).map((sectionKey) => [
      sectionKey,
      searchRagReferences(input, sectionKey, 4),
    ]),
  ) as Record<SectionKey, RagReference[]>;
}
