import type { Metadata } from "next";
import { Disclaimer } from "@/components/smart-money/SmartMoneyFoundationPage";
import { getSmartMoneyInvestors } from "@/lib/sec-13f";
import type {
  PositionChangeType,
  SmartMoneyInvestor,
  SmartMoneyStance,
} from "@/types/smart-money";

export const metadata: Metadata = {
  title: "投資家別13Fポジション動向 | Macro Signal",
  description:
    "SEC Form 13Fの公開データをもとに、著名運用会社の四半期末保有を前四半期と比較する教育ページ。",
};

const stanceClass: Record<SmartMoneyStance, string> = {
  攻め: "border-green-400/25 bg-green-400/10 text-green-200",
  中立: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  守り: "border-violet-300/20 bg-violet-300/[0.08] text-violet-200",
  判断保留: "border-slate-400/20 bg-slate-400/[0.08] text-slate-300",
};

const changeClass: Record<PositionChangeType, string> = {
  新規: "border-green-400/25 bg-green-400/10 text-green-200",
  買い増し: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  継続: "border-slate-300/15 bg-slate-300/[0.06] text-slate-300",
  小幅変更: "border-yellow-300/20 bg-yellow-300/[0.08] text-yellow-100",
  減少: "border-red-400/25 bg-red-400/10 text-red-200",
  全売却: "border-rose-400/30 bg-rose-400/10 text-rose-100",
};

export async function InvestorsPageContent() {
  const investors = await getSmartMoneyInvestors();

  return (
    <>
      <header className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_86%_0%,rgba(34,211,238,0.14),transparent_30%),linear-gradient(140deg,rgba(10,25,48,0.98),rgba(3,10,24,0.98))] p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-cyan-200">
            SEC FORM 13F / OFFICIAL DATA
          </span>
          <span className="rounded-full border border-red-300/20 bg-red-300/[0.07] px-3 py-1 text-[10px] font-bold text-red-200">
            リアルタイムではありません
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">
          著名投資家の四半期末ポジション
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
          SECへ提出された13Fの保有明細を取得し、最新の四半期末と前四半期末を自動比較しています。
          表示対象は投資家本人の全資産ではなく、提出義務のある運用会社が開示した13F対象証券です。
        </p>
      </header>

      <ThirteenFGuide />

      <section className="mt-7">
        <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-400">
          INVESTOR SUMMARY
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">投資家別サマリー</h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          「攻め・中立・守り」は株数増減を機械的に整理した教育用ラベルで、投資家の意図や相場観を断定するものではありません。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {investors.map((investor) => (
            <InvestorSummary key={investor.slug} investor={investor} />
          ))}
        </div>
      </section>

      <InvestorSectorTrends investors={investors} />

      <div className="mt-9 space-y-8">
        {investors.map((investor) => (
          <InvestorPositions key={investor.slug} investor={investor} />
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 text-xs leading-6 text-slate-400">
        <strong className="text-amber-100">データの読み方：</strong>
        株数の増減は2つの四半期末スナップショットの差です。いつ、いくらで売買したかは13Fからは分かりません。
        評価額は提出明細の値であり、現在価格による時価ではありません。SECはティッカーを収録しないため、公式識別子であるCUSIPを表示しています。
      </section>

      <Disclaimer />
    </>
  );
}

export default function SmartMoneyInvestorsPage() {
  return <InvestorsPageContent />;
}

function ThirteenFGuide() {
  return (
    <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#07101f]/90 p-5 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-cyan-300">
            13Fを一言で
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            大口運用会社の「四半期末の保有一覧」
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            例えば3月31日時点の保有は、原則として5月15日ごろまでに提出されます。
            つまり公開時点で最大45日古く、その後に売買済みの可能性があります。
          </p>
        </div>
        <GuideBox
          title="13Fで分かること"
          items={[
            "四半期末に開示された対象証券",
            "開示株数・評価額・構成比",
            "前四半期末からの増減",
          ]}
          positive
        />
        <GuideBox
          title="13Fでは分からないこと"
          items={[
            "現在のリアルタイム保有",
            "売買した日付・価格・理由",
            "空売り、現金、多くの債券・私募資産",
          ]}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.06] pt-4 text-[11px]">
        <a
          href="https://www.sec.gov/rules-regulations/staff-guidance/frequently-asked-questions-about-form-13f"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-cyan-300 hover:text-cyan-200"
        >
          SEC 13F FAQ ↗
        </a>
        <a
          href="https://www.sec.gov/edgar/sec-api-documentation"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-cyan-300 hover:text-cyan-200"
        >
          SEC EDGAR API仕様 ↗
        </a>
      </div>
    </section>
  );
}

function GuideBox({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className={`text-sm font-bold ${positive ? "text-green-200" : "text-red-200"}`}>
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
        {items.map((item) => (
          <li key={item}>・{item}</li>
        ))}
      </ul>
    </div>
  );
}

