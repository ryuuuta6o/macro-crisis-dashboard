import {
  EDITOR_SYSTEM_PROMPT,
  FACT_CHECK_SYSTEM_PROMPT,
  WRITER_SYSTEM_PROMPT,
} from "@/lib/x-automation/prompts";
import { withExponentialBackoff } from "@/lib/x-automation/retry";
import type {
  EditorialResult,
  FactCheckResult,
  GenerationTopic,
  PostCandidate,
  WriterCandidate,
} from "@/types/x-automation";

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

async function structuredResponse<T>(input: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is not configured");
  const endpoint = process.env.LLM_API_URL ?? "https://api.openai.com/v1/responses";
  const response = await withExponentialBackoff(async () => {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "gpt-5-mini",
        instructions: input.system,
        input: input.user,
        text: {
          format: {
            type: "json_schema",
            name: input.schemaName,
            strict: true,
            schema: input.schema,
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!result.ok) {
      const error = new Error(`LLM request failed: ${result.status}`) as Error & { status?: number };
      error.status = result.status;
      throw error;
    }
    return result;
  }, {
    attempts: 3,
    initialDelayMs: 700,
    shouldRetry: (error) => (error as { status?: number }).status === 429 || ((error as { status?: number }).status ?? 0) >= 500,
  });
  const payload = (await response.json()) as ResponsesPayload;
  const outputText = payload.output_text ?? payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("LLM returned no structured output");
  return JSON.parse(outputText) as T;
}

const stringArray = { type: "array", items: { type: "string" } };

export async function writePostDrafts(
  candidates: PostCandidate[],
  context: { slot: string; recentPosts: string[]; generationTopic?: GenerationTopic; siteUrl?: string },
) {
  const result = await structuredResponse<{ candidates: WriterCandidate[] }>({
    system: WRITER_SYSTEM_PROMPT,
    user: JSON.stringify({ candidates, context }),
    schemaName: "x_post_candidates",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["candidates"],
      properties: {
        candidates: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "hook_type", "angle", "facts_used", "source_ids"],
            properties: {
              text: { type: "string" },
              hook_type: { type: "string" },
              angle: { type: "string" },
              facts_used: stringArray,
              source_ids: stringArray,
            },
          },
        },
      },
    },
  });
  return result.candidates;
}

export async function factCheckDraft(
  draft: WriterCandidate,
  candidates: PostCandidate[],
) {
  return structuredResponse<FactCheckResult>({
    system: FACT_CHECK_SYSTEM_PROMPT,
    user: JSON.stringify({ draft, reference_data: candidates }),
    schemaName: "x_fact_check",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["passed", "risk_score", "issues", "corrected_text", "verified_source_ids"],
      properties: {
        passed: { type: "boolean" },
        risk_score: { type: "number" },
        issues: stringArray,
        corrected_text: { type: "string" },
        verified_source_ids: stringArray,
      },
    },
  });
}

export async function selectEditorialDraft(input: {
  drafts: WriterCandidate[];
  factChecks: FactCheckResult[];
  recentPosts: string[];
}) {
  return structuredResponse<EditorialResult>({
    system: EDITOR_SYSTEM_PROMPT,
    user: JSON.stringify(input),
    schemaName: "x_editorial_selection",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["selected_index", "final_text", "selection_reason", "viral_score", "risk_score"],
      properties: {
        selected_index: { type: "integer" },
        final_text: { type: "string" },
        selection_reason: { type: "string" },
        viral_score: { type: "number" },
        risk_score: { type: "number" },
      },
    },
  });
}
