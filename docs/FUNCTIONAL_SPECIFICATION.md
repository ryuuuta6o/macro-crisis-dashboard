# Macro Crisis Dashboard 機能仕様書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| システム名 | Macro Crisis Dashboard / Macro Signal |
| 公開URL | https://macro-crisis-dashboard.vercel.app/ |
| 文書種別 | 機能仕様書 |
| 対象 | ダッシュボード機能、データ取得、指標分類、判定ロジック、API、運用 |
| 対象外 | 画面デザイン、配色、アニメーション、3D表現、レイアウト詳細 |
| 基準日 | 2026-06-24 |
| 対象実装 | Next.js 16 / React 19 / TypeScript版 |

本書は、金融危機・リセッション・信用収縮の早期警戒ダッシュボードとしての機能仕様を定義する。表示デザインではなく、何を取得し、どう分類し、どう判定し、どの画面・APIで提供するかを記述する。

本システムは投資助言、売買推奨、価格予測、危機発生確率の断定を行わない。すべてのスコア、信号、警戒レンジは市場環境の状態表示である。

## 2. 初心者向け導入

### 2.1 このダッシュボードは何を見るものか

このダッシュボードは「今、金融システムが健康か、危ない状態か」を一目で見るための健康診断ツールである。株価が上がった下がっただけではなく、その奥にある「お金の流れ」が詰まっていないかを見る。

人間の健康診断にたとえると次の関係になる。

| 健康診断 | このダッシュボード | 見ているもの |
| --- | --- | --- |
| 体温・血圧 | Safety Valve / 安全弁 | お金の流れ、銀行、信用市場が正常に機能しているか |
| レントゲンの影 | Warning Signal / 警告サイン | 景気後退や市場ストレスが近づいているか |
| 生活習慣・持病 | Vulnerability / 脆弱性 | 危機が来た時に被害を大きくする要因 |

### 2.2 爆薬と導火線は別物

本ダッシュボードの重要な思想は、脆弱性と点火を分けることである。

- 脆弱性・爆薬: 株式市場の割高感、借入の過熱、CRE、Private Creditなど。危機が来た時の下落や連鎖を深くする。
- 導火線・点火: 信用市場が詰まる、銀行調達が悪化する、短期流動性が細るなど。実際に金融危機へ近づく条件。

爆薬が多くても、導火線に火がつくまでは爆発しない。したがって、脆弱性が赤でも、安全弁が正常なら即座に金融危機とは扱わない。

### 2.3 基本的な見方

1. Overall Risk Statusで全体の温度感を見る。
2. Liquidity Coreでお金の流れが詰まっていないか確認する。
3. Safety Valveが緑なら、信用・流動性の点火はまだ確認されていない。
4. Vulnerabilityは、もし危機が来た時の被害の大きさを見る。
5. Ignition Distanceで次の警戒線までの距離を見る。
6. Bubble Trigger Monitorで、流動性主導か信用主導か、どちらの崩れ方が近づいているかを見る。

### 2.4 各セクションの一言説明

| セクション | 初心者向け説明 |
| --- | --- |
| Overall Risk Status | いま金融全体が安全か危険か、ひとことで見る |
| Liquidity Core | お金の流れが詰まっていないかを見る最重要セクション |
| Crisis Risk Range | 4種類の危機がどれくらい近いかを見る。確率ではない |
| Ignition Distance | 危機の警戒ラインまで、あとどれくらいかを見る |
| Crisis Route Tracker | どの壊れ方の道筋が進んでいるかを見る |
| Bubble Trigger Monitor | ドットコム型とリーマン型、どちらの引き金が近いかを見る |
| Risk Velocity | 悪化のスピードが速いかを見る |
| Three-Layer Summary | 爆薬、予兆、着火の3層をまとめて見る |
| Combination Checklist | 危機条件がいくつ揃ったかを見る |
| Contagion Watch | 隠れた信用悪化が銀行や市場へ染み出していないかを見る |
| Margin Debt / M2 | 株式市場の借入過熱度を見る |
| Apocalypse Command Center | 異常の集中度を一つの状態スコアで見る。確率ではない |
| Similar Historical Regime | 過去のどの局面に似ているかを見る |
| Global Risk Map | 世界のどこでリスクが高まっているかを見る |

## 3. プロダクト目的

### 3.1 目的

金融危機を単なる株価下落ではなく、信用市場・流動性・資金調達・銀行機能の詰まりとして捉え、以下を一目で確認できる早期警戒システムを提供する。

1. 現在、お金の流れが詰まっているか
2. 金融危機の点火を防ぐ安全弁が機能しているか
3. 危機接近を知らせる警告サインが点灯しているか
4. 危機時の被害を大きくする脆弱性がどこにあるか
5. 悪化速度が速いか
6. 次の警戒線までどれだけ距離があるか
7. 危機条件がどこまで揃っているか
8. どの危機ルートが進行しているか
9. ニュース、行動シグナル、世界リスク、著名投資家情報が補助的に何を示しているか

### 3.2 基本方針

- メインの主役は信用・流動性・銀行機能である。
- `Safety Valve`、`Warning Signal`、`Vulnerability` を混同しない。
- VIX、MOVE、雇用指標は安全弁ではなく警告サインである。
- CRE、Private Credit、CAPE、Buffett Indicator、Margin Debt、Margin Debt / M2は安全弁ではなく脆弱性である。
- Smart Moneyと13Fは補助シグナルであり、安全弁ではない。
- 13Fは最大45日遅れの四半期データであり、リアルタイム判断には使用しない。
- 脆弱性が赤でも、それだけで金融危機点火とは判定しない。
- 点火判定は信用・流動性・銀行資金調達などの安全弁悪化を最重要視する。
- データ取得失敗時は推測値で埋めず、`unavailable` または明示的な手動フォールバックを表示する。
- 無料公開APIのみを使用する。有料APIを前提にしない。

