import OpenAI from "openai";
import type { GeneratedPlan, IdeaInput } from "@/types/plan";
import { buildRagContext } from "@/lib/rag";
import { buildUserPrompt, systemPrompt } from "@/lib/prompt";
import { generatedPlanSchema } from "@/lib/schema";
import { normalizeDiagnosis } from "@/lib/diagnosis";

export async function generateBusinessPlan(input: IdeaInput): Promise<GeneratedPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ragContext = buildRagContext(input);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(input, ragContext) },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = generatedPlanSchema.parse(JSON.parse(content));
  return normalizeDiagnosis(parsed as GeneratedPlan);
}
