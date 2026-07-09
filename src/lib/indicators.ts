import type {
  Importance,
  CoreIndicatorType,
  IndicatorConfig,
  IndicatorId,
  IndicatorValue,
  ManualIndicator,
  OverallSignal,
  Signal,
} from "@/types/indicator";

export const CATEGORY_LABELS = {
  credit: {
    title: "信用市場",
    eyebrow: "CREDIT MARKETS",
    description: "企業の資金調達環境と信用収縮の広がりを監視",
  },
  rates: {
    title: "金利・国債市場",
    eyebrow: "RATES & TREASURIES",
    description: "長期金利ショックと米国債市場の信認を監視",
  },
  liquidity: {
    title: "短期流動性",
    eyebrow: "SHORT-TERM LIQUIDITY",
    description: "レポ市場、銀行預金、安全資産への資金移動を監視",
  },
  "bank-funding": {
    title: "銀行資金調達",
    eyebrow: "BANK FUNDING",
    description: "銀行間市場とFRB緊急流動性への依存を監視",
  },
  "bank-capital": {
    title: "銀行資本・預金保護",
    eyebrow: "BANK CAPITAL",
    description: "銀行の損失吸収力と預金保険制度の余力を監視",
  },
  "household-credit": {
    title: "家計信用",
    eyebrow: "HOUSEHOLD CREDIT",
    description: "家計の債務量と返済負担が安全圏にあるかを監視",
  },
  "credit-supply": {
    title: "信用供給",
    eyebrow: "CREDIT SUPPLY",
    description: "銀行の貸出基準が信用収縮を招く水準かを監視",
  },
  "private-markets": {
    title: "商業不動産・プライベートクレジット",
    eyebrow: "PRIVATE MARKETS",
    description: "不透明な信用市場に潜む損失の火元を監視",
  },
  "equity-vulnerability": {
    title: "株式市場の脆弱性",
    eyebrow: "EQUITY VULNERABILITY",
    description:
      "割高感・レバレッジ・下落余地を確認。安全弁ではなく損失増幅要因として扱います。",
  },
  economy: {
    title: "雇用・景気補助指標",
    eyebrow: "ECONOMY SUPPORT",
    description: "市場ストレスを補完する雇用・景況データ",
  },
} as const;

export const TYPE_LABELS = {
  safety_valve: "Safety Valve",
  warning_signal: "Warning Signal",
  vulnerability: "Vulnerability",
  smart_money_signal: "Smart Money",
  behavior_signal: "Behavior Signal",
};

export const TYPE_SECTIONS: Record<
  CoreIndicatorType,
  {
    title: string;
    english: string;
    description: string;
    accent: string;
  }
> = {
  safety_valve: {
    title: "点火・導火線（安全弁）",
    english: "IGNITION / SAFETY VALVES",
    description: "信用・流動性・銀行資本の安全弁を確認します。ここが機能低下した時だけ、点火層の悪化として扱います。",
    accent: "from-emerald-300 to-cyan-500",
  },
  warning_signal: {
    title: "触発・火花（警告サイン）",
    english: "TRIGGER / WARNING SIGNALS",
    description: "リセッションやベア相場の接近を知らせるセンサー。点灯数と悪化速度を確認します。",
    accent: "from-amber-300 to-orange-500",
  },
  vulnerability: {
    title: "脆弱性・爆薬",
    english: "VULNERABILITY",
    description: "点火時の被害を大きくする要因。赤が多いほど危機時の破壊力が高まります。",
    accent: "from-rose-400 to-red-600",
  },
};

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  critical: "最重要",
  important: "重要",
  ignition: "火元",
  supporting: "補助",
};