## 4. 用語定義

### 4.1 Signal

| 値 | 意味 |
| --- | --- |
| `green` | 通常、安定、低リスク |
| `yellow` | 注意、初期悪化 |
| `orange` | 警戒、強めの注意 |
| `red` | 危険、高ストレス |
| `unavailable` | 取得不可、判定不可 |

### 4.2 OverallSignal

| 値 | 意味 |
| --- | --- |
| `green` | 全体として安定 |
| `green-yellow` | 軽い注意 |
| `yellow` | 注意フェーズ |
| `localized` | 局所的な脆弱性が高いが、安全弁は持ちこたえている |
| `red` | 安全弁の一部が機能低下 |
| `crisis` | 複数安全弁と警告サインが同時悪化 |
| `unavailable` | 主要判定に必要なデータ不足 |

### 4.3 IndicatorType

| type | 表示名 | 定義 |
| --- | --- | --- |
| `safety_valve` | Safety Valve / 安全弁 | 金融危機の点火を防ぐ装置。信用市場、短期資金市場、銀行資本、預金保護、家計信用など |
| `warning_signal` | Warning Signal / 警告サイン | 危機接近を知らせるセンサー。点灯しても即金融危機ではない |
| `vulnerability` | Vulnerability / 脆弱性・爆薬 | 点火時の被害を大きくする要因。単独では点火ではない |
| `smart_money_signal` | Smart Money / 補助シグナル | 著名投資家の公開ポジション変化 |
| `behavior_signal` | Behavior Signal / 行動シグナル | 人、企業、資金、政策当局の防衛行動 |

### 4.4 画面上の3層モデル

| 画面層 | 内部type | 役割 |
| --- | --- | --- |
| Vulnerability / 脆弱性・爆薬 | `vulnerability` | 危機時の被害を増幅する燃料 |
| Trigger / 触発・火花 | `warning_signal` | リセッションやベア相場を近づけるサイン |
| Ignition / 点火・導火線 | `safety_valve` | 安全弁の機能低下として表れる信用・流動性ストレス |

## 5. システム構成

### 5.1 技術構成

| 項目 | 技術 |
| --- | --- |
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS / CSS |
| Hosting | Vercel |
| Primary Data | FRED、NY Fed、U.S. Treasury、Fiscal Data、FDIC、GDELT、SEC EDGAR、Yahoo Chart、手動JSON |

### 5.2 主要ファイル責務

| ファイル | 責務 |
| --- | --- |
| `src/types/indicator.ts` | 指標ID、Signal、IndicatorValue等の型定義 |
| `src/lib/indicators.ts` | 指標定義、分類、閾値、信号判定、総合判定 |
| `src/lib/fred.ts` | 指標取得、FRED取得、代理計算、手動フォールバック、DashboardData生成 |
| `src/lib/early-warning.ts` | 危機警戒レンジ、悪化角度、点火距離、チェックリスト、危機ルート |
| `src/lib/liquidity-core.ts` | Liquidity Coreのカテゴリ集約 |
| `src/lib/classification.ts` | 3分類サマリーと総合コメント生成 |
| `src/lib/news.ts` | 市場インパクトニュース取得・判定 |
| `src/lib/free-macro-data.ts` | 無料公開APIによる景気後退・銀行破綻等の補助条件 |
| `src/lib/apocalypse.ts` | Apocalypse Score、異常検知、ニュース密度、資金逃避 |
| `src/lib/contagion-watch.ts` | 染み出しウォッチの取得・判定 |
| `src/lib/margin-debt-m2.ts` | Margin Debt / M2比率とピークアウト判定 |
| `src/lib/bubble-trigger.ts` | Bubble Trigger Monitorの2型判定 |
| `src/lib/global-risk.ts` | 世界地域リスク、マーケットパルス統合 |
| `src/lib/sec-13f.ts` | SEC 13F取得、著名投資家ポジション比較 |
| `src/data/manual-indicators.json` | 手動指標値、資産温度マップ |
| `src/data/published-indicators.json` | 公表値として優先使用する手動指標 |
| `src/config/manual-data.ts` | Contagion Watch、Margin Debt / M2などの手動設定 |
| `data/crisis-behavior.json` | 危機前行動シグナル |
| `data/global-risk.json` | 世界地域別の構造リスク |

### 5.3 データ取得の基本ルール

1. 指標は `INDICATOR_CONFIGS` を正本として並列取得する。
2. FRED系列は最大90観測を取得し、表示・API用履歴は最大60点に制限する。
3. FRED取得には `FRED_API_KEY` が必要。
4. 取得失敗時、手動フォールバックがあれば使用する。
5. フォールバックがなければ `unavailable` とする。
6. 0、空文字、推測値で欠損を埋めない。
7. `published-indicators.json` に値がある手動指標は、通常の `manual-indicators.json` より優先する。
8. キャッシュ再検証間隔と実データ公表頻度は別物として扱う。

## 6. 画面・ルート仕様

### 6.1 `/`

トップダッシュボード。主要な危機監視機能を集約する。

主な表示機能:

- Overall Risk Status
- Crisis Risk Range
- Liquidity Core
- Ignition Distance
- Crisis Route Tracker
- Bubble Trigger Monitor
- Risk Velocity
- Today's Change
- AI Market Summary
- Impact News Top 3
- Three-Layer Summary
- Combination Checklist
- Crisis Behavior Tracker要約
- Smart Money Tracker要約
- Global Risk Map要約
- Apocalypse Command Center
- Indicator Matrix
- Similar Historical Regime
- Risk Trend
- Footer disclaimer

