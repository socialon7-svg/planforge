import type { IdeaInput, RagReference } from "@/types/plan";
import { sectionGuides, sectionLabels } from "@/lib/sections";

export const systemPrompt = `You are PlanForge RAG, a senior Korean public grant business-plan drafting assistant.

Hard rules:
- Write the generated business-plan draft in Korean.
- Never expose original PDF names, source_file, real names, schools, workplaces, file names, phone numbers, emails, or personal data.
- Do not copy RAG chunk sentences. Use only reusable logic, section structure, and writing patterns.
- The output must be newly written for the user's startup idea.
- Do not invent specific team members or personal credentials not provided by the user.
- If market size or statistics are mentioned, mark them with the Korean phrase "\uCD94\uAC00 \uAC80\uC99D \uD544\uC694".
- Write in a practical Korean public-support-program proposal style.
- Prefer concrete execution plans, outputs, customers, and validation methods over advertising language.
- Return only valid JSON matching the requested schema.`;

export function buildUserPrompt(
  input: IdeaInput,
  ragContext: Record<string, RagReference[]>,
): string {
  const sectionInstructions = Object.entries(sectionLabels)
    .map(([key, label]) => `- ${key} (${label}): ${sectionGuides[key as keyof typeof sectionGuides]}`)
    .join("\n");

  const sanitizedRag = Object.fromEntries(
    Object.entries(ragContext).map(([section, refs]) => [
      section,
      refs.map((ref) => ({
        section: ref.section,
        industry: ref.industry,
        purpose: ref.purpose,
        tags: ref.tags,
        reusableLogic: ref.reusableLogic,
      })),
    ]),
  );

  return `User startup idea:
${JSON.stringify(input, null, 2)}

Section writing rules:
${sectionInstructions}

RAG references:
Use the following only for structure, reasoning flow, and evaluation perspective. Do not output source_file, chunk_id, or page_range.
${JSON.stringify(sanitizedRag, null, 2)}

Return JSON schema:
{
  "basicInfo": {"title": "Basic Info", "body": "..."},
  "itemSummary": {"title": "Item Summary", "body": "..."},
  "problem": {"title": "Problem", "body": "..."},
  "solution": {"title": "Solution", "body": "..."},
  "market": {"title": "Market", "body": "..."},
  "competitor": {"title": "Competitor", "body": "..."},
  "businessModel": {"title": "Business Model", "body": "..."},
  "scaleUp": {"title": "Scale-up", "body": "..."},
  "budget": {"title": "Budget", "body": "..."},
  "roadmap": {"title": "Roadmap", "body": "..."},
  "team": {"title": "Team", "body": "..."},
  "partners": {"title": "Partners", "body": "..."},
  "selfDiagnosis": [
    {"label": "problem recognition specificity", "status": "good|warning|missing", "comment": "..."}
  ]
}

Include exactly these seven self-diagnosis labels, translated into Korean in the returned JSON:
- Is the problem recognition specific?
- Is the customer segment clear?
- Is the solution concrete at MVP level?
- Are competitor alternatives and differentiation clear?
- Is the commercialization strategy executable?
- Is the budget plan connected to outputs?
- Are team capabilities and capability-gap plans included?`;
}