export const INDICATOR_CONFIGS: IndicatorConfig[] = [
  {
    id: "hy-oas",
    name: "HY OAS",
    shortName: "ハイイールド信用",
    type: "safety_valve",
    category: "credit",
    importance: "critical",
    unit: "bp",
    decimals: 0,
    description: "信用市場ストレスを早い段階で捉える主要指標",
    thresholdLabel: "400bp未満：緑 / 400〜500bp未満：黄 / 500bp以上：赤",
    fredSeries: ["BAMLH0A0HYM2"],
    mode: "fred",
    threshold: { yellowAt: 400, redAt: 500 },
    multiplier: 100,
  },
  {
    id: "baa-aaa",
    name: "BAA-AAAスプレッド",
    shortName: "社債信用格差",
    type: "safety_valve",
    category: "credit",
    importance: "critical",
    unit: "%",
    decimals: 2,
    description: "社債の信用格差。本物の金融ストレスの境界線",
    thresholdLabel: "1.0%未満：緑 / 1.0〜2.0%未満：黄 / 2.0%以上：赤",
    fredSeries: ["BAA10Y", "AAA10Y"],
    mode: "spread",
    threshold: { yellowAt: 1, redAt: 2 },
  },
  {
    id: "ig-oas",
    name: "IG OAS",
    shortName: "投資適格社債",
    type: "safety_valve",
    category: "credit",
    importance: "important",
    unit: "%",
    decimals: 2,
    description:
      "投資適格社債まで売られ始めると金融ストレスが広がっているサイン",
    thresholdLabel: "1.0%未満：緑 / 1.0〜1.5%未満：黄 / 1.5%以上：赤",
    fredSeries: ["BAMLC0A0CM"],
    mode: "fred",
    threshold: { yellowAt: 1, redAt: 1.5 },
  },
  {
    id: "ccc-oas",
    name: "CCC OAS",
    shortName: "低格付け信用",
    type: "warning_signal",
    category: "credit",
    importance: "important",
    unit: "bp",
    decimals: 0,
    description:
      "信用市場の最下層。急拡大は資金調達困難が始まっている可能性を示す",
    thresholdLabel: "700bp未満：緑 / 700〜1000bp未満：黄 / 1000bp以上：赤",
    fredSeries: ["BAMLH0A3HYC"],
    mode: "fred",
    threshold: { yellowAt: 700, redAt: 1000 },
    multiplier: 100,
  },
  {
    id: "vix",
    name: "VIX（恐怖指数）",
    shortName: "株式市場",
    type: "warning_signal",
    category: "credit",
    importance: "supporting",
    unit: "",
    decimals: 1,
    description: "株式市場の不安度。30超えで警戒、40でパニック",
    thresholdLabel: "20未満：緑 / 20〜30未満：黄 / 30以上：赤",
    fredSeries: ["VIXCLS"],
    mode: "fred",
    threshold: { yellowAt: 20, redAt: 30 },
  },
  {
    id: "dgs10",
    name: "米10年国債利回り",
    shortName: "長期金利",
    type: "warning_signal",
    category: "rates",
    importance: "supporting",
    unit: "%",
    decimals: 2,
    description: "財政・金利の指標。5%超で警戒水準",
    thresholdLabel: "4.5%未満：緑 / 4.5〜5.0%未満：黄 / 5.0%以上：赤",
    fredSeries: ["DGS10"],
    mode: "fred",
    threshold: { yellowAt: 4.5, redAt: 5 },
  },
  {
    id: "dgs30",
    name: "米30年国債利回り",
    shortName: "超長期金利",
    type: "warning_signal",
    category: "rates",
    importance: "important",
    unit: "%",
    decimals: 2,
    description:
      "長期金利と財政不安の温度計。5%超えは幅広い市場への圧力を強める",
    thresholdLabel: "4.7%未満：緑 / 4.7〜5.0%未満：黄 / 5.0%以上：赤",
    fredSeries: ["DGS30"],
    mode: "fred",
    threshold: { yellowAt: 4.7, redAt: 5 },
  },
  {
    id: "move",
    name: "MOVE指数",
    shortName: "債券市場の恐怖",
    type: "warning_signal",
    category: "rates",
    importance: "important",
    unit: "",
    decimals: 1,
    description:
      "株よりも債券市場の不安を示す。金利ショックや国債市場不安の監視に重要",
    thresholdLabel: "100未満：緑 / 100〜130未満：黄 / 130以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 100, redAt: 130 },
  },
  {
    id: "treasury-auction",
    name: "米国債入札ストレス",
    shortName: "国債入札",
    type: "safety_valve",
    category: "rates",
    importance: "supporting",
    unit: "x",
    decimals: 2,
    description: "長期米国債入札の応札倍率。需要低下とディーラー負担を監視する",
    thresholdLabel:
      "2.30倍以上：緑 / 2.10〜2.30倍未満：黄 / 2.10倍未満：赤",
    fredSeries: [],
    mode: "treasury-auction",
    thresholdDirection: "lower-is-worse",
  },
  {
    id: "sofr",
    name: "SOFR",
    shortName: "レポ市場",
    type: "safety_valve",
    category: "liquidity",
    importance: "important",
    unit: "%",
    decimals: 2,
    description:
      "短期金融市場の血流。乱れは金融システムの流動性不安につながる",
    thresholdLabel:
      "政策金利レンジ付近で安定：緑 / 上限を一時的に10bp超過：黄 / 25bp超過が3観測以上継続：赤",
    fredSeries: ["SOFR", "DFEDTARL", "DFEDTARU"],
    mode: "sofr",
  },
  {
    id: "ted-spread",
    name: "TEDスプレッド",
    shortName: "短期銀行信用プロキシ",
    type: "safety_valve",
    category: "bank-funding",
    importance: "important",
    unit: "%",
    decimals: 2,
    description:
      "旧TED系列は廃止済みのため、AA金融CPと3カ月T-Billの差で短期銀行信用ストレスを代替監視",
    thresholdLabel: "0.30%未満：緑 / 0.30〜0.60%未満：黄 / 0.60%以上：赤",
    fredSeries: ["DCPF3M", "DTB3"],
    mode: "ted-proxy",
    threshold: { yellowAt: 0.3, redAt: 0.6 },
  },
  {
    id: "fra-ois",
    name: "FRA-OIS",
    shortName: "銀行間流動性プロキシ",
    type: "safety_valve",
    category: "bank-funding",
    importance: "critical",
    unit: "bp",
    decimals: 0,
    description:
      "無料で安定取得できるFRA-OIS系列が限られるため、AA金融CPとSOFRの差で銀行調達プレミアムを代替監視",
    thresholdLabel: "20bp未満：緑 / 20〜50bp未満：黄 / 50bp以上：赤",
    fredSeries: ["DCPF3M", "SOFR"],
    mode: "fra-ois-proxy",
    threshold: { yellowAt: 20, redAt: 50 },
    multiplier: 100,
  },
  {
    id: "bank-deposit-outflow",
    name: "銀行預金流出",
    shortName: "銀行資金",
    type: "safety_valve",
    category: "liquidity",
    importance: "important",
    unit: "$B/w",
    decimals: 1,
    description: "銀行不安の初期サイン",
    thresholdLabel:
      "安定：緑 / 中小銀行から流出：黄 / 広範囲に流出・取り付け懸念：赤",
    fredSeries: ["DPSSCBW027SBOG"],
    mode: "bank-deposits",
    thresholdDirection: "lower-is-worse",
  },
  {
    id: "mmf-assets",
    name: "MMF残高",
    shortName: "安全資産逃避",
    type: "safety_valve",
    category: "liquidity",
    importance: "supporting",
    unit: "$B",
    decimals: 1,
    description: "銀行預金から安全資産へ逃避しているかを見る",
    thresholdLabel:
      "通常増減：緑 / 預金流出と同時に増加：黄 / 短期間で急増：赤",
    fredSeries: ["WRMFNS"],
    mode: "mmf",
  },
  {
    id: "discount-window",
    name: "Discount Window利用額",
    shortName: "FRB緊急貸出",
    type: "safety_valve",
    category: "bank-funding",
    importance: "important",
    unit: "$B",
    decimals: 1,
    description:
      "銀行がFRBの窓口貸出から緊急資金を調達している規模",
    thresholdLabel:
      "低位安定：緑 / 100億ドル超または週次急増：黄 / 500億ドル超または危機的急増：赤",
    fredSeries: ["WLCFLPCL"],
    mode: "emergency-lending",
    multiplier: 0.001,
  },
  {
    id: "btfp",
    name: "BTFP利用額",
    shortName: "銀行向け時限流動性",
    type: "safety_valve",
    category: "bank-funding",
    importance: "supporting",
    unit: "$B",
    decimals: 1,
    description:
      "2023年の銀行不安時に設けられた時限的な銀行向け流動性制度",
    thresholdLabel:
      "制度終了・残高ゼロ：緑 / 残高再増加：黄 / 500億ドル以上の危機時水準：赤",
    fredSeries: ["H41RESPPALDKNWW"],
    mode: "emergency-lending",
    multiplier: 0.001,
  },
  {
    id: "bank-cet1",
    name: "銀行CET1比率",
    shortName: "銀行自己資本",
    type: "safety_valve",
    category: "bank-capital",
    importance: "critical",
    unit: "%",
    decimals: 1,
    description:
      "損失を最初に吸収する普通株式等Tier1資本の厚さ",
    thresholdLabel: "10%以上：緑 / 8〜10%未満：黄 / 8%未満または急低下：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 10, redAt: 8 },
    thresholdDirection: "lower-is-worse",
  },
  {
    id: "fdic-dif",
    name: "FDIC預金保険基金",
    shortName: "預金保護余力",
    type: "safety_valve",
    category: "bank-capital",
    importance: "important",
    unit: "$B",
    decimals: 1,
    description:
      "銀行破綻時に保護対象預金を支えるDeposit Insurance Fundの残高",
    thresholdLabel: "増加・安定：緑 / 低下傾向：黄 / 銀行破綻増加で急減：赤",
    fredSeries: [],
    mode: "manual",
    thresholdDirection: "lower-is-worse",
  },
  {
    id: "household-debt-gdp",
    name: "家計債務 / GDP",
    shortName: "家計レバレッジ",
    type: "safety_valve",
    category: "household-credit",
    importance: "important",
    unit: "%",
    decimals: 1,
    description:
      "家計部門の債務残高が経済規模に対して過剰かを見る",
    thresholdLabel: "70%未満：緑 / 70〜80%未満：黄 / 80%以上：赤",
    fredSeries: ["HDTGPDUSQ163N"],
    mode: "fred",
    threshold: { yellowAt: 70, redAt: 80 },
  },
  {
    id: "household-dsr",
    name: "Household Debt Service Ratio",
    shortName: "家計返済負担",
    type: "safety_valve",
    category: "household-credit",
    importance: "important",
    unit: "%",
    decimals: 1,
    description:
      "家計の可処分所得に対する元利返済負担の割合",
    thresholdLabel: "10%未満：緑 / 10〜12%未満：黄 / 12%以上：赤",
    fredSeries: ["TDSP"],
    mode: "fred",
    threshold: { yellowAt: 10, redAt: 12 },
  },
  {
    id: "sloos",
    name: "SLOOS / 銀行貸出態度",
    shortName: "銀行信用供給",
    type: "safety_valve",
    category: "credit-supply",
    importance: "important",
    unit: "%",
    decimals: 1,
    description:
      "大中企業向け融資基準を引き締めた銀行の純割合",
    thresholdLabel: "20%未満：緑 / 20〜40%未満：黄 / 40%以上：赤",
    fredSeries: ["DRTSCILM"],
    mode: "fred",
    threshold: { yellowAt: 20, redAt: 40 },
  },
  {
    id: "office-cmbs",
    name: "Office CMBS延滞率",
    shortName: "オフィス不動産",
    type: "vulnerability",
    category: "private-markets",
    importance: "ignition",
    unit: "%",
    decimals: 1,
    description: "商業不動産、特にオフィス不動産の信用悪化を示す",
    thresholdLabel: "5%未満：緑 / 5〜8%未満：黄 / 8%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 5, redAt: 8 },
  },
  {
    id: "cmbs-total",
    name: "CMBS全体延滞率",
    shortName: "商業不動産",
    type: "vulnerability",
    category: "private-markets",
    importance: "supporting",
    unit: "%",
    decimals: 1,
    description: "商業不動産ローン全体の延滞状況",
    thresholdLabel: "4%未満：緑 / 4〜6%未満：黄 / 6%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 4, redAt: 6 },
  },
  {
    id: "private-credit-default",
    name: "Private Credit Default Rate",
    shortName: "プライベート信用",
    type: "vulnerability",
    category: "private-markets",
    importance: "ignition",
    unit: "%",
    decimals: 1,
    description:
      "プライベートクレジット市場の信用悪化。データが不透明なため手動更新",
    thresholdLabel: "2%未満：緑 / 2〜4%未満：黄 / 4%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 2, redAt: 4 },
  },
  {
    id: "pik-ratio",
    name: "PIK比率",
    shortName: "隠れ返済不安",
    type: "vulnerability",
    category: "private-markets",
    importance: "ignition",
    unit: "%",
    decimals: 1,
    description:
      "現金で利払いできず、利息を元本に積む比率。返済不能の隠れサイン",
    thresholdLabel: "5%未満：緑 / 5〜10%未満：黄 / 10%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 5, redAt: 10 },
  },
  {
    id: "leveraged-loan-default",
    name: "レバレッジドローン・デフォルト率",
    shortName: "高レバレッジ企業",
    type: "vulnerability",
    category: "private-markets",
    importance: "supporting",
    unit: "%",
    decimals: 1,
    description: "企業版サブプライム候補。信用悪化の火元になりやすい",
    thresholdLabel: "2%未満：緑 / 2〜4%未満：黄 / 4%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 2, redAt: 4 },
  },
  {
    id: "shiller-cape",
    name: "Shiller CAPE",
    shortName: "シラーPER",
    type: "vulnerability",
    category: "equity-vulnerability",
    importance: "supporting",
    unit: "",
    decimals: 1,
    description:
      "過去10年平均の実質利益に対して、株式市場がどれだけ割高かを見る指標",
    beginnerExplanation:
      "株式市場が企業の実力に対して高すぎるかを見る温度計です。",
    whyItMatters:
      "高いほど、悪材料が出た時の下落余地が大きくなります。ただし、暴落のタイミングを示すものではありません。",
    cautionComment:
      "シラーPERは割高感を見る指標であり、暴落のタイミングを示すものではありません。",
    dangerScenario:
      "信用市場や流動性指標が悪化した時に、割高な株式市場が大きく調整する可能性があります。",
    thresholdLabel: "25未満：緑 / 25〜30未満：黄 / 30〜35未満：橙 / 35以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 25, orangeAt: 30, redAt: 35 },
  },
  {
    id: "buffett-indicator",
    name: "Buffett Indicator",
    shortName: "バフェット指数",
    type: "vulnerability",
    category: "equity-vulnerability",
    importance: "supporting",
    unit: "%",
    decimals: 1,
    description:
      "株式市場全体の時価総額をGDPと比較し、経済規模に対する市場の膨らみを確認する",
    beginnerExplanation:
      "国の経済規模に対して、株式市場がどれだけ膨らんでいるかを見る指標です。",
    whyItMatters:
      "GDPに対して株価全体が大きく膨らみすぎると、市場全体の割高感が強く、危機時の下落余地を見る参考になります。",
    cautionComment:
      "バフェット指数が高いだけで暴落が起きるわけではありません。ただし、株式市場全体の脆弱性が高いことを示します。",
    dangerScenario:
      "信用収縮や流動性悪化が起きた時、経済規模に対して膨らんだ株式市場が大きく調整する可能性があります。",
    thresholdLabel: "100%未満：緑 / 100〜150%未満：黄 / 150〜200%未満：橙 / 200%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 100, orangeAt: 150, redAt: 200 },
  },
  {
    id: "margin-debt-gdp",
    name: "Margin Debt / GDP",
    shortName: "信用取引レバレッジ",
    type: "vulnerability",
    category: "equity-vulnerability",
    importance: "supporting",
    unit: "%",
    decimals: 1,
    description:
      "株式投資で使われている信用取引・借入の大きさをGDPと比較する",
    beginnerExplanation:
      "投資家が借金を使ってどれだけ株を買っているかを見る指標です。",
    whyItMatters:
      "大きいほど、株価が下がった時に追証や強制売却が起きやすく、下落スピードを速める可能性があります。",
    cautionComment:
      "Margin Debtは強制売却リスクを見るための指標です。危機の点火装置ではなく、下落を増幅するレバレッジ指標です。",
    dangerScenario:
      "株価下落時に追証や強制売却が連鎖し、下落が自己増幅する可能性があります。",
    thresholdLabel: "2.0%未満：緑 / 2.0〜2.5%未満：黄 / 2.5〜3.0%未満：橙 / 3.0%以上：赤",
    fredSeries: [],
    mode: "manual",
    threshold: { yellowAt: 2, orangeAt: 2.5, redAt: 3 },
  },
  {
    id: "margin-debt-m2",
    name: "信用残高 / M2",
    shortName: "レバレッジ過熱",
    type: "vulnerability",
    category: "equity-vulnerability",
    importance: "important",
    unit: "%",
    decimals: 2,
    description:
      "FINRA信用買い残高をM2マネーストックで割り、株式市場の借入燃料が流動性全体に対してどれだけ膨らんでいるかを見る",
    beginnerExplanation:
      "投資家が借金を使って株を買っている燃料の大きさを、世の中のお金の量と比べる過熱ゲージです。",
    whyItMatters:
      "比率が高いほど、悪材料が出た時に追証や強制売却が起きやすくなります。さらに高値圏からピークアウトすると、レバレッジ巻き戻しの予兆として注意します。",
    cautionComment:
      "これは暴落タイミングを当てる指標ではありません。FINRA信用残高は月次公表で約1カ月遅れがあり、脆弱性・爆薬として扱います。",
    dangerScenario:
      "高水準の信用買いがピークアウトし、株価下落と追証が重なると、強制売却が下落を増幅する可能性があります。",
    thresholdLabel:
      "4.5%未満：緑 / 4.5〜5.7%：黄 / 5.7%超：赤。参考線：リーマン前5.73%、ITバブル天井6.35%。",
    fredSeries: ["M2SL"],
    mode: "margin-debt-m2",
    threshold: { yellowAt: 4.5, redAt: 5.7 },
  },
  {
    id: "icsa",
    name: "初回失業保険申請件数",
    shortName: "雇用",
    type: "warning_signal",
    category: "economy",
    importance: "supporting",
    unit: "K",
    decimals: 0,
    description: "雇用悪化の先行指標。250K超で警戒",
    thresholdLabel: "250K未満：緑 / 250〜300K未満：黄 / 300K以上：赤",
    fredSeries: ["ICSA"],
    mode: "fred",
    threshold: { yellowAt: 250, redAt: 300 },
    multiplier: 0.001,
  },
];

