import Link from "next/link";

const pageCopy = {
  overview: {
    eyebrow: "SMART MONEY OVERVIEW",
    title: "著名投資家の公開保有情報",
    description:
      "投資家・ジャンル・銘柄の3つの視点から、公開資料で確認できる過去の保有変化を読み解くための入口です。",
  },
  sector: {
    eyebrow: "SECTOR FLOW",
    title: "ジャンル別の資金移動",
    description:
      "複数の公開保有資料をジャンル単位で集計するためのページです。実データ連携前のため、現在は構成のみ表示しています。",
  },
  positions: {
    eyebrow: "POSITION CHANGES",
    title: "銘柄ごとのポジション動向",
    description:
      "銘柄別に新規・買い増し・継続・減少・全売却を比較するためのページです。実データ連携前のため、現在は構成のみ表示しています。",
  },
} as const;

export function SmartMoneyFoundationPage({
  variant,
}: {
  variant: keyof typeof pageCopy;
}) {
  const copy = pageCopy[variant];

  return (
    <div>
      <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_82%_12%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(140deg,rgba(10,25,48,0.98),rgba(3,10,24,0.98))] p-6 sm:p-9">
        <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          {copy.description}
        </p>
        <div className="mt-6 inline-flex rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-amber-200">
          EDUCATIONAL / NOT REAL-TIME
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <RoleCard
          href="/smart-money/sector"
          label="ジャンル別"
          text="どの業種への配分が増減したかを見る"
        />
        <RoleCard
          href="/smart-money/positions"
          label="銘柄別"
          text="同じ銘柄を誰が増減したかを見る"
        />
        <RoleCard
          href="/smart-money/investors"
          label="投資家別"
          text="投資家ごとの各ポジション変化を見る"
          ready
        />
      </section>

      <Disclaimer />
    </div>
  );
}

function RoleCard({
  href,
  label,
  text,
  ready = false,
}: {
  href: string;
  label: string;
  text: string;
  ready?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/[0.08] bg-[#0b1426]/80 p-5 transition hover:-translate-y-1 hover:border-cyan-300/25"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-white">{label}</h2>
        <span
          className={`rounded-full px-2 py-1 text-[9px] font-bold ${
            ready
              ? "bg-green-400/10 text-green-300"
              : "bg-slate-400/10 text-slate-500"
          }`}
        >
          {ready ? "SAMPLE READY" : "FOUNDATION"}
        </span>
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-400">{text}</p>
      <p className="mt-5 text-xs font-bold text-cyan-300">ページを見る →</p>
    </Link>
  );
}

export function Disclaimer() {
  return (
    <aside className="mt-8 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 text-xs leading-6 text-slate-400">
      <strong className="text-amber-200">免責事項：</strong>
      このページはSEC Form 13F等の公開資料をもとに、過去の保有状況の変化を可視化したものです。リアルタイムの売買情報ではなく、投資助言・売買推奨ではありません。
    </aside>
  );
}