詳細セクションは折りたたみ可能とし、トップでは主要状態を優先する。

### 6.2 `/behavior`

Crisis Behavior Trackerを表示する。

対象カテゴリ:

- Smart Money
- Insider Selling
- Escape Money
- Credit Escape
- Corporate Defense
- Policy Stress

データは `data/crisis-behavior.json` から読み込む。初期実装は手動管理である。

### 6.3 `/investors`

著名投資家の13Fポジション情報を表示する。

表示内容:

- 投資家一覧
- 最新13F
- 上位保有
- 新規ポジション
- 買い増し
- 減少
- 全売却
- セクター別傾向
- 攻め、守り、中立の判定
- 13F遅延注意書き

13Fは安全弁ではなく `smart_money_signal` として扱う。

### 6.4 `/global-risk`

世界経済リスクマップを表示する。

対象地域:

- United States
- Canada
- Germany
- United Kingdom
- France
- Italy
- Japan
- China
- India
- Russia
- Brazil
- Mexico
- Middle East
- Africa
- Southeast Asia
- Taiwan / Korea
- Australia
- Emerging Markets

リスク種別:

- 金利リスク
- 信用リスク
- 不動産リスク
- 地政学リスク
- AI・半導体リスク
- 流動性リスク

構造リスクは `data/global-risk.json`、市場パルスはYahoo Chart APIから取得する。

## 6. API仕様

### 6.1 `GET /api/indicators`

全指標データをJSONで返す。

返却概要:

```ts
type DashboardData = {
  indicators: IndicatorValue[];
  fetchedAt: string;
  unavailableCount: number;
};
```

`IndicatorValue` 主要項目:

```ts
type IndicatorValue = {
  id: IndicatorId;
  name: string;
  shortName: string;
  type: CoreIndicatorType;
  category: IndicatorCategory;
  importance: Importance;
  unit: string;
  decimals: number;
  value: number | string | null;
  previousValue: number | string | null;
  numericValue: number | null;
  previousNumericValue: number | null;
  signal: Signal;
  previousSignal: Signal;
  observationDate: string | null;
  source: "FRED" | "treasury" | "ny-fed" | "fiscal-data" | "market-data" | "published" | "manual" | "unavailable";
  sourceLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  updateFrequency?: string;
  history: { date: string; value: number }[];
};
```

### 6.2 `GET /api/news`

市場インパクトニュースを返す。

返却概要:

```ts
type MarketNewsFeed = {
  items: MarketNewsItem[];
  mode: "live" | "mixed" | "official" | "fallback";
  fetchedAt: string;
  latestPublishedAt: string | null;
  sourceSummary: string;
  isFallback: boolean;
};
```

ニュースはGDELT、公的RSS、固定JSONフォールバックを統合する。

### 6.3 `GET /api/global-risk`

世界地域リスクデータを返す。

内容:

- 地域別構造リスク
- 市場パルス
- 統合リスク色
- 関連ニュース
- 関連指標
- 資金逃避フロー

### 6.4 `GET /api/smart-money/investors`

SEC 13Fをもとにした投資家データを返す。取得失敗時は該当投資家を `unavailable` とし、推測値で埋めない。

## 7. 指標カテゴリ

### 7.1 IndicatorCategory

| category | 表示名 | 内容 |
| --- | --- | --- |
| `credit` | 信用市場 | 社債スプレッド、VIX等 |
| `rates` | 金利・国債市場 | 米国債利回り、MOVE、国債入札 |
| `liquidity` | 短期流動性 | SOFR、預金、MMF |
| `bank-funding` | 銀行資金調達 | TED、FRA-OIS、Discount Window、BTFP |
| `bank-capital` | 銀行資本・預金保護 | CET1、FDIC DIF |
| `household-credit` | 家計信用 | 家計債務、DSR |
| `credit-supply` | 信用供給 | SLOOS、貸出態度 |
| `private-markets` | 商業不動産・Private Credit | CMBS、Private Credit、PIK、Leveraged Loan |
| `equity-vulnerability` | 株式市場の脆弱性 | CAPE、Buffett、Margin Debt、Margin Debt / M2 |
| `economy` | 雇用・景気補助 | 失業保険等 |

## 8. 実装済み指標仕様

### 8.1 Safety Valves / 安全弁

| ID | 指標 | category | 取得 | 閾値 |
| --- | --- | --- | --- | --- |
| `hy-oas` | HY OAS | credit | FRED `BAMLH0A0HYM2` | 400bp未満 green、400〜500 yellow、500以上 red |
| `baa-aaa` | BAA-AAA Spread | credit | FRED `BAA10Y - AAA10Y` | 1.0%未満 green、1.0〜2.0 yellow、2.0以上 red |
| `ig-oas` | IG OAS | credit | FRED `BAMLC0A0CM` | 1.0%未満 green、1.0〜1.5 yellow、1.5以上 red |
| `treasury-auction` | 米国債入札ストレス | rates | Fiscal Data | 2.30倍以上 green、2.10〜2.30 yellow、2.10未満 red |
| `sofr` | SOFR | liquidity | FRED / NY Fed | 政策金利上限からの乖離で判定 |
| `ted-spread` | TED Spread proxy | bank-funding | FRED `DCPF3M - DTB3` | 0.30%未満 green、0.30〜0.60 yellow、0.60以上 red |
| `fra-ois` | FRA-OIS proxy | bank-funding | FRED `DCPF3M - SOFR` | 20bp未満 green、20〜50 yellow、50以上 red |
| `bank-deposit-outflow` | 銀行預金流出 | liquidity | FRED `DPSSCBW027SBOG` | 週次流出額で判定 |
| `mmf-assets` | MMF残高 | liquidity | FRED `WRMFNS` | 週次増加額で判定 |
| `discount-window` | Discount Window利用額 | bank-funding | FRED `WLCFLPCL` | 10B超または増加 yellow、50B超または急増 red |
| `btfp` | BTFP利用額 | bank-funding | FRED `H41RESPPALDKNWW` | 0 green、残高あり yellow、50B以上 red |
| `bank-cet1` | 銀行CET1比率 | bank-capital | manual | 10%以上 green、8〜10 yellow、8未満 red |
| `fdic-dif` | FDIC預金保険基金 | bank-capital | manual | 安定 green、低下 yellow、急減 red |
| `household-debt-gdp` | 家計債務 / GDP | household-credit | FRED `HDTGPDUSQ163N` | 70未満 green、70〜80 yellow、80以上 red |
| `household-dsr` | Household DSR | household-credit | FRED `TDSP` | 10未満 green、10〜12 yellow、12以上 red |
| `sloos` | SLOOS / 銀行貸出態度 | credit-supply | FRED `DRTSCILM` | 20未満 green、20〜40 yellow、40以上 red |

