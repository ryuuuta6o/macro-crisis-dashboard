import type { OverallSignal, Signal } from "@/types/indicator";

type BadgeSignal = Signal | OverallSignal;

const signalContent: Record<
  BadgeSignal,
  { label: string; dot: string; className: string }
> = {
  green: {
    label: "安全",
    dot: "bg-[#3FB950]",
    className: "border-green-500/25 bg-green-500/10 text-green-300",
  },
  "green-yellow": {
    label: "安全〜注意",
    dot: "bg-[#D29922]",
    className: "border-yellow-500/25 bg-yellow-500/10 text-yellow-100",
  },
  yellow: {
    label: "警戒",
    dot: "bg-[#D29922]",
    className: "border-yellow-500/25 bg-yellow-500/10 text-yellow-200",
  },
  orange: {
    label: "警戒強",
    dot: "bg-[#D97706]",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  },
  red: {
    label: "危険",
    dot: "bg-[#F85149]",
    className: "border-red-500/25 bg-red-500/10 text-red-200",
  },
  localized: {
    label: "局所火災",
    dot: "bg-[#D97706]",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  },
  crisis: {
    label: "危機モード",
    dot: "bg-[#F85149]",
    className: "border-red-400/40 bg-red-500/15 text-red-100",
  },
  unavailable: {
    label: "取得不可",
    dot: "bg-slate-500",
    className: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  },
};

export function SignalBadge({ signal }: { signal: BadgeSignal }) {
  const content = signalContent[signal];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] ${content.className}`}
    >
      <span className={`size-2 rounded-full ${content.dot}`} />
      {content.label}
    </span>
  );
}
