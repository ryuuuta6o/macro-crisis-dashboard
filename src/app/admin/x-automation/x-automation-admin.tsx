"use client";

import { useEffect, useState } from "react";
import { DEFAULT_GENERATION_CRITERIA, GENERATION_TOPICS } from "@/config/x-automation";
import type {
  AutomationRun,
  AutomationSettings,
  AutomationState,
  EnvironmentStatus,
  GenerationCriteria,
  GenerationTopic,
  PostingSlot,
} from "@/types/x-automation";
import { getXWeightedLength } from "@/lib/x-automation/x-text";

type AdminData = AutomationState & {
  environment: EnvironmentStatus;
  nextPosting: { slot: PostingSlot; at: string; label: string };
};

const slots: Array<{ id: PostingSlot; label: string }> = [
  { id: "morning", label: "朝 07:15" },
  { id: "midday", label: "昼 12:10" },
  { id: "evening", label: "夜 21:30" },
];

const thresholdLabels: Record<keyof AutomationSettings["thresholds"], string> = {
  equityDailyPercent: "主要株価指数・1日変動率（%）",
  equityShortPercent: "主要株価指数・短時間変動率（%）",
  vixDailyPercent: "VIX・1日変動率（%）",
  yieldBasisPoints: "米国債利回り変動（bp）",
  usdJpyAbsolute: "ドル円・1日変動幅（円）",
  commodityDailyPercent: "金・原油・1日変動率（%）",
  cryptoDailyPercent: "暗号資産・1日変動率（%）",
  zScore: "平常からの乖離（z-score）",
};

const environmentLabels: Record<keyof EnvironmentStatus, string> = {
  xCredentials: "X認証情報",
  llm: "文章生成AI",
  cronSecret: "定期実行キー",
  adminSecret: "管理パスワード",
  persistentStorage: "投稿履歴の保存先",
};

const runStatusLabels: Record<AutomationRun["status"], string> = {
  generated: "投稿案生成済み",
  posted: "投稿済み",
  skipped: "見送り",
  failed: "生成失敗",
};

function currentPostingSlot(): PostingSlot {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
  if (hour < 10) return "morning";
  if (hour < 17) return "midday";
  return "evening";
}

function generationTopicLabel(topic?: GenerationTopic) {
  return GENERATION_TOPICS.find((item) => item.id === (topic ?? "all"))?.label ?? "自動選定";
}