function InvestorSummary({ investor }: { investor: SmartMoneyInvestor }) {
  const available = investor.dataStatus === "live";
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0b1426]/85 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-cyan-400">
            {available ? investor.period : "SEC DATA UNAVAILABLE"}
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">{investor.investor}</h3>
          <p className="mt-1 text-xs text-slate-500">{investor.firm}</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${stanceClass[investor.stance]}`}>
          変化ラベル：{investor.stance}
        </span>
      </div>

      {available ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="開示銘柄数" value={`${investor.positionCount}件`} />
            <Metric label="13F評価額合計" value={formatMoney(investor.totalValue)} />
            <Metric label="SEC提出日" value={investor.filingDate} />
            <Metric label="比較対象" value={investor.previousPeriod.replace(/（.*$/, "")} />
          </dl>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <NameList title="主な新規・買い増し" names={investor.topIncreases} positive />
            <NameList title="主な減少・全売却" names={investor.topDecreases} />
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-red-300/10 bg-red-300/[0.04] p-4 text-xs leading-6 text-red-100/80">
          {investor.statusMessage}
        </p>
      )}
      <p className="mt-4 text-xs leading-6 text-slate-400">{investor.summary}</p>
    </article>
  );
}

function InvestorPositions({ investor }: { investor: SmartMoneyInvestor }) {
  const hasPositions = investor.positions.length > 0;
  return (
    <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07101f]/80">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-cyan-400">
            {investor.period}
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            {investor.investor}
            <span className="ml-2 text-sm font-normal text-slate-500">{investor.firm}</span>
          </h2>
        </div>
        {investor.sourceUrl && (
          <a
            href={investor.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2 text-xs font-bold text-cyan-200"
          >
            SEC提出原文を見る ↗
          </a>
        )}
      </div>

      {!hasPositions ? (
        <p className="p-6 text-sm text-slate-400">{investor.statusMessage}</p>
      ) : (
        <>
          <div className="grid gap-3 p-4 md:hidden">
            {investor.positions.map((position) => (
              <article key={`${investor.slug}-${position.cusip}-${position.optionType}`} className="rounded-2xl border border-white/[0.07] bg-[#0b1426] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{position.company}</p>
                    <p className="mt-1 font-mono text-[10px] text-cyan-300">CUSIP {position.cusip}</p>
                  </div>
                  <ChangeBadge type={position.changeType} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <Metric label="前回株数" value={formatShares(position.previousShares)} />
                  <Metric label="今回株数" value={formatShares(position.currentShares)} />
                  <Metric label="変化率" value={formatChange(position.changePercent)} />
                  <Metric label="構成比" value={`${position.portfolioWeight.toFixed(2)}%`} />
                </dl>
                <p className="mt-4 text-xs leading-6 text-slate-400">{position.note}</p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="bg-white/[0.025] text-[9px] font-bold tracking-[0.1em] text-slate-500">
                <tr>
                  <Th>企業 / CUSIP</Th>
                  <Th>証券区分</Th>
                  <Th align="right">前回株数</Th>
                  <Th align="right">今回株数</Th>
                  <Th align="right">変化率</Th>
                  <Th>変化</Th>
                  <Th align="right">構成比</Th>
                  <Th align="right">今回評価額</Th>
                  <Th>読み方</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {investor.positions.map((position) => (
                  <tr key={`${investor.slug}-${position.cusip}-${position.securityClass}-${position.optionType}`} className="hover:bg-cyan-300/[0.025]">
                    <Td>
                      <strong className="text-sm text-white">{position.company}</strong>
                      <span className="mt-1 block font-mono text-[10px] text-cyan-300/75">CUSIP {position.cusip}</span>
                    </Td>
                    <Td>{position.securityClass}{position.optionType ? ` / ${position.optionType}` : ""}</Td>
                    <Td align="right" mono>{formatShares(position.previousShares)}</Td>
                    <Td align="right" mono>{formatShares(position.currentShares)}</Td>
                    <Td align="right" mono>{formatChange(position.changePercent)}</Td>
                    <Td><ChangeBadge type={position.changeType} /></Td>
                    <Td align="right" mono>{position.portfolioWeight.toFixed(2)}%</Td>
                    <Td align="right" mono>{formatMoney(position.currentValue)}</Td>
                    <Td><span className="block max-w-[250px] text-xs leading-5 text-slate-400">{position.note}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const sectorRules = [
  {
    label: "Technology / Communication",
    phrases: [
      "TECH",
      "SOFTWARE",
      "SEMICONDUCTOR",
      "MICROSOFT",
      "APPLE",
      "ALPHABET",
      "META",
      "AMAZON",
      "NVIDIA",
      "TAIWAN SEMICONDUCTOR",
      "BROADCOM",
      "NETFLIX",
    ],
  },
  {
    label: "Financials",
    phrases: [
      "BANK",
      "FINANCIAL",
      "CAPITAL",
      "VISA",
      "MASTERCARD",
      "AMERICAN EXPRESS",
      "MOODY",
    ],
  },
  {
    label: "Consumer",
    phrases: [
      "CONSUMER",
      "RETAIL",
      "COCA COLA",
      "PEPSICO",
      "WALMART",
      "COSTCO",
      "RESTAURANT",
    ],
  },
  {
    label: "Healthcare",
    phrases: [
      "HEALTH",
      "PHARMA",
      "THERAPEUTICS",
      "BIOTECH",
      "MEDICAL",
    ],
  },
  {
    label: "Energy / Materials",
    phrases: [
      "ENERGY",
      "PETROLEUM",
      "OIL",
      "CHEVRON",
      "OCCIDENTAL",
      "MINING",
      "GOLD",
    ],
  },
  {
    label: "Industrials / Real Assets",
    phrases: [
      "INDUSTR",
      "RAIL",
      "AIR",
      "CONSTRUCTION",
      "REALTY",
      "PROPERTIES",
      "LOGISTICS",
    ],
  },
] as const;

function InvestorSectorTrends({
  investors,
}: {
  investors: SmartMoneyInvestor[];
}) {
  const totals = new Map<
    string,
    { value: number; positions: number; increases: number; decreases: number }
  >();

  for (const investor of investors) {
    for (const position of investor.positions) {
      if (position.currentShares <= 0) continue;
      const sector = inferSector(position.company);
      const current = totals.get(sector) ?? {
        value: 0,
        positions: 0,
        increases: 0,
        decreases: 0,
      };
      current.value += position.currentValue;
      current.positions += 1;
      if (
        position.changeType === "新規" ||
        position.changeType === "買い増し"
      ) {
        current.increases += 1;
      }
      if (
        position.changeType === "減少" ||
        position.changeType === "全売却"
      ) {
        current.decreases += 1;
      }
      totals.set(sector, current);
    }
  }

  const sectors = [...totals.entries()]
    .sort((left, right) => right[1].value - left[1].value)
    .slice(0, 6);

  return (
    <section className="mt-8 rounded-3xl border border-white/[0.08] bg-[#07101f]/90 p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.16em] text-cyan-300">
        SECTOR TREND / ESTIMATED
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        セクター別の保有傾向
      </h2>
      <p className="mt-2 max-w-4xl text-xs leading-6 text-slate-500">
        SEC 13Fには標準化されたセクター項目がないため、発行体名から保守的に分類した概算です。未判定は「その他・未分類」にまとめています。
      </p>
      {sectors.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sectors.map(([sector, item]) => (
            <article
              key={sector}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
            >
              <h3 className="text-sm font-bold text-white">{sector}</h3>
              <p className="mt-3 font-mono text-xl font-bold text-cyan-100">
                {formatMoney(item.value)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <SectorMetric label="保有" value={item.positions} />
                <SectorMetric label="増加" value={item.increases} positive />
                <SectorMetric label="減少" value={item.decreases} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          SECデータ取得後にセクター傾向を表示します。
        </p>
      )}
    </section>
  );
}

function SectorMetric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-black/15 p-2">
      <span className="block text-[9px] text-slate-600">{label}</span>
      <strong
        className={`mt-1 block font-mono text-xs ${
          positive ? "text-emerald-200" : "text-slate-300"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function inferSector(company: string) {
  const normalized = company.toUpperCase();
  return (
    sectorRules.find((sector) =>
      sector.phrases.some((phrase) => normalized.includes(phrase)),
    )?.label ?? "その他・未分類"
  );
}

function NameList({ title, names, positive = false }: { title: string; names: string[]; positive?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3">
      <p className="text-[9px] font-bold text-slate-600">{title}</p>
      <p className={`mt-2 text-xs leading-5 ${positive ? "text-green-200" : "text-red-200"}`}>
        {names.length ? names.join(" / ") : "該当なし"}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3">
      <dt className="text-[9px] text-slate-600">{label}</dt>
      <dd className="mt-1 font-mono text-xs font-bold text-white">{value}</dd>
    </div>
  );
}

function ChangeBadge({ type }: { type: PositionChangeType }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${changeClass[type]}`}>{type}</span>;
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`whitespace-nowrap px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, align = "left", mono = false }: { children: React.ReactNode; align?: "left" | "right"; mono?: boolean }) {
  return <td className={`px-4 py-4 text-xs text-slate-300 ${align === "right" ? "text-right" : "text-left"} ${mono ? "font-mono" : ""}`}>{children}</td>;
}

function formatShares(value: number) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(value);
}

function formatChange(value: number | null) {
  if (value === null) return "新規";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
