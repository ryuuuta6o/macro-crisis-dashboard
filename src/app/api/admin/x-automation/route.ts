import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/x-automation/admin-auth";
import { runAutomationSlot } from "@/lib/x-automation/orchestrator";
import { getNextPosting } from "@/lib/x-automation/schedule";
import { getAutomationStore } from "@/lib/x-automation/storage";
import { isValidXText } from "@/lib/x-automation/x-text";
import { getXPostMetrics } from "@/lib/x-automation/x-client";
import type { AutomationSettings, PostingSlot } from "@/types/x-automation";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

function environmentStatus() {
  const hasUpstashRest =
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  return {
    xCredentials: Boolean(process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN_SECRET),
    llm: Boolean(process.env.LLM_API_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    adminSecret: Boolean(process.env.ADMIN_SECRET),
    persistentStorage: hasUpstashRest,
  };
}

async function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorized();
  const state = await getAutomationStore().getState();
  return NextResponse.json({ ...state, environment: environmentStatus(), nextPosting: getNextPosting() });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return unauthorized();
  const body = await request.json() as {
    action?: "run" | "settings" | "edit" | "metrics";
    slot?: PostingSlot;
    settings?: AutomationSettings;
    runId?: string;
    text?: string;
  };
  const store = getAutomationStore();
  if (body.action === "run" && body.slot) {
    return NextResponse.json(await runAutomationSlot(body.slot, { manual: true }));
  }
  if (body.action === "settings" && body.settings) {
    await store.updateSettings(body.settings);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "edit" && body.runId && body.text) {
    if (!isValidXText(body.text)) return NextResponse.json({ error: "X文字数制限を超えています。" }, { status: 400 });
    const state = await store.getState();
    const run = state.runs.find((item) => item.id === body.runId);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    run.finalText = body.text.trim();
    if (run.editorial) run.editorial.final_text = run.finalText;
    await store.saveRun(run);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "metrics") {
    const state = await store.getState();
    const results = await Promise.allSettled(
      state.runs.filter((run) => run.postId).slice(0, 20).map(async (run) => {
        run.metrics = await getXPostMetrics(run.postId!);
        await store.saveRun(run);
        return run.id;
      }),
    );
    return NextResponse.json({
      updated: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
    });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
