import { NextResponse } from "next/server";
import { getHwpxTemplateStatus } from "@/lib/hwpx";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getHwpxTemplateStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to inspect HWPX template.";
    return NextResponse.json({ available: false, placeholders: [], error: message }, { status: 500 });
  }
}
