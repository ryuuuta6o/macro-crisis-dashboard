"use client";

import { useEffect, useState } from "react";
import type {
  AutomationRun,
  AutomationSettings,
  AutomationState,
  EnvironmentStatus,
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

export function XAutomationAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");

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
            <Status label="DRY RUN" active={data.settings.dryRun} warning />
            <Status label="AUTO POST" active={data.settings.autoPostEnabled} />
          </div>
        </header>

        {error && <div className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="mt-6 grid gap-4 lg:grid-cols-5">
          {Object.entries(data.environment).map(([key, value]) => <Status key={key} label={key} active={value} block />)}
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <SettingsPanel key={data.updatedAt} settings={data.settings} disabled={busy} onSave={(settings) => action({ action: "settings", settings })} />
          <div className="rounded-xl border border-white/10 bg-[#101620] p-5">
            <h2 className="text-lg font-semibold">手動DRY_RUN</h2>
            <p className="mt-1 text-sm text-slate-400">予定時刻を待たず、同じ収集・生成・検証フローを実行します。</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {slots.map((slot) => <button key={slot.id} disabled={busy} onClick={() => action({ action: "run", slot: slot.id })} className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50">{slot.label}を生成</button>)}
            </div>
            {latest && <div className="mt-6 border-t border-white/10 pt-5"><RunSummary run={latest} /></div>}
          </div>
        </section>

        {latest?.finalText && (
          <section className="mt-6 rounded-xl border border-white/10 bg-[#101620] p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">選定された投稿</h2><span className="font-mono text-xs text-slate-400">{getXWeightedLength(draft)} / 280</span></div>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 p-4 text-base leading-7 outline-none focus:border-cyan-400/40" />
            <button disabled={busy} onClick={() => action({ action: "edit", runId: latest.id, text: draft })} className="mt-3 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">手動修正を保存</button>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-white/10 bg-[#101620] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">投稿履歴・エラー履歴</h2><button disabled={busy || !data.environment.xCredentials} onClick={() => action({ action: "metrics" })} className="rounded-lg border border-white/10 px-4 py-2 text-xs hover:bg-white/5 disabled:opacity-40">公開成果を同期</button></div>
          <div className="mt-4 space-y-3">
            {data.runs.length === 0 && <p className="text-sm text-slate-500">まだ実行履歴はありません。</p>}
            {data.runs.map((run) => <details key={`${run.id}-${run.completedAt}`} className="rounded-lg border border-white/10 bg-black/20 p-4"><summary className="cursor-pointer text-sm"><span className="font-mono text-slate-400">{new Date(run.completedAt).toLocaleString("ja-JP")}</span>　{run.slot} / {run.status}</summary><div className="mt-4"><RunSummary run={run} /></div></details>)}
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
  return <div className="rounded-xl border border-white/10 bg-[#101620] p-5"><h2 className="text-lg font-semibold">運用設定</h2><div className="mt-4 space-y-3"><Toggle label="DRY_RUN" checked={value.dryRun} onChange={(dryRun) => setValue({ ...value, dryRun })} /><Toggle label="自動投稿" checked={value.autoPostEnabled} onChange={(autoPostEnabled) => setValue({ ...value, autoPostEnabled })} /><Toggle label="サイトURL誘導" checked={value.includeSiteUrl} onChange={(includeSiteUrl) => setValue({ ...value, includeSiteUrl })} /><Toggle label="2情報源を必須" checked={value.requireTwoSources} onChange={(requireTwoSources) => setValue({ ...value, requireTwoSources })} /></div><div className="mt-5 grid grid-cols-2 gap-3">{Object.entries(value.thresholds).map(([key, threshold]) => <label key={key} className="text-xs text-slate-400">{key}<input type="number" step="0.1" value={threshold} onChange={(event) => setValue({ ...value, thresholds: { ...value.thresholds, [key]: Number(event.target.value) } })} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white" /></label>)}</div><button disabled={disabled} onClick={() => onSave(value)} className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">設定を保存</button></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between text-sm text-slate-300"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-cyan-400" /></label>;
}

function RunSummary({ run }: { run: AutomationRun }) {
  return <div className="space-y-3 text-sm text-slate-300"><div className="flex flex-wrap gap-3 font-mono text-xs"><span>status={run.status}</span><span>dry_run={String(run.dryRun)}</span><span>viral={run.editorial?.viral_score ?? "-"}</span><span>risk={run.editorial?.risk_score ?? "-"}</span>{run.metrics && <><span>views={run.metrics.impressions ?? "-"}</span><span>likes={run.metrics.likes ?? "-"}</span><span>reposts={run.metrics.reposts ?? "-"}</span></>}</div>{run.error && <p className="rounded-md bg-red-400/10 p-3 text-red-200">{run.error}</p>}{run.finalText && <p className="whitespace-pre-wrap rounded-md bg-black/25 p-4 text-base leading-7">{run.finalText}</p>}<p className="text-xs text-slate-500">候補 {run.candidates.length}件 / 出典 {run.sources.length}件 / X post ID {run.postId ?? "未投稿"}</p>{run.candidates.length > 0 && <ul className="space-y-2">{run.candidates.slice(0, 5).map((candidate) => <li key={candidate.id} className="rounded-md border border-white/5 p-3"><strong>{candidate.title}</strong><span className="ml-2 font-mono text-xs text-cyan-300">{candidate.viral.total}</span></li>)}</ul>}{run.sources.length > 0 && <div className="flex flex-wrap gap-2">{run.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline decoration-cyan-300/30">{source.name}</a>)}</div>}</div>;
}
