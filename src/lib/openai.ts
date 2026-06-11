import OpenAI from "openai";
import type { GeneratedPlan, IdeaInput } from "@/types/plan";
import { buildRagContext } from "@/lib/rag";
import { buildUserPrompt, systemPrompt } from "@/lib/prompt";
import { generatedPlanSchema } from "@/lib/schema";
import { normalizeDiagnosis } from "@/lib/diagnosis";

let cachedClient: OpenAI | null = null;

function openaiClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  cachedClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60_000,
  });

  return cachedClient;
}

export async function generateBusinessPlan(input: IdeaInput): Promise<GeneratedPlan> {
  const client = openaiClient();
  const ragContext = buildRagContext(input);

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.35,
    max_tokens: 8000,
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

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("AI \uC751\uB2F5\uC744 \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
  }

  const parsed = generatedPlanSchema.parse(json);
  return normalizeDiagnosis(parsed as GeneratedPlan);
}
