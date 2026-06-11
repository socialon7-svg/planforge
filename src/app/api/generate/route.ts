import { NextResponse } from "next/server";
import { generateBusinessPlan } from "@/lib/openai";
import { ideaInputSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = ideaInputSchema.parse(body);
    const plan = await generateBusinessPlan(input);

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate plan.";
    const status = message.includes("OPENAI_API_KEY") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