### 8.2 Warning Signals / 警告サイン

| ID | 指標 | category | 取得 | 閾値 |
| --- | --- | --- | --- | --- |
| `ccc-oas` | CCC OAS | credit | FRED `BAMLH0A3HYC` | 700bp未満 green、700〜1000 yellow、1000以上 red |
| `vix` | VIX | credit | FRED `VIXCLS` | 20未満 green、20〜30 yellow、30以上 red |
| `dgs10` | 米10年国債利回り | rates | FRED `DGS10` / Treasury fallback | 4.5未満 green、4.5〜5.0 yellow、5.0以上 red |
| `dgs30` | 米30年国債利回り | rates | FRED `DGS30` / Treasury fallback | 4.7未満 green、4.7〜5.0 yellow、5.0以上 red |
| `move` | MOVE指数 | rates | Yahoo Chart / manual fallback | 100未満 green、100〜130 yellow、130以上 red |
| `icsa` | 初回失業保険申請件数 | economy | FRED `ICSA` | 250K未満 green、250〜300K yellow、300K以上 red |

### 8.3 Vulnerabilities / 脆弱性・爆薬

| ID | 指標 | category | 取得 | 閾値 |
| --- | --- | --- | --- | --- |
| `office-cmbs` | Office CMBS延滞率 | private-markets | published/manual | 5未満 green、5〜8 yellow、8以上 red |
| `cmbs-total` | CMBS全体延滞率 | private-markets | published/manual | 4未満 green、4〜6 yellow、6以上 red |
| `private-credit-default` | Private Credit Default Rate | private-markets | published/manual | 2未満 green、2〜4 yellow、4以上 red |
| `pik-ratio` | PIK比率 | private-markets | published/manual | 5未満 green、5〜10 yellow、10以上 red |
| `leveraged-loan-default` | レバレッジドローン・デフォルト率 | private-markets | published/manual | 2未満 green、2〜4 yellow、4以上 red |
| `shiller-cape` | Shiller CAPE | equity-vulnerability | manual | 25未満 green、25〜30 yellow、30〜35 orange、35以上 red |
| `buffett-indicator` | Buffett Indicator | equity-vulnerability | manual | 100未満 green、100〜150 yellow、150〜200 orange、200以上 red |
| `margin-debt-gdp` | Margin Debt / GDP | equity-vulnerability | manual | 2.0未満 green、2.0〜2.5 yellow、2.5〜3.0 orange、3.0以上 red |
| `margin-debt-m2` | 信用残高 / M2 | equity-vulnerability | FINRA manual + FRED `M2SL` | 4.5未満 green、4.5〜5.7 yellow、5.7超 red |

## 9. 総合判定仕様

### 9.1 Overall Risk Status

総合判定は `getOverallSignal()` で算出する。

判定順:

1. HY OASまたはBAA-AAAが取得不可なら `unavailable`
2. safety_valveの赤が2件以上、かつwarning_signalの赤が1件以上なら `crisis`
3. safety_valveの赤が1件以上なら `red`
4. vulnerabilityの赤または橙が1件以上、かつ安全弁が黄・橙でなく、warning_signal赤もなければ `localized`
5. safety_valveに黄・橙がある、またはwarning_signalに赤・橙がある、またはwarning_signal黄が2件以上なら `yellow`
6. warning_signal黄が1件なら `green-yellow`
7. その他は `green`

重要: 脆弱性の赤だけでは `red` または `crisis` にしない。

### 9.2 3分類サマリー

各typeの利用可能指標の最悪Signalを採用する。

Safety Valve:

- green: 機能中
- yellow: 要注意
- orange: 強い注意
- red: 機能低下
- unavailable: 判定待ち

Warning Signal:

- green: 静穏
- yellow: 点灯中
- orange: 強めに点灯
- red: 強く点灯
- unavailable: 判定待ち

Vulnerability:

- green: 抑制的
- yellow: 蓄積中
- orange: 警戒
- red: 高リスク
- unavailable: 判定待ち

### 9.3 コメント生成

基本ルール:

- 安全弁赤かつ脆弱性赤の場合、安全弁低下と脆弱性の組み合わせに注意するコメントを出す。
- HY OASとBAA-AAAが緑で、脆弱性に黄以上がある場合、信用市場全体への延焼は未確認だが脆弱性は高いと説明する。
- それ以外は、安全弁、警告サイン、脆弱性を分けて短文で説明する。

## 10. Liquidity Core仕様

Liquidity Coreは「お金の流れが詰まっているか」を確認する最重要セクションである。

### 10.1 カテゴリ

