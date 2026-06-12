import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createHwpxFromTemplate, hasHwpxTemplate } from "@/lib/hwpx";
import { generatedPlanSchema } from "@/lib/schema";
import { sanitizeGeneratedPlan } from "@/lib/privacy";
import type { GeneratedPlan } from "@/types/plan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await hasHwpxTemplate())) {
      return NextResponse.json(
        { error: "HWPX \uD15C\uD50C\uB9BF\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." },
        { status: 404 },
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

    const plan = sanitizeGeneratedPlan(generatedPlanSchema.parse((body as { plan?: unknown }).plan) as GeneratedPlan);
    const buffer = await createHwpxFromTemplate(plan);
    const bytes = new Uint8Array(buffer);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": "attachment; filename=\"planforge-psst-draft.hwpx\"",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "\uC0DD\uC131 \uACB0\uACFC JSON\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694." },
        { status: 422 },
      );
    }

    const message = error instanceof Error ? error.message : "HWPX \uB0B4\uBCF4\uB0B4\uAE30\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
