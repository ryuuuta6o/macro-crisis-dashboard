import Link from "next/link";
import { getSmartMoneyInvestors } from "@/lib/sec-13f";
import type { SmartMoneyStance } from "@/types/smart-money";

const stanceClass: Record<SmartMoneyStance, string> = {
  攻め: "border-green-400/25 bg-green-400/10 text-green-200",
  中立: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  守り: "border-violet-300/20 bg-violet-300/[0.08] text-violet-200",
  判断保留: "border-slate-400/20 bg-slate-400/[0.08] text-slate-300",
};

export async function SmartMoneyDashboardSection() {
  const investors = await getSmartMoneyInvestors();
  const available = investors.filter((investor) => investor.dataStatus === "live");
  const counts = available.reduce(
    (result, investor) => {
      result[investor.stance] += 1;
      return result;
    },
    { 攻め: 0, 中立: 0, 守り: 0, 判断保留: 0 } as Record<
      SmartMoneyStance,
      number
    >,
  );
  const overall: SmartMoneyStance =
    counts.守り > counts.攻め
      ? "守り"
      : counts.攻め > counts.守り
        ? "攻め"
        : available.length > 0
          ? "中立"
          : "判断保留";

  return (
    <section
      id="smart-money"
      className="rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_90%_0%,rgba(99,102,241,0.13),transparent_34%),linear-gradient(145deg,rgba(10,23,44,0.98),rgba(3,10,24,0.98))] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-300">
              SMART MONEY / AUXILIARY SIGNAL
            </p>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-1 text-[9px] font-bold text-amber-100">
              最大45日遅れ
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Smart Money Tracker
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            金融危機の安全弁ではなく、公開ポジションの補助情報です
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${stanceClass[overall]}`}
        >
          全体傾向：{overall}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {investors.slice(0, 3).map((investor) => (
          <div
            key={investor.slug}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3"
          >
            <div className="min-w-0">
              <strong className="block truncate text-xs text-white">
                {investor.investor}
              </strong>
              <span className="mt-1 block truncate text-[10px] text-slate-500">
                {investor.dataStatus === "live"
                  ? investor.topIncreases[0] || investor.topDecreases[0] || investor.period
                  : "SECデータ取得待ち"}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold ${stanceClass[investor.stance]}`}
            >
              {investor.stance}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-400">
        13Fは四半期末の対象証券を最大45日後に開示します。現在の売買、現金、空売り、多くの債券は分かりません。
      </p>
      <Link
        href="/investors"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-indigo-300/20 bg-indigo-300/[0.07] px-4 text-xs font-bold text-indigo-100 transition hover:-translate-y-0.5 hover:border-indigo-300/35"
      >
        投資家ポジションの詳細を見る →
      </Link>
    </section>
  );
}