export function getSignal(
  value: number,
  yellowAt: number,
  redAt: number,
  orangeAt?: number,
): Signal {
  if (value >= redAt) return "red";
  if (orangeAt !== undefined && value >= orangeAt) return "orange";
  if (value >= yellowAt) return "yellow";
  return "green";
}

export function getConfigSignal(
  config: IndicatorConfig,
  value: number,
): Signal {
  if (!config.threshold) return "unavailable";
  if (config.thresholdDirection === "lower-is-worse") {
    if (value < config.threshold.redAt) return "red";
    if (
      config.threshold.orangeAt !== undefined &&
      value < config.threshold.orangeAt
    ) {
      return "orange";
    }
    if (value < config.threshold.yellowAt) return "yellow";
    return "green";
  }
  return getSignal(
    value,
    config.threshold.yellowAt,
    config.threshold.redAt,
    config.threshold.orangeAt,
  );
}

export function createIndicator(
  config: IndicatorConfig,
  data: ManualIndicator,
  source: IndicatorValue["source"],
  signalOverride?: Signal,
): IndicatorValue {
  const numericValue = typeof data.value === "number" ? data.value : null;
  const previousNumericValue =
    typeof data.previousValue === "number" ? data.previousValue : null;
  const signal =
    signalOverride ??
    data.signal ??
    (numericValue !== null && config.threshold
      ? getConfigSignal(config, numericValue)
      : "unavailable");
  const previousSignal =
    data.previousSignal ??
    (previousNumericValue !== null && config.threshold
      ? getConfigSignal(config, previousNumericValue)
      : signal === "unavailable"
        ? "unavailable"
        : signal);

  return {
    ...config,
    value: data.value,
    previousValue: data.previousValue,
    numericValue,
    previousNumericValue,
    signal,
    previousSignal,
    observationDate: data.observationDate ?? data.updatedAt ?? null,
    source,
    sourceLabel: data.sourceLabel ?? data.sourceName,
    sourceName: data.sourceName,
    sourceUrl: data.sourceUrl,
    updateFrequency: data.updateFrequency,
    history: data.history ?? (
      numericValue !== null && data.observationDate
        ? [{ date: data.observationDate, value: numericValue }]
        : []
    ),
  };
}