| カテゴリ | 対象指標 |
| --- | --- |
| Credit Market | HY OAS、IG OAS、BAA-AAA、CCC OAS |
| Short-Term Funding | SOFR、FRA-OIS、TED Spread |
| Bank Liquidity | Bank Deposit Outflows、MMF Balance、Discount Window、BTFP、Bank CET1 |
| Treasury Market | U.S. 10Y、U.S. 30Y、Treasury Auction Stress、MOVE |
| Credit Supply | SLOOS、Leveraged Loan Default |

### 10.2 カテゴリ判定

利用可能な所属指標の最悪Signalを基本とする。

総合状態:

- redカテゴリが2以上: red
- redカテゴリが1以上、またはorangeカテゴリが1以上: orange
- yellowカテゴリが2以上: yellow
- 全カテゴリ取得不可: unavailable
- その他: green

### 10.3 悪化項目

次のいずれかに該当する指標を悪化項目として最大6件表示する。

- 現在Signalがyellow、orange、red
- 前回Signalより悪化
- 数値が悪化方向へ動いた

## 11. Crisis Risk Range仕様

4つの警戒レンジを表示する。

| レンジ | 内容 |
| --- | --- |
| Recession Risk | 景気後退リスク |
| Bear Market Risk | ベア相場リスク |
| Systemic Crisis Risk | システミック危機リスク |
| Extreme Crisis Risk | 極端危機リスク |

### 11.1 表示レンジ

| スコア | 表示 |
| --- | --- |
| 0〜19 | 低 |
| 20〜39 | 低〜中 |
| 40〜59 | 中 |
| 60〜79 | 中〜高 |
| 80〜100 | 高 |

スコアは確率ではない。

### 11.2 基礎スコア

Signalを次の点数へ変換する。

| Signal | 点 |
| --- | --- |
| green | 5 |
| yellow | 38 |
| orange | 68 |
| red | 100 |
| unavailable | 0 |

### 11.3 Systemic Crisis抑制ルール

HY OAS、IG OAS、BAA-AAA、SOFR、FRA-OIS、TED Spreadなどの重要な信用・流動性指標に黄以上がない場合、Systemic Crisis Riskは24点以下に抑制する。

### 11.4 Extreme Crisis抑制ルール

Extreme Crisis Checklistの成立条件が0件の場合、Extreme Crisis Riskは19点以下に抑制する。

## 12. Risk Velocity仕様

### 12.1 目的

直近1日、7日、30日の悪化速度を表示する。

### 12.2 対象

- HY OAS
- IG OAS
- BAA-AAA
- VIX
- MOVE
- 米10年債
- 米30年債
- SOFR
- 銀行預金流出
- MMF
- 初回失業保険申請件数
- 重要ニュース密度

### 12.3 比較方法

1. 最新観測日を基準とする。
2. 1日、7日、30日前以前で最も近い実測値を探す。
3. 補間値は使わない。
4. 比較値がない場合、その指標は対象外とする。

### 12.4 判定

各指標の変化量を感応度で正規化する。正規化値が0.2以上なら悪化候補。

判定:

- HY OAS、IG OAS、VIXが同時悪化、または3カテゴリ以上かつ4指標以上が悪化: 連鎖悪化
- 最大悪化または平均悪化が大きい: 急悪化
- 悪化候補あり: やや悪化
- その他: 安定

脆弱性だけの悪化は点火扱いにしない。

## 13. Ignition Distance仕様

次の重要指標について、次の警戒線までの距離を表示する。

| 指標 | 警戒線 |
| --- | --- |
| HY OAS | 400bp、500bp、600bp |
| BAA-AAA | 2.0%、3.0% |
| IG OAS | 1.0%、1.5%、3.0% |
| VIX | 30、40 |
| SOFR / Repo | 日次急変0.10% |
| FRA-OIS proxy | 20bp、50bp |
| TED proxy | 0.30%、0.60% |
| Treasury Auction | 2.30倍、2.10倍。低下方向が悪化 |

現在値が警戒線を越えている場合は「警戒線を通過」と表示する。

## 14. Combination Checklist仕様

危機タイプ別に条件成立を表示する。

### 14.1 状態

| 状態 | 意味 |
| --- | --- |
| `met` | 成立 |
| `watch` | 接近 |
| `not_met` | 未成立 |
| `unavailable` | 未取得 |

未取得は成立数の分母に含めない。

### 14.2 Recession Checklist

- FRED景気後退確率
- 消費者信頼感
- 経済活動指数
- 初回失業保険申請250K超
- Sahm Rule
- Payroll Momentum

### 14.3 Systemic Crisis Checklist

- HY OAS 400bp超
- IG OAS 1.5%超
- BAA-AAA 2.0%超
- VIX 30定着
- 銀行預金流出加速
- Discount Window急増
- 国債入札不調が連続
- FDIC銀行破綻

### 14.4 Extreme Crisis Checklist

- HY OAS 600bp超
- VIX 40定着
- FDIC銀行破綻が90日以内に複数
- SOFR / Repoストレス
- 国債入札不調が連続
- 緊急支援後も安全弁ストレス

## 15. Crisis Route Tracker仕様

3つの危機ルートを横断監視する。

### 15.1 進行判定

各ルートは5段階で構成される。

現在地は「先頭から黄・橙・赤が連続して成立した最後の段階」とする。途中だけ悪化している場合は「単独注意」とし、ルート進行とは数えない。

### 15.2 Inflation / Supply Shock Route

1. コモディティニュース
2. インフレニュース
3. 中央銀行ニュース
4. 雇用悪化
5. 信用悪化

### 15.3 Credit Bubble Collapse Route

1. CRE / Private Credit
2. 信用スプレッド
3. 貸出態度 / 短期資金
4. ローン・デフォルト
5. 銀行流動性・資本

### 15.4 Sovereign / Liquidity Route

