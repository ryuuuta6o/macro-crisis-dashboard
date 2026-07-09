"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { RiskGaugeMobile } from "@/components/three/RiskGaugeMobile";
import type {
  ContagionLink,
  RiskLevel,
  SafetyValve3DItem,
} from "@/types/indicator";

const RiskCoreScene = dynamic(
  () =>
    import("@/components/three/RiskCoreScene").then(
      (module) => module.RiskCoreScene,
    ),
  {
    ssr: false,
    loading: () => <StaticGauge />,
  },
);

function supportsWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function RiskVisualization({
  items,
  links,
  level,
  comment,
  compact = false,
  terminal = false,
}: {
  items: SafetyValve3DItem[];
  links: ContagionLink[];
  level: RiskLevel;
  comment: string;
  compact?: boolean;
  terminal?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<"loading" | "3d" | "gauge">("loading");

  useEffect(() => {
    const updateMode = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const cores = navigator.hardwareConcurrency ?? 4;
      setMode(
        isDesktop && cores >= 4 && supportsWebGl() && !reducedMotion
          ? "3d"
          : "gauge",
      );
    };
    updateMode();
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, [reducedMotion]);

  const selectIndicator = (id: SafetyValve3DItem["id"]) => {
    document
      .getElementById(`indicator-${id}`)
      ?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
  };

  return (
    <section
      id="risk-core"
      className={`${compact ? "" : "mt-5"} ${terminal ? "risk-core-panel--terminal" : ""} risk-core-panel h-full overflow-hidden rounded-[26px] border border-cyan-300/10`}
    >
      <div className={compact ? "h-full" : "grid lg:grid-cols-[1fr_300px]"}>
        <div
          className={`relative min-w-0 overflow-hidden p-4 sm:p-5 ${
            compact ? "min-h-[360px]" : "min-h-[430px]"
          }`}
        >
          {!terminal && <div className="absolute inset-x-5 top-5 z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="live-pill-dot" />
                <p className="text-[9px] font-bold tracking-[0.22em] text-cyan-300">
                  LIVE CONTAGION MAP
                </p>
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                3D Risk Core
              </h2>
              <p className="mt-1 hidden text-[10px] text-slate-500 sm:block">
                ドラッグで回転 · ノード選択で詳細へ
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-slate-950/55 px-2.5 py-2 text-right backdrop-blur">
              <p className="text-[7px] tracking-[0.16em] text-slate-600">LINKS</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-cyan-200">
                {String(links.length).padStart(2, "0")}
              </p>
            </div>
          </div>}

          <div
            className={`min-w-0 ${terminal ? "pt-0" : "pt-14"} ${
              terminal ? "h-[292px]" : compact ? "h-[340px]" : "h-[400px] sm:h-[460px]"
            }`}
          >
            {mode === "3d" ? (
              <RiskCoreScene
                items={items}
                links={links}
                level={level}
                reducedMotion={Boolean(reducedMotion)}
                onSelect={selectIndicator}
                hideLabels={terminal}
                hideNodes={terminal}
              />
            ) : mode === "gauge" ? (
              <div className="pt-8">
                <RiskGaugeMobile
                  items={items}
                  level={level}
                  onSelect={selectIndicator}
                />
              </div>
            ) : (
              <StaticGauge />
            )}
          </div>
          {!terminal && <div className="pointer-events-none absolute bottom-4 left-5 z-10 max-w-[70%] rounded-lg border border-white/[0.06] bg-[#020617]/65 px-3 py-2 backdrop-blur-md">
            <p className="line-clamp-2 text-[9px] leading-4 text-slate-400">{comment}</p>
          </div>}
        </div>

        {!compact && (
          <aside className="border-t border-[#1e293b] bg-[#020617]/45 p-5 lg:border-l lg:border-t-0 lg:p-6">
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500">
              CONTAGION MONITOR
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">延焼状態</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">{comment}</p>
            <div className="mt-6 space-y-3 text-xs text-slate-400">
              <Legend color="#22c55e" label="安全弁は安定" />
              <Legend color="#facc15" label="変化を監視" />
              <Legend color="#fb923c" label="延焼注意" />
              <Legend color="#f43f5e" label="ストレス拡大" />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function StaticGauge() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative grid size-48 place-items-center rounded-full border border-yellow-500/30 bg-yellow-500/[0.05]">
        <div className="absolute inset-5 rounded-full border border-yellow-500/20" />
        <div className="size-16 rounded-full bg-yellow-500/70 shadow-[0_0_45px_rgba(234,179,8,0.3)]" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
