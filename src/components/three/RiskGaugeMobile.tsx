"use client";

import type { RiskLevel, SafetyValve3DItem } from "@/types/indicator";

const colors = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

const labels = {
  green: "安定",
  yellow: "注意",
  orange: "警戒",
  red: "危険",
};

export function RiskGaugeMobile({
  items,
  level,
  onSelect,
}: {
  items: SafetyValve3DItem[];
  level: RiskLevel;
  onSelect: (id: SafetyValve3DItem["id"]) => void;
}) {
  const color = colors[level];

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <div className="relative mx-auto grid size-52 place-items-center">
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-xl"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute inset-4 rounded-full p-[2px]"
          style={{
            background: `conic-gradient(${color} 0deg 285deg, #1e293b 285deg 360deg)`,
          }}
        >
          <div className="grid size-full place-items-center rounded-full bg-[#070b14]">
            <div className="text-center">
              <span
                className="mx-auto block size-14 rounded-full shadow-2xl"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 38px ${color}88`,
                }}
              />
              <p className="mt-4 text-xs font-bold tracking-[0.16em] text-slate-500">
                RISK CORE
              </p>
              <p className="mt-1 text-xl font-bold text-white">{labels[level]}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex w-0 min-w-full snap-x gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="min-w-36 snap-start rounded-xl border border-white/[0.08] bg-[#111a2b] p-3 text-left"
          >
            <span className="flex items-center gap-2">
              <i
                className="size-2 rounded-full"
                style={{ backgroundColor: colors[item.level] }}
              />
              <strong className="text-xs text-white">{item.name}</strong>
            </span>
            <span className="mt-2 block font-mono text-[11px] text-slate-400">
              {item.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