1. 国債入札
2. 長期金利 / MOVE
3. Repo / SOFR
4. 銀行流動性
5. 政策対応

## 16. Apocalypse Command Center仕様

### 16.1 Apocalypse Score

演出上の名称であり、危機確率ではない。

Signal基礎点:

| Signal | 点 |
| --- | --- |
| green | 8 |
| yellow | 42 |
| orange | 70 |
| red | 100 |

合成式:

```text
Apocalypse Score =
  安全弁ストレス平均 × 35%
  + 警告サイン平均 × 20%
  + 脆弱性平均 × 20%
  + Market Escape Index × 15%
  + Panic News Radar × 10%
```

表示:

| スコア | 表示 |
| --- | --- |
| 0〜24 | CONTAINED |
| 25〜49 | WATCH MODE |
| 50〜74 | ELEVATED RISK |
| 75〜100 | SEVERE STRESS |

### 16.2 今日の異常検知

各指標の順位点:

```text
順位点 = 現在Signalの基礎点
       + 悪化したSignal段階数 × 30
       + 前回比率の絶対値 × 100（最大30）
```

上位4件を表示する。統計的異常検知ではなくルールベース順位である。

### 16.3 Crisis Timeline

段階:

1. Vulnerability Buildup
2. Warning Cluster
3. Liquidity Thinning
4. Credit Freeze
5. Policy Response

判定:

1. Policy Stressがorangeまたはredなら段階5
2. redの安全弁が2件以上なら段階4
3. orangeまたはredの安全弁が1件以上なら段階3
4. green以外の警告サインが2件以上なら段階2
5. その他は段階1

### 16.4 Panic News Radar

24時間以内の記事を対象に計算する。

```text
News Score =
  記事数 × 5
  + red記事数 × 12
  + 平均impactScore × 1.25
```

### 16.5 Market Escape Index

対象:

- MMF
- 銀行預金流出
- HY OAS
- IG OAS
- VIX
- Escape Money
- Credit Escape

市場指標65%、行動シグナル35%で合成する。

## 17. Contagion Watch仕様

### 17.1 目的

Private Credit等の脆弱性が銀行・ノンバンク与信を通じて信用市場へ染み出し、HY OAS等の点火指標へ波及する経路を監視する。

### 17.2 監視指標

| 指標 | 取得 | 判定 |
| --- | --- | --- |
| 銀行からノンバンク向け与信 | FRED `LNFACBW027SBOG`。失敗時 `BUSLOANS` | 残高、前年比、増加方向 |
| BDC非発生率 | `src/config/manual-data.ts` | 3%未満 green、3〜5 yellow、5超 red |
| 大型PCファンドNAV | `src/config/manual-data.ts` | 非マイナス green、単月マイナス yellow、連続マイナス red |

### 17.3 総合判定

| 条件 | 状態 |
| --- | --- |
| 3指標すべてgreen | じわじわ継続 |
| 1〜2指標がyellowまたはred | 染み出し開始 |
| 3指標すべて悪化、特にBDC非発生率5%超 | 急性化目前 |

赤状態のみ、Ignition層に「HY OAS点火の予兆」バッジを表示する。

## 18. Margin Debt / M2仕様

### 18.1 目的

FINRA信用買い残高をM2マネーストックで割り、株式市場のレバレッジ過熱度を測る。これは安全弁ではなく、点火時の被害を大きくする脆弱性として扱う。

### 18.2 計算

```text
Margin Debt / M2 (%) =
  FINRA Margin Debt（百万ドル）
  ÷ (FRED M2SL（十億ドル） × 1000)
  × 100
```

### 18.3 データ

| データ | 取得 |
| --- | --- |
| M2 | FRED `M2SL` |
| FINRA Margin Debt | `src/config/manual-data.ts` の月次手動設定 |

FINRA Margin Debtは月次公表で約1カ月遅れがある。

### 18.4 閾値

| 条件 | Signal |
| --- | --- |
| 4.5%未満 | green |
| 4.5%以上、5.7%以下 | yellow |
| 5.7%超 | red |

参考線:

- リーマン前: 5.73%
- ITバブル天井: 6.35%

### 18.5 ピークアウト検出

直近12カ月の比率履歴を使用する。

検出条件:

1. 直近値が前月値より低い
2. 過去3カ月高値が5.73%以上
3. 過去3カ月高値から直近値への低下幅が0.15ポイント以上

検出時:

- 表示: `レバレッジ縮小開始 = 巻き戻しの予兆`
- Ignition層に `レバレッジ巻き戻し開始` バッジを表示

未検出時:

- 表示: `燃料蓄積中（高水準だが反転せず）`

重要: ピークアウト検出は金融危機確定ではない。脆弱性の巻き戻し予兆であり、点火層の補助バッジとして扱う。

## 19. Market News仕様

### 19.1 取得元

- GDELT DOC 2.0
- FRB、FDIC、SECなどの公的RSS
- `src/data/news.json` フォールバック

### 19.2 フィードモード

| mode | 意味 |
| --- | --- |
| `live` | ライブ取得のみ |
| `mixed` | ライブと公的RSSの混合 |
| `official` | 公的RSS中心 |
| `fallback` | 固定JSON |

### 19.3 MarketNewsItem

```ts
type MarketNewsItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  impactLevel: "green" | "yellow" | "red";
  impactScore: number;
  impactCategory: string;
  relatedIndicators: string[];
  reason: string;
};
```

ニュースは危機判定の補助であり、単独で金融危機判定を行わない。

## 20. Crisis Behavior Tracker仕様

### 20.1 データ形式

`data/crisis-behavior.json`