export function createUnavailableIndicator(
  config: IndicatorConfig,
): IndicatorValue {
  return createIndicator(
    config,
    { value: null, previousValue: null, observationDate: null },
    "unavailable",
    "unavailable",
  );
}

export function getOverallSignal(
  indicators: IndicatorValue[],
): OverallSignal {
  const byId = new Map(indicators.map((item) => [item.id, item]));
  const hy = byId.get("hy-oas");
  const baa = byId.get("baa-aaa");
  const criticalSafetyValves = [hy, baa];

  if (
    criticalSafetyValves.some(
      (item) => !item || item.signal === "unavailable",
    )
  ) {
    return "unavailable";
  }

  const count = (type: CoreIndicatorType, signal: Signal) =>
    indicators.filter(
      (item) => item.type === type && item.signal === signal,
    ).length;
  const safetyRed = count("safety_valve", "red");
  const safetyOrange = count("safety_valve", "orange");
  const safetyYellow = count("safety_valve", "yellow");
  const warningRed = count("warning_signal", "red");
  const warningOrange = count("warning_signal", "orange");
  const warningYellow = count("warning_signal", "yellow");
  const vulnerabilityRed = count("vulnerability", "red");
  const vulnerabilityOrange = count("vulnerability", "orange");

  if (safetyRed >= 2 && warningRed >= 1) {
    return "crisis";
  }

  if (safetyRed >= 1) {
    return "red";
  }

  if (
    vulnerabilityRed + vulnerabilityOrange >= 1 &&
    safetyOrange === 0 &&
    safetyYellow === 0 &&
    warningRed === 0
  ) {
    return "localized";
  }

  if (
    safetyOrange >= 1 ||
    safetyYellow >= 1 ||
    warningRed >= 1 ||
    warningOrange >= 1 ||
    warningYellow >= 2
  ) {
    return "yellow";
  }

  if (warningYellow === 1) {
    return "green-yellow";
  }

  return "green";
}

export function getConfig(id: IndicatorId): IndicatorConfig {
  const config = INDICATOR_CONFIGS.find((item) => item.id === id);
  if (!config) throw new Error(`Unknown indicator: ${id}`);
  return config;
}