export function XAutomationAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [generationTopic, setGenerationTopic] = useState<GenerationTopic>("all");
  const [generationSlot, setGenerationSlot] = useState<PostingSlot>(currentPostingSlot);
  const [generationCriteria, setGenerationCriteria] = useState<GenerationCriteria>(DEFAULT_GENERATION_CRITERIA);

  async function load() {
    const response = await fetch("/api/admin/x-automation", { cache: "no-store" });
    if (response.status === 401) return;
    if (!response.ok) throw new Error("管理データを取得できませんでした。");
    const next = await response.json() as AdminData;
    setData(next);
    setDraft(next.runs[0]?.finalText ?? "");
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/x-automation", { cache: "no-store" })
      .then(async (response) => response.status === 401 ? null : await response.json() as AdminData)
      .then((next) => {
        if (!active || !next) return;
        setData(next);
        setDraft(next.runs[0]?.finalText ?? "");
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Load failed");
      });
    return () => { active = false; };
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/x-automation/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) return setError("管理パスワードが一致しません。");
    await load();
  }

  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/x-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "操作に失敗しました。");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    const text = draft.trim();
    if (!text) return;
    setError("");
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("コピーしました");
      window.setTimeout(() => setCopyFeedback(""), 2200);
    } catch {
      setError("コピーできませんでした。ブラウザのクリップボード許可を確認してください。");
    }
  }

  function openXComposer() {
    const text = draft.trim();
    if (!text) return;
    if (getXWeightedLength(text) > 280) {
      setError("X文字数制限を超えています。280以内に調整してください。");
      return;
    }
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#080b10] px-5 py-16 text-slate-100">
        <form onSubmit={login} className="mx-auto max-w-md rounded-xl border border-white/10 bg-[#111722] p-7">
          <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">SECURE ADMIN</p>
          <h1 className="mt-3 text-2xl font-semibold">X自動投稿 管理画面</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">環境変数`ADMIN_SECRET`で保護されています。</p>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-400/50" placeholder="管理パスワード" />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button className="mt-5 w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950">ログイン</button>
        </form>
      </main>
    );
  }

  const latest = data.runs[0];
  return (
    <main className="min-h-screen bg-[#080b10] px-4 py-8 text-slate-100 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-cyan-300">X AUTOMATION CONTROL</p>
            <h1 className="mt-2 text-3xl font-semibold">市場投稿オペレーション</h1>
            <p className="mt-2 text-sm text-slate-400">次回: {new Date(data.nextPosting.at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} / {data.nextPosting.label}</p>
          </div>
          <div className="flex gap-2 font-mono text-xs">
            <Status label="安全確認モード" active={data.settings.dryRun} warning />
            <Status label="自動投稿" active={data.settings.autoPostEnabled} />
          </div>
        </header>

        {error && <div className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="mt-6 grid gap-4 lg:grid-cols-5">
          {(Object.entries(data.environment) as Array<[keyof EnvironmentStatus, boolean]>).map(([key, value]) => <Status key={key} label={environmentLabels[key]} active={value} block />)}
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <SettingsPanel key={data.updatedAt} settings={data.settings} disabled={busy} onSave={(settings) => action({ action: "settings", settings })} />
          <div className="rounded-xl border border-white/10 bg-[#101620] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">リアルタイム投稿生成</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">押した時点の市場データと最新ニュースを取得し、3案の作成・ファクトチェック・最終選定を行います。</p>
              </div>
              {latest && <span className="font-mono text-[11px] text-slate-500">前回取得 {new Date(latest.completedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</span>}
            </div>
            <p className="mt-5 text-xs font-semibold tracking-[0.12em] text-slate-400">カテゴリー</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {GENERATION_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={generationTopic === topic.id}
                  onClick={() => setGenerationTopic(topic.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${generationTopic === topic.id ? "border-cyan-300/50 bg-cyan-400/10" : "border-white/10 bg-black/15 hover:bg-white/[0.03]"}`}
                >
                  <strong className="block text-sm text-slate-100">{topic.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{topic.description}</span>
                </button>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold tracking-[0.12em] text-slate-400">生成条件</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <CriteriaToggle
                label="条件に合わなくても定時概況を作る"
                description="大きな変動や急上昇テーマがない時も、最新値から概況を作ります。"
                checked={generationCriteria.allowRoutineSnapshot}
                onChange={(allowRoutineSnapshot) => setGenerationCriteria({ ...generationCriteria, allowRoutineSnapshot })}
              />
              <CriteriaToggle
                label="株価変動が大きい材料を条件にする"
                description="異常値スコアが基準以上の市場材料へ絞ります。"
                checked={generationCriteria.requireMarketAnomaly}
                onChange={(requireMarketAnomaly) => setGenerationCriteria({ ...generationCriteria, requireMarketAnomaly })}
              />
              <CriteriaToggle
                label="SNS・検索の話題上昇を条件にする"
                description="無料運用ではGoogle Trendsと関連報道の増加を使います。"
                checked={generationCriteria.requireSocialBuzz}
                onChange={(requireSocialBuzz) => setGenerationCriteria({ ...generationCriteria, requireSocialBuzz })}
              />
              <CriteriaToggle
                label="主要指数・米国債など周辺指標を含める"
                description="株価だけでなくVIX、米国債、信用、流動性も一緒に確認します。"
                checked={generationCriteria.includeContextIndicators}
                onChange={(includeContextIndicators) => setGenerationCriteria({ ...generationCriteria, includeContextIndicators })}
              />
              <CriteriaToggle
                label="異なる2情報源の確認を必須にする"
                description="OFFでは単一ソースでも確認用の投稿案を作れます。"
                checked={generationCriteria.requireTwoSources}
                onChange={(requireTwoSources) => setGenerationCriteria({ ...generationCriteria, requireTwoSources })}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">X上の投稿・トレンドを直接読む機能は、X APIクレジットを設定した場合のみ追加できます。現在の無料モードではXと断定せず「検索で急上昇」と表現します。</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-xs text-slate-400">
                投稿の切り口
                <select value={generationSlot} onChange={(event) => setGenerationSlot(event.target.value as PostingSlot)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/40">
                  {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                </select>
              </label>
              <button disabled={busy} onClick={() => action({ action: "run", slot: generationSlot, topic: generationTopic, criteria: generationCriteria })} className="self-end rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-50">
                {busy ? "収集・検証中…" : `${generationTopicLabel(generationTopic)}で今すぐ生成`}
              </button>
            </div>
            {latest && <div className="mt-6 border-t border-white/10 pt-5"><RunSummary run={latest} /></div>}
          </div>
        </section>

        {latest?.finalText && (
          <section className="mt-6 rounded-xl border border-white/10 bg-[#101620] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">選定された投稿</h2>
                <p className="mt-1 text-sm text-slate-400">内容と出典を確認し、コピーまたはX投稿画面から手動で公開します。</p>
              </div>
              <span className="font-mono text-xs text-slate-400">{getXWeightedLength(draft)} / 280</span>
            </div>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 p-4 text-base leading-7 outline-none focus:border-cyan-400/40" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button disabled={busy} onClick={() => action({ action: "edit", runId: latest.id, text: draft })} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50">手動修正を保存</button>
              <button disabled={!draft.trim()} onClick={copyDraft} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-40">投稿文をコピー</button>
              <button disabled={!draft.trim() || getXWeightedLength(draft) > 280} onClick={openXComposer} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-40">Xで確認して投稿</button>
              {copyFeedback && <span role="status" className="text-sm text-emerald-300">{copyFeedback}</span>}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">「Xで確認して投稿」は投稿文を入力したX画面を開くだけです。最後の投稿ボタンはご自身で押してください。</p>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-white/10 bg-[#101620] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">投稿履歴・エラー履歴</h2><button disabled={busy || !data.environment.xCredentials} onClick={() => action({ action: "metrics" })} className="rounded-lg border border-white/10 px-4 py-2 text-xs hover:bg-white/5 disabled:opacity-40">公開成果を同期</button></div>
          <div className="mt-4 space-y-3">
            {data.runs.length === 0 && <p className="text-sm text-slate-500">まだ実行履歴はありません。</p>}
            {data.runs.map((run) => <details key={`${run.id}-${run.completedAt}`} className="rounded-lg border border-white/10 bg-black/20 p-4"><summary className="cursor-pointer text-sm"><span className="font-mono text-slate-400">{new Date(run.completedAt).toLocaleString("ja-JP")}</span>　{slots.find((slot) => slot.id === run.slot)?.label ?? run.slot} / {runStatusLabels[run.status]}</summary><div className="mt-4"><RunSummary run={run} /></div></details>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function Status({ label, active, warning = false, block = false }: { label: string; active: boolean; warning?: boolean; block?: boolean }) {
  return <span className={`${block ? "rounded-lg border border-white/10 bg-[#101620] p-4" : "rounded-md border border-white/10 px-3 py-2"} flex items-center gap-2`}><i className={`size-2 rounded-full ${active ? warning ? "bg-amber-400" : "bg-emerald-400" : "bg-slate-600"}`} /><span className="font-mono text-[11px] uppercase tracking-wider text-slate-300">{label}</span></span>;
}

function SettingsPanel({ settings, disabled, onSave }: { settings: AutomationSettings; disabled: boolean; onSave: (settings: AutomationSettings) => void }) {
  const [value, setValue] = useState(settings);
  return <div className="rounded-xl border border-white/10 bg-[#101620] p-5"><h2 className="text-lg font-semibold">運用設定</h2><div className="mt-4 space-y-3"><Toggle label="安全確認モード（Xへ自動投稿しない）" checked={value.dryRun} onChange={(dryRun) => setValue({ ...value, dryRun })} /><Toggle label="Xへの自動投稿" checked={value.autoPostEnabled} onChange={(autoPostEnabled) => setValue({ ...value, autoPostEnabled })} /><Toggle label="サイトURLを投稿案に含める" checked={value.includeSiteUrl} onChange={(includeSiteUrl) => setValue({ ...value, includeSiteUrl })} /><Toggle label="異なる2情報源の確認を必須にする" checked={value.requireTwoSources} onChange={(requireTwoSources) => setValue({ ...value, requireTwoSources })} /></div><p className="mt-5 text-xs font-semibold tracking-[0.12em] text-slate-400">異常値の判定ライン</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{(Object.entries(value.thresholds) as Array<[keyof AutomationSettings["thresholds"], number]>).map(([key, threshold]) => <label key={key} className="text-xs leading-5 text-slate-400">{thresholdLabels[key]}<input type="number" step="0.1" value={threshold} onChange={(event) => setValue({ ...value, thresholds: { ...value.thresholds, [key]: Number(event.target.value) } })} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white" /></label>)}</div><button disabled={disabled} onClick={() => onSave(value)} className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">設定を保存</button></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between text-sm text-slate-300"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-cyan-400" /></label>;
}

function CriteriaToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-cyan-300/35 bg-cyan-400/[0.07]" : "border-white/10 bg-black/15"}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-4 shrink-0 accent-cyan-400" /><span><strong className="block text-sm font-medium text-slate-200">{label}</strong><small className="mt-1 block text-xs leading-5 text-slate-500">{description}</small></span></label>;
}

function RunSummary({ run }: { run: AutomationRun }) {
  return <div className="space-y-3 text-sm text-slate-300"><div className="flex flex-wrap gap-3 text-xs"><span className="rounded bg-white/5 px-2 py-1">{generationTopicLabel(run.generationTopic)}</span><span className="font-mono">状態={runStatusLabels[run.status]}</span><span className="font-mono">生成={run.generationMode === "template_fallback" ? "無料定型編集" : "AI編集"}</span><span className="font-mono">安全確認={run.dryRun ? "有効" : "無効"}</span><span className="font-mono">拡散度={run.editorial?.viral_score ?? "-"}</span><span className="font-mono">表現リスク={run.editorial?.risk_score ?? "-"}</span>{run.generationCriteria?.requireMarketAnomaly && <span>株価変動条件</span>}{run.generationCriteria?.requireSocialBuzz && <span>話題上昇条件</span>}{run.metrics && <><span className="font-mono">表示={run.metrics.impressions ?? "-"}</span><span className="font-mono">いいね={run.metrics.likes ?? "-"}</span><span className="font-mono">リポスト={run.metrics.reposts ?? "-"}</span></>}</div>{run.warning && <p className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">{run.warning}</p>}{run.error && <p className="rounded-md bg-red-400/10 p-3 text-red-200">{run.error}</p>}{run.finalText && <p className="whitespace-pre-wrap rounded-md bg-black/25 p-4 text-base leading-7">{run.finalText}</p>}<p className="text-xs text-slate-500">候補 {run.candidates.length}件 / 出典 {run.sources.length}件 / X投稿ID {run.postId ?? "未投稿"}</p>{run.candidates.length > 0 && <ul className="space-y-2">{run.candidates.slice(0, 5).map((candidate) => <li key={candidate.id} className="rounded-md border border-white/5 p-3"><strong>{candidate.title}</strong><span className="ml-2 font-mono text-xs text-cyan-300">{candidate.viral.total}</span></li>)}</ul>}{run.sources.length > 0 && <div className="flex flex-wrap gap-2">{run.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline decoration-cyan-300/30">{source.name}</a>)}</div>}</div>;
}