```json
{
  "updatedAt": "2026-06-15T00:00:00Z",
  "items": [
    {
      "id": "smart-money",
      "name": "Smart Money",
      "level": "yellow",
      "summary": "著名投資家はやや守り寄り。",
      "evidence": [],
      "sourceType": "manual",
      "sourceUrls": []
    }
  ]
}
```

### 20.2 カテゴリ

- Smart Money
- Insider Selling
- Escape Money
- Credit Escape
- Corporate Defense
- Policy Stress

単一ニュースでは赤にしない。広がり、継続性、複数ソースを確認して更新する。

## 21. Smart Money / 13F仕様

### 21.1 目的

著名投資家の公開13Fポジション変化を補助情報として表示する。金融危機の安全弁ではない。

### 21.2 注意事項

- 13Fは四半期末時点の保有情報である。
- 提出は最大45日遅れる。
- ショート、現金、多くの債券、提出後の売買は把握できない。
- リアルタイム判断には使用しない。
- 投資助言として扱わない。

### 21.3 対象

`src/data/smart-money-investors.json` で管理する。

例:

- Warren Buffett
- Michael Burry
- Stanley Druckenmiller
- Ray Dalio
- Bill Ackman
- David Tepper

## 22. Global Risk Map仕様

### 22.1 目的

地域別の構造リスクと市場パルスを統合し、世界のどこでリスクが高まっているかを示す。

### 22.2 データ

| 種別 | 取得 |
| --- | --- |
| 構造リスク | `data/global-risk.json` |
| 市場パルス | Yahoo Chart API |
| 地図形状 | Natural Earth 1:110m |

### 22.3 市場パルス判定

ストレス方向の変化率:

| 変化率 | Signal |
| --- | --- |
| 0.5%未満 | green |
| 0.5%以上 | yellow |
| 1.5%以上 | orange |
| 3.0%以上 | red |

通常の株価指数は下落方向をストレス、通貨プロキシなどは定義に応じて上昇方向をストレスとして扱う。

### 22.4 統合判定

地域の最終Signalは、構造リスクと市場パルスのうち高い方を採用する。

## 23. データ鮮度・キャッシュ

| データ | アプリ再検証 | 実データ頻度 |
| --- | --- | --- |
| FRED主要指標 | 15分 | 日次、週次、月次、四半期 |
| NY Fed SOFR | 15分 | 営業日次 |
| U.S. Treasury | 15分 | 日次または入札時 |
| News | 5分 | 配信元依存 |
| Global Risk market pulse | 5分 | 市場営業中の配信依存 |
| SEC 13F | 6時間 | 四半期、最大45日遅れ |
| Behavior Signal | 手動 | JSON更新時 |
| Private Credit / CMBS等 | 手動・公表値 | 原典公表時 |
| Margin Debt / M2 | M2はFRED、信用残高は手動 | FINRA月次公表後 |

`LIVE` 表示は「アプリが取得処理を行った」ことを意味し、全データが秒単位リアルタイムであることを意味しない。

## 24. 障害時仕様

1. 指標単位で取得失敗しても、他指標の取得は継続する。
2. フォールバックがある場合は、出典、観測日、更新頻度を表示する。
3. フォールバックがない場合は `unavailable`。
4. APIキーや内部スタックをレスポンスに含めない。
5. ニュース取得失敗時は段階的に公的RSS、固定JSONへ縮退する。
6. 13F取得失敗時は投資家単位で `unavailable`。
7. 世界市場パルスの一部失敗は部分取得として扱う。

## 25. 環境変数

必須:

```text
FRED_API_KEY=<FRED API key>
```

任意:

```text
SEC_USER_AGENT=<service name and contact>
```

## 26. 運用仕様

### 26.1 手動指標更新

1. 一次情報または明示された公開ソースを確認する。
2. 現在値を前回値へ移す。
3. 新しい値、観測日、出典URL、更新頻度を入力する。
4. 閾値と単位を確認する。
5. `npm run lint` を実行する。
6. `npm run build` を実行する。
7. ローカル画面で値、信号色、更新日、出典リンクを確認する。
8. 本番反映後、公開URLとAPIを確認する。

### 26.2 Margin Debt / M2更新

1. FINRA Margin Statisticsの最新月次値を確認する。
2. `src/config/manual-data.ts` の `MARGIN_DEBT_M2_CONFIG.marginDebtHistory` に新しい月を追加する。
3. 単位は百万ドルで入力する。
4. 最新12カ月分を維持する。
5. M2はFRED `M2SL` から自動取得されるため手動更新しない。
6. `/api/indicators` で `margin-debt-m2` の値、履歴、Signalを確認する。

### 26.3 Behavior Signal更新

1. `data/crisis-behavior.json` を更新する。
2. 単一ニュースではなく複数根拠でレベルを決める。
3. `updatedAt`、`evidence`、`sourceUrls` を更新する。

### 26.4 Global Risk更新

1. `data/global-risk.json` の構造リスクを更新する。
2. 市場パルスは自動取得のため、構造リスクと混同しない。
3. 地域、リスク種別、関連ニュース、関連指標を確認する。

## 27. 品質ゲート

公開前に必ず実行する。

```bash
npm run lint
npx tsc --noEmit
npm run build
```

確認対象:

- `/`
- `/behavior`
- `/investors`
- `/global-risk`
- `/api/indicators`
- `/api/news`
- `/api/global-risk`
- `/api/smart-money/investors`

確認項目:

- 指標値が表示される
- `unavailable` が適切に表示される
- 閾値とSignalが一致する
- 手動データの出典が表示される
- ニュースが取得モード付きで表示される
- 13F遅延注意書きが表示される
- 投資助言表現がない
- ビルドエラー、型エラー、コンソール重大エラーがない

## 28. 禁止表現

使用禁止:

