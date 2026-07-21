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

type LlmErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: string | null;
  };
};

export class LlmRequestError extends Error {
  status: number;
  code: string | null;
  errorType: string | null;
  retryAfterMs: number | null;
  requestId: string | null;

  constructor(input: {
    status: number;
    message: string;
    code?: string | null;
    errorType?: string | null;
    retryAfterMs?: number | null;
    requestId?: string | null;
  }) {
    super(input.message);
    this.name = "LlmRequestError";
    this.status = input.status;
    this.code = input.code ?? null;
    this.errorType = input.errorType ?? null;
    this.retryAfterMs = input.retryAfterMs ?? null;
    this.requestId = input.requestId ?? null;
  }
}

function retryAfterMs(headers: Headers) {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const at = Date.parse(retryAfter);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
}

export function isLlmServiceError(error: unknown) {
  if (error instanceof LlmRequestError) return true;
  if (!(error instanceof Error)) return false;
  return error.message === "LLM_API_KEY is not configured"
    || error.message === "LLM returned no structured output";
}

export function getLlmUserMessage(error: unknown) {
  if (error instanceof LlmRequestError && (
    error.code === "insufficient_quota"
    || error.errorType === "insufficient_quota"
    || /quota|billing|credit/i.test(error.message)
  )) {
    return "OpenAI APIの利用残高または請求設定が不足しています。ChatGPTの契約とは別管理です。取得済みデータだけで無料の定型投稿案を作成しました。";
  }
  if (error instanceof LlmRequestError && error.status === 429) {
    return "OpenAI APIの短時間利用上限に達しました。間隔を空けた再試行後も制限が続いたため、取得済みデータだけで無料の定型投稿案を作成しました。";
  }
  if (error instanceof Error && error.message === "LLM_API_KEY is not configured") {
    return "文章生成AIのAPIキーが未設定です。取得済みデータだけで無料の定型投稿案を作成しました。";
  }
  return "文章生成AIを一時的に利用できませんでした。取得済みデータだけで無料の定型投稿案を作成しました。";
}

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
      const raw = await result.text();
      let payload: LlmErrorPayload = {};
      try {
        payload = JSON.parse(raw) as LlmErrorPayload;
      } catch {
        // Some compatible providers return plain text for errors.
      }
      const detail = payload.error;
      throw new LlmRequestError({
        status: result.status,
        message: detail?.message || raw.slice(0, 500) || `LLM request failed: ${result.status}`,
        code: detail?.code,
        errorType: detail?.type,
        retryAfterMs: retryAfterMs(result.headers),
        requestId: result.headers.get("x-request-id"),
      });
    }
    return result;
  }, {
    attempts: 3,
    initialDelayMs: 1_500,
    shouldRetry: (error) => {
      if (!(error instanceof LlmRequestError)) return false;
      if (error.code === "insufficient_quota" || error.errorType === "insufficient_quota") return false;
      return error.status === 429 || error.status >= 500;
    },
    getDelayMs: (error, attempt) => {
      if (error instanceof LlmRequestError && error.retryAfterMs !== null) {
        return Math.min(20_000, error.retryAfterMs + 250);
      }
      return 1_500 * 2 ** attempt;
    },
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
