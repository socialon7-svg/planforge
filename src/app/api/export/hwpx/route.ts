import { NextResponse } from "next/server";
import { createHwpxFromTemplate, hasHwpxTemplate } from "@/lib/hwpx";
import { generatedPlanSchema } from "@/lib/schema";
import type { GeneratedPlan } from "@/types/plan";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await hasHwpxTemplate())) {
      return NextResponse.json({ error: "HWPX template is not available." }, { status: 404 });
    }

    const body = await request.json();
    const plan = generatedPlanSchema.parse(body.plan) as GeneratedPlan;
    const buffer = await createHwpxFromTemplate(plan);
    const bytes = new Uint8Array(buffer);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": "attachment; filename=\"planforge-psst-draft.hwpx\"",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export HWPX.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