- 買い
- 売り
- 暴落確定
- 金融危機確定
- リーマン級確定
- 何月何日に暴落
- 必ず上がる
- 必ず下がる

推奨表現:

- 警戒レンジ
- リスクスコア
- 市場環境の状態表示
- 点火条件に接近
- 安全弁の一部が機能低下
- 脆弱性が高い
- 補助シグナル

## 29. 既知の制約

- 無料APIだけでPrivate Credit、BDC、CLO、内部者売買を完全リアルタイム取得することはできない。
- TEDとFRA-OISは直接系列ではなく代理計算である。
- FINRA Margin Debtは月次公表で遅れがある。
- 13Fは最大45日遅れであり、リアルタイムではない。
- Yahoo Chart APIは無料で便利だが、公式SLA付き契約APIではない。
- ニュースimpactはルールベースであり、記事内容の真偽や因果関係を保証しない。
- 危機ルートは監視順序であり、将来の到達時間を予測しない。
- スコアは投資判断ではなく、環境状態を把握するための補助指標である。

## 30. 変更管理

指標、閾値、分類、データソース、判定式を変更する場合は、次を同時に更新する。

1. 型定義
2. 指標定義
3. 取得ロジック
4. UI表示
5. API出力
6. 本仕様書
7. READMEまたは運用メモ

コードと仕様が矛盾した場合、現行動作確認ではコードを優先する。ただし公開仕様としては本書を更新し、矛盾を残さない。

## 31. 仕様追加: Bubble Trigger Monitor

目的:

- バブルの「燃料」と「点火」を分けて表示する。
- 株式市場の過熱やテーマ集中が、信用・流動性ストレスへ転化しているかを確認する。
- 投資判断ではなく、危機の引き金タイプを分類する補助モデルとして扱う。

判定タイプ:

1. Dot-com Type / ドットコム型
   - 金利、FRB政策スタンス、テック集中度、市場モメンタムを監視。
   - 信用市場がまだ壊れていなくても、流動性引き締めやテーマ集中の巻き戻しを検知する。
   - 主な入力: 米10年債、米30年債、FRB政策スタンス、S&P500テック集中度、50日/200日線モメンタム。

2. Lehman Type / リーマン型
   - 信用スプレッド、銀行流動性、短期資金市場を監視。
   - HY OASが400bpを超え、銀行・短期資金市場も悪化した場合、信用主導の点火リスクを強く表示する。
   - 主な入力: HY OAS、IG OAS、BAA-AAA、TED Spread、FRA-OIS、Discount Window、BTFP、銀行預金流出。

3. Conversion Watch / 型の転化
   - Dot-com Typeが赤、かつLehman Typeが黄以上になった場合に点灯。
   - 流動性主導の調整が信用主導の危機へ転化するリスクとして扱う。
   - 断定表現は禁止し、「転化リスク」「可能性」「監視」と表現する。

参照線:

- HY OAS 400bp: 信用ストレス初期の注意線。
- HY OAS 800bp: Bank of England SWES 2026 private markets stress scenario における高ストレス想定と整合する参考線。

データ管理:

- 自動取得できるものは既存の指標データを再利用する。
- FRB政策スタンス、テック集中度、モメンタムは `src/config/manual-data.ts` の `BUBBLE_TRIGGER_CONFIG` で管理する。
- 出典、観測日、更新頻度を必ず持つ。

## 32. 仕様追加: Recession Checklist補強

追加項目:

- NFP下方修正

理由:

- 雇用統計は速報値だけでは景気後退の接近を見誤る可能性がある。
- 後日の下方修正が続く場合、表面の雇用統計より実態が弱い可能性がある。

実装:

- `NFP_REVISION_CONFIG` に手動公表値として保持する。
- `valueK <= -100K` で接近、`valueK <= -250K` で成立。
- Recession Checklist内でサームルールの近くに表示する。

サームルール注記:

- FRED `SAHMREALTIME` は暫定値として扱う。
- 雇用統計の改定で後日悪化する可能性があることをUIに表示する。

## 33. 仕様追加: Energy Credit Paradox Route

目的:

- 原油安は通常インフレにはプラスだが、シェール採算を割るとエネルギー信用不安を通じてHY OASへ波及する可能性がある。
- 「原油安 = 常に安全」と見ないため、信用ルートとして別枠で監視する。

ルート:

1. 原油価格低下
2. シェール採算悪化
3. Energy HY Spread悪化
4. HY OAS波及
5. 信用市場全体

データ管理:

- 原油価格、シェール採算ライン、Energy HY Spreadは初期実装では `ENERGY_CREDIT_ROUTE_CONFIG` で管理する。
- 各ノードに現在値、基準、出典、観測日、更新頻度を表示する。

判定:

- WTIがシェール採算上限以下で黄。
- WTIがシェール採算下限以下で赤。
- Energy HY Spreadは500bp以上で黄、700bp以上で赤。
- HY OASと信用市場全体は既存指標の判定を再利用する。

## 34. 初心者向け表示ルール

各主要セクションには、次のような一文説明を表示する。

- Overall Risk Status: いま金融全体が安全か危険か、ひとことで見る。
- Crisis Risk Range: 4種類の危機がどれくらい近いか、確率ではなく状態で見る。
- Liquidity Core: お金の流れが詰まっていないかを見る最重要セクション。
- Ignition Distance: 危機の警戒ラインまで、あとどれくらいかを見る。
- Crisis Routes: どの壊れ方の道筋が進んでいるかを見る。
- Bubble Trigger: 流動性主導か信用主導か、2つの崩れ方を分けて見る。
- Risk Velocity: 悪化のスピードが速いかを見る。

専門用語だけで終わらせず、初心者向けの意味、なぜ重要か、基準、データソースを可能な限り表示する。
