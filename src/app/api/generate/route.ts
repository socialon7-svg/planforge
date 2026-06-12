import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateBusinessPlan } from "@/lib/openai";
import { ideaInputSchema } from "@/lib/schema";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(clientIp(request))) {
      return NextResponse.json(
        { error: "\uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. 1\uBD84 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "\uC694\uCCAD JSON\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694." },
        { status: 400 },
      );
    }

    const input = ideaInputSchema.parse(body);
    const plan = await generateBusinessPlan(input);

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "\uC785\uB825\uAC12\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694." },
        { status: 422 },
      );
    }

    const message = error instanceof Error ? error.message : "\uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
    const upstreamStatus = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : undefined;
    const missingKey =
      message.includes("NVIDIA_API_KEY") || message.includes("OPENAI_API_KEY") || message.includes("GEMINI_API_KEY");
    const status = missingKey ? 500 : upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500 ? upstreamStatus : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
