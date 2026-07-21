import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_AUTOMATION_SETTINGS } from "@/config/x-automation";
import type {
  AutomationRun,
  AutomationSettings,
  AutomationState,
} from "@/types/x-automation";

export interface AutomationStore {
  getState(): Promise<AutomationState>;
  saveRun(run: AutomationRun): Promise<void>;
  updateSettings(settings: AutomationSettings): Promise<void>;
  claimIdempotency(key: string): Promise<boolean>;
}

function defaultState(): AutomationState {
  return {
    settings: { ...DEFAULT_AUTOMATION_SETTINGS },
    runs: [],
    updatedAt: new Date().toISOString(),
  };
}

function applyRuntimeGates(state: AutomationState): AutomationState {
  return {
    ...state,
    settings: {
      ...state.settings,
      dryRun: process.env.DRY_RUN === "false" ? state.settings.dryRun : true,
      autoPostEnabled: process.env.AUTO_POST_ENABLED === "true" && state.settings.autoPostEnabled,
    },
  };
}

class FileAutomationStore implements AutomationStore {
  private file = path.join(process.cwd(), "data", "x-automation", "state.json");
  private claims = new Set<string>();

  async getState() {
    try {
      return applyRuntimeGates(JSON.parse(await fs.readFile(this.file, "utf8")) as AutomationState);
    } catch {
      return applyRuntimeGates(defaultState());
    }
  }

  private async write(state: AutomationState) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(state, null, 2), "utf8");
    await fs.rename(temporary, this.file);
  }

  async saveRun(run: AutomationRun) {
    const state = await this.getState();
    state.runs = [run, ...state.runs.filter((item) => item.id !== run.id)].slice(0, 100);
    state.updatedAt = new Date().toISOString();
    await this.write(state);
  }

  async updateSettings(settings: AutomationSettings) {
    const state = await this.getState();
    state.settings = settings;
    state.updatedAt = new Date().toISOString();
    await this.write(state);
  }

  async claimIdempotency(key: string) {
    if (this.claims.has(key)) return false;
    const state = await this.getState();
    if (state.runs.some((run) => run.idempotencyKey === key)) return false;
    this.claims.add(key);
    return true;
  }
}

class UpstashAutomationStore implements AutomationStore {
  private url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL!;
  private token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN!;

  private async command<T>(...command: Array<string | number>) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Upstash REST failed: ${response.status}`);
    return ((await response.json()) as { result: T }).result;
  }

  async getState() {
    const [settingsJson, runJson] = await Promise.all([
      this.command<string | null>("GET", "xauto:settings"),
      this.command<string[]>("LRANGE", "xauto:runs", 0, 99),
    ]);
    const runs = runJson.map((item) => JSON.parse(item) as AutomationRun);
    return applyRuntimeGates({
      settings: settingsJson ? JSON.parse(settingsJson) as AutomationSettings : defaultState().settings,
      runs: [...new Map(runs.map((run) => [run.id, run])).values()],
      updatedAt: new Date().toISOString(),
    });
  }

  async saveRun(run: AutomationRun) {
    await this.command("LPUSH", "xauto:runs", JSON.stringify(run));
    await this.command("LTRIM", "xauto:runs", 0, 99);
  }

  async updateSettings(settings: AutomationSettings) {
    await this.command("SET", "xauto:settings", JSON.stringify(settings));
  }

  async claimIdempotency(key: string) {
    const result = await this.command<string | null>("SET", `xauto:idempotency:${key}`, "1", "NX", "EX", 172800);
    return result === "OK";
  }
}

export function getAutomationStore(): AutomationStore {
  const wantsRedis = process.env.X_AUTOMATION_STORAGE === "upstash" || process.env.VERCEL === "1";
  const hasUpstashRest =
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (wantsRedis && hasUpstashRest) {
    return new UpstashAutomationStore();
  }
  if (process.env.VERCEL === "1") {
    throw new Error("Persistent storage is required on Vercel. Configure Upstash Redis REST.");
  }
  return new FileAutomationStore();
}
