import OpenAI from "openai";
import type { GeneratedPlan, IdeaInput } from "@/types/plan";
import { buildRagContext } from "@/lib/rag";
import { buildUserPrompt, systemPrompt } from "@/lib/prompt";
import { generatedPlanSchema } from "@/lib/schema";
import { normalizeDiagnosis } from "@/lib/diagnosis";

let cachedClient: OpenAI | null = null;

type AiProvider = "openai" | "gemini";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
};

type GeminiApiError = Error & { status?: number };

function selectedProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === "gemini" || configured === "openai") return configured;
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "openai";
}

function geminiModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const fallbackModels = process.env.GEMINI_FALLBACK_MODELS ?? "gemini-2.0-flash,gemini-2.0-flash-lite";
  return [...configured.split(","), ...fallbackModels.split(",")]
    .map((model) => model.trim().replace(/^models\//, ""))
    .filter(Boolean)
    .filter((model, index, models) => models.indexOf(model) === index);
}

function shouldTryNextGeminiModel(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as GeminiApiError).status;
  const message = error.message.toLowerCase();
  return status === 429 || status === 503 || (status === 400 && message.includes("high demand"));
}

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

function parseGeneratedPlan(content: string): GeneratedPlan {
  if (!content) {
    throw new Error("AI \uC751\uB2F5\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
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

async function generateWithOpenAI(input: IdeaInput): Promise<GeneratedPlan> {
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
  return parseGeneratedPlan(content ?? "");
}

async function generateWithGemini(input: IdeaInput): Promise<GeneratedPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ragContext = buildRagContext(input);
  const models = geminiModelCandidates();

  let lastError: unknown;
  for (const modelPath of models) {
    try {
      return await requestGeminiPlan({ apiKey, modelPath, input, ragContext });
    } catch (error) {
      lastError = error;
      if (!shouldTryNextGeminiModel(error)) break;
    }
  }

  throw lastError;
}

async function requestGeminiPlan({
  apiKey,
  modelPath,
  input,
  ragContext,
}: {
  apiKey: string;
  modelPath: string;
  input: IdeaInput;
  ragContext: ReturnType<typeof buildRagContext>;
}): Promise<GeneratedPlan> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelPath)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildUserPrompt(input, ragContext) }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 8000,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      },
    );

    const data = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      const message = data.error?.message || "Gemini API request failed.";
      throw Object.assign(new Error(message), { status: response.status });
    }

    const content =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    return parseGeneratedPlan(content);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI \uC751\uB2F5 \uC2DC\uAC04\uC774 \uCD08\uACFC\uB410\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateBusinessPlan(input: IdeaInput): Promise<GeneratedPlan> {
  return selectedProvider() === "gemini" ? generateWithGemini(input) : generateWithOpenAI(input);
}
