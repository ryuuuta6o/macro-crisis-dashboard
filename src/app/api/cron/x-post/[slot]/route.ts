import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/x-automation/admin-auth";
import { runAutomationSlot } from "@/lib/x-automation/orchestrator";
import type { PostingSlot } from "@/types/x-automation";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const slots = new Set<PostingSlot>(["morning", "midday", "evening"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ slot: string }> },
) {
  if (!verifyCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slot } = await context.params;
  if (!slots.has(slot as PostingSlot)) return NextResponse.json({ error: "Unknown slot" }, { status: 404 });
  const run = await runAutomationSlot(slot as PostingSlot);
  return NextResponse.json({ id: run.id, status: run.status, dryRun: run.dryRun, error: run.error });
}

