# Macro Crisis Dashboard 仕様書

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| システム名 | Macro Signal / Macro Crisis Dashboard |
| 公開URL | https://macro-crisis-dashboard.vercel.app/ |
| 文書版 | 3.0 |
| 基準日 | 2026-07-16 |
| 対象実装 | Next.js 16.2.7版 |
| 文書の目的 | 危機監視、更新監視、世界リスク、Sector Momentum、Hidden Gemsを含む現行機能と運用条件を定義する |

本書は現行コードを正として記述する。未取得データ、手動データ、日次バッチをリアルタイムデータとして扱わない。画面デザインの詳細より、機能、判定、データ、更新、障害時挙動を優先して定義する。

### 1.1 実装状態の表記

| 表記 | 意味 |
| --- | --- |
| 実装済み | 現行コードに存在し、画面またはAPIから利用できる |
| 一部実装 | 基礎コードは存在するが、現行画面で未使用または一部が手動データ |
| 手動運用 | JSONまたはTypeScript設定の更新が必要 |
| 承認済み・未実装 | 要件は確定しているが、コードにはまだ反映していない |

現行本番URLは `https://macro-crisis-dashboard.vercel.app/`、ローカル開発URLは `http://localhost:3000/` とする。

## 2. プロダクト概要

### 2.1 目的

金融危機を単なる株価下落としてではなく、信用・資金調達・流動性の機能低下として捉え、初心者にも次の状態が短時間で分かる早期警戒ダッシュボードを提供する。

1. 現在、お金の流れが詰まっているか
2. 金融危機の点火を防ぐ安全弁が機能しているか
3. 危機接近を示す警告サインが点灯しているか
4. ショック時の損失を増幅する脆弱性がどこにあるか
5. 投資家、企業、資金、政策当局が防衛行動へ移っているか
6. 世界のどの地域でリスクが高まっているか
7. 各判定の根拠、閾値、データ元、更新日が何か
8. 景気後退、ベア相場、システミック危機、極端危機の警戒レンジがどこにあるか
9. 1日、7日、30日の悪化速度と、次の点火条件までの距離がどれだけか
10. 今日何が更新され、次にどの重要データを待つべきか
11. 世界のセクター、テーマ、企業の相対モメンタムと成長データがどう変化しているか
12. ファンダメンタルズと市場注目度の乖離が大きい企業がどこにあるか

### 2.2 基本原則

- 最優先指標群は `Liquidity Core / お金の流動性コア` とする。
- 安全弁、警告サイン、脆弱性を混同しない。
- VIXは警告サインであり、安全弁ではない。
- CRE、Private Credit、株式バリュエーションは脆弱性であり、安全弁ではない。
- Smart Moneyと13Fは補助シグナルであり、安全弁ではない。
- 13Fは四半期末時点の情報で、提出まで最大45日遅れる。
- スコアは危機発生確率、価格予測、危機までの残り時間ではない。
- 投資助言、「買い」「売り」「暴落確定」などの断定を行わない。
- データ未取得時は推測値を表示せず、取得不可またはフォールバックであることを示す。
- 危機警戒レンジは独自モデルの状態表示であり、統計的確率として扱わない。
- 脆弱性の赤だけで点火判定を上げず、信用・流動性の安全弁悪化を最重要視する。
- 日付付き履歴がない期間は補間せず、Risk Velocityを「データ不足」とする。

## 3. 対象ユーザー

| ユーザー | 主な利用目的 |
| --- | --- |
| 投資初心者 | 色、短い説明、現在の注意点を確認する |
| 個人投資家 | 信用・流動性・脆弱性を横断して監視する |
| 市場調査担当 | 指標値、閾値、変化方向、関連ニュースを確認する |
| 運用担当者 | 手動JSON、API、キャッシュ、データ障害を管理する |

## 4. 情報設計

### 4.1 リスク色

| 値 | 日本語 | 用途 |
| --- | --- | --- |
| `green` | 安定・正常 | 通常範囲 |
| `yellow` | 注意 | 注意水準または初期悪化 |
| `orange` | 警戒 | 強い注意。4段階閾値がある指標で使用 |
| `red` | 危険 | 高ストレスまたは閾値超過 |
| `unavailable` | 取得不可 | 判定に必要な値を取得できない |

### 4.2 指標タイプ

| type | 表示名 | 定義 |
| --- | --- | --- |
| `safety_valve` | Safety Valve / 安全弁 | 信用・流動性・銀行資本など、危機の点火を防ぐ機能 |
| `warning_signal` | Warning Signal / 警告サイン | 危機接近や市場ストレスを知らせるセンサー |
| `vulnerability` | Vulnerability / 脆弱性 | ショック発生時の損失や連鎖を増幅する要因 |
| `smart_money_signal` | Smart Money / 補助シグナル | 著名投資家の公開ポジション情報 |
| `behavior_signal` | Behavior Signal / 行動シグナル | 人、企業、資金、政策当局の防衛行動 |

### 4.3 画面上の3層

内部typeを維持したまま、画面では危機進行の役割として次へ対応付ける。

| 画面層 | 内部type | 判定上の意味 |
| --- | --- | --- |
| Vulnerability / 脆弱性・爆薬 | `vulnerability` | ショック時の被害を増幅する。単独では点火にしない |
| Trigger / 触発・火花 | `warning_signal` | リセッションやベア相場の接近を知らせる |
| Ignition / 点火・導火線 | `safety_valve` | 安全弁の機能低下として表れる信用・流動性ストレス |

安全弁が緑の場合、Ignition層は「未点火」と表示する。安全弁という意味を廃止するものではなく、その機能低下を危機進行上の点火として表現する。

### 4.4 重要度

内部値は `critical`、`important`、`ignition`、`supporting`。画面ではそれぞれ「最重要」「重要」「火元」「補助」と表示する。

## 5. 画面仕様

### 5.1 共通レイアウト

- デスクトップは左固定サイドバー、モバイルは下部固定ナビゲーションを表示する。
- 上部にマーケットティッカーを表示する。
- 長い補助セクションは折りたたみ可能とし、主要状態を先に確認できる構造にする。
- `prefers-reduced-motion`、WebGL非対応、低スペック環境では軽量表示へ切り替える。
- フッターに投資助言ではない旨を表示する。

### 5.2 トップページ `/`

表示順は次のとおり。

1. Terminal Overview / Overall Risk Status / 主要市場カード
2. Update Radar / 今日の更新レーダー
3. Next Update Watch / 次回更新予定
4. Crisis Risk Range
5. Liquidity Core
6. Ignition Distance
7. Crisis Route Tracker
8. Bubble Trigger Monitor
9. Risk Velocity
10. Today's Change / AI Market Summary / Impact News Top 3
11. 3層サマリーとContagion Watch
12. Combination Checklist
13. Crisis Behavior / Smart Money / Global Risk要約
14. Apocalypse Command Center
15. 3層別指標マトリクス
16. Similar Historical Regime / 条件シナリオ / リスク構成
17. Footer

#### Overall Risk Status

全体状態、主要コメント、取得指標数、更新時刻を表示する。総合判定は安全弁を最優先し、脆弱性単独の赤を金融危機と判定しない。

#### Liquidity Core

5カテゴリを表示する。

| カテゴリ | 対象指標 |
| --- | --- |
| Credit Market / 信用市場 | HY OAS、IG OAS、BAA-AAA、CCC OAS |
| Short-Term Funding / 短期金融市場 | SOFR、FRA-OIS、TED Spread。Repo Stressは未取得ラベルとして扱う |
| Bank Liquidity / 銀行流動性 | Bank Deposit Outflows、MMF Balance、Discount Window、BTFP、Bank CET1 |
| Treasury Market / 国債市場 | U.S. 10Y、U.S. 30Y、Treasury Auction Stress、MOVE |
| Credit Supply / 信用供給 | SLOOS、Leveraged Loan Default。Corporate Bankruptcy Filingsは未取得ラベルとして扱う |

カテゴリ信号は利用可能な所属指標の最悪信号を基礎にする。総合状態は以下で決定する。

- 赤カテゴリが2以上: `red`
- 赤カテゴリが1以上、または橙カテゴリが1以上: `orange`
- 黄カテゴリが2以上: `yellow`
- 全カテゴリ取得不可: `unavailable`
- その他: `green`

悪化項目は黄・橙・赤、または前回より信号段階が悪化した指標から最大6件を表示する。項目クリックで対応する指標詳細へ移動する。

#### 3層サマリー

Vulnerability、Trigger、Ignitionを独立カードで表示する。各カードには状態、説明、警報数、利用可能数、総数を表示する。Ignitionには「既存Safety Valvesの機能低下を表示する」旨を併記する。

#### 指標マトリクス

表示順は脆弱性、触発、安全弁・点火。各タイプ内をカテゴリ別に分ける。カードには次を表示する。

- 指標名、短い説明、typeバッジ、重要度
- 現在値、前回値、変化方向、信号色、最終更新日
- 初心者向け説明、なぜ重要か、注意コメント
- 閾値、データソース、更新頻度
- 関連指標と変化理由

### 5.3 危機早期察知システム v2

#### Crisis Risk Range

次の4レンジを「低、低〜中、中、中〜高、高」で表示する。

- Recession Risk / 景気後退リスク
- Bear Market Risk / ベア相場リスク
- Systemic Crisis Risk / システミック危機リスク
- Extreme Crisis Risk / 極端危機リスク

内部スコアの表示区分は0-19=低、20-39=低〜中、40-59=中、60-79=中〜高、80-100=高。数値は確率ではない。各カードに接続済みデータ数と「標準、限定的、データ不足」の信頼度を表示する。

Systemic Crisisは安全弁70%、警告20%、脆弱性10%を基礎とし、重要な信用・流動性指標がすべて緑の場合は24点以下に抑える。Extreme Crisisは成立した極端条件が0件の場合、19点以下に抑える。

#### Risk Velocity

FRED等から取得した日付付き履歴を最大60点保持し、最新観測日から1日、7日、30日前以前で最も近い実測値と比較する。補間値は使わない。画面には指標名、比較前値、現在値、変化量、単位、比較日、改善・悪化方向を分けて表示する。

対象はHY OAS、IG OAS、BAA-AAA、VIX、MOVE、米10年債、米30年債、SOFR、銀行預金流出、MMF、失業保険、重要ニュースimpact。

各指標の変化を固有感応度で正規化し、0.2以上の悪化を同時悪化候補とする。複数カテゴリで4指標以上が悪化、またはHY OAS・IG OAS・VIXが同時悪化した場合は「連鎖悪化」とする。次にピークまたは平均変化が大きい場合を「急悪化」、悪化候補がある場合を「やや悪化」、それ以外を「安定」とする。

脆弱性だけの悪化は点火扱いにしない。比較可能な履歴がない期間は「データ不足」と表示する。

#### Ignition Distance

次の警戒線までの絶対距離を表示する。

| 指標 | 警戒線 |
| --- | --- |
| HY OAS | 400bp、500bp、600bp |
| BAA-AAA | 2.0%、3.0% |
| IG OAS | 1.0%、1.5%、3.0% |
| VIX | 30、40 |
| SOFR | 日次急変0.10% |
| FRA-OIS proxy | 20bp、50bp |
| TED proxy | 0.30%、0.60% |
| Treasury Auction | 2.30倍、2.10倍。低下方向を悪化とする |

現在値が警戒線を越えた場合は「警戒線を通過」と表示する。FRA-OISとTEDは代理系列であることを名称に含める。

#### Combination Checklist

項目状態は「成立、接近、未成立、未取得」の4種類。未取得を未成立へ数えず、成立数の分母は利用可能項目数とする。

- Recession: FRED景気後退確率、ミシガン大学消費者信頼感、CFNAI、失業保険、Sahm Rule、非農業雇用の前月差
- Systemic Crisis: HY、IG、BAA-AAA、VIX定着、預金流出、Discount Window、国債入札、地銀破綻
- Extreme Crisis: HY 600bp、VIX 40、複数銀行破綻、資金市場ストレス、国債入札、緊急支援後の安全弁ストレス

景気後退確率、消費者心理、CFNAI、Sahm Rule、雇用はFRED、銀行破綻はFDIC Bank Failures APIから自動取得する。Moody'sモデルと民間PMIは有料データを使わず、無料の公的代理系列であることを画面に明記する。NFP改定幅も無料APIで安定取得できないため、PAYEMS前月差を使用する。取得失敗は明示的に「未取得」と表示する。

#### Crisis Route Tracker

点火距離の直下に、3つの経路をそれぞれ5段階の横一列で表示する。現在地は、先頭から黄・橙・赤が連続して成立した最後の段階とする。途中の段階だけが悪化した場合は「単独注意」と表示し、経路進行には数えない。

1. Inflation / Supply Shock: コモディティニュース → インフレニュース → 中央銀行ニュース → 雇用悪化 → 信用悪化
2. Credit Bubble Collapse: CRE・Private Credit → 信用スプレッド → 貸出態度・短期資金 → レバレッジドローン・デフォルト → 銀行流動性・資本
3. Sovereign / Liquidity: 国債入札 → 長期金利・MOVE → Repo・SOFR → 銀行流動性 → 政策対応

各段階は現在値、信号色、閾値、取得元、観測日、更新頻度を表示する。青は危険色に使わず「現在地」ラベルだけに使用する。経路表示は因果関係の確定ではなく、監視順序と現在の信号位置を示す。

### 5.4 Apocalypse Command Center

トップページ内 `#apocalypse-command-center` に表示する。名称は演出上のものであり、危機を断定する機能ではない。

#### Apocalypse Score

指標信号を次の基礎点へ変換する。

| 信号 | 基礎点 |
| --- | ---: |
| green | 8 |
| yellow | 42 |
| orange | 70 |
| red | 100 |

`unavailable` はタイプ別平均から除外する。合成式は次のとおり。

```text
Apocalypse Score =
  安全弁ストレス平均 × 35%
  + 警告サイン平均 × 20%
  + 脆弱性平均 × 20%
  + Market Escape Index × 15%
  + Panic News Radar × 10%
```

| スコア | 表示 |
| --- | --- |
| 0-24 | CONTAINED |
| 25-49 | WATCH MODE |
| 50-74 | ELEVATED RISK |
| 75-100 | SEVERE STRESS |

スコアは現在のストレス合成値であり、危機確率、価格予測、カウントダウンではない。

#### 今日の異常検知

各指標について次の内部順位点を計算し、上位4件を表示する。

```text
順位点 = 現在信号の基礎点
       + 悪化した信号段階数 × 30
       + 前回比率の絶対値 × 100（最大30点）
```

これは統計モデルによる異常検知ではなく、信号悪化、変化幅、高ストレス継続を並べるルールベース機能である。

#### Crisis Timeline

次の5段階を表示する。

1. Vulnerability Buildup / 脆弱性の蓄積
2. Warning Cluster / 警告サイン集積
3. Liquidity Thinning / 流動性の悪化
4. Credit Freeze / 信用市場の停止
5. Policy Response / 緊急政策対応

現在段階は次の優先順で判定する。

1. Policy Stressが橙または赤なら段階5
2. 赤の安全弁が2件以上なら段階4
3. 橙または赤の安全弁が1件以上なら段階3
4. 緑以外の警告サインが2件以上なら段階2
5. その他は段階1

タイムラインは一般的な危機連鎖の状態表示であり、時間予測ではない。

#### Panic News Radar

取得ニュースのうち24時間以内の記事を対象に次を計算する。

```text
News Score = 記事数 × 5
           + red記事数 × 12
           + 平均impactScore × 1.25
```

0から100に丸め、上位カテゴリ3件、上位記事3件を保持する。画面には上位2記事を表示する。

#### Market Escape Index

MMF、銀行預金流出、HY OAS、IG OAS、VIXの信号平均を65%、`escape-money` と `credit-escape` の行動信号平均を35%で合成する。欠損時の内部フォールバック点は25。

#### 富裕層防衛モード

取得可能な13F投資家の姿勢を「守り=85、中立=45、攻め=15」へ変換した平均を60%、Smart Money、Insider Selling、Escape Moneyの行動信号平均を40%で合成する。

13Fは最大45日遅れであり、現金、空売り、多くの債券、提出後の売買を把握できない。リアルタイム判断や安全弁判定には使用しない。

### 5.5 `/behavior`

危機前行動トラッカー。次の6カテゴリを表示する。

- Smart Money
- Insider Selling
- Escape Money
- Credit Escape
- Corporate Defense
- Policy Stress

初期データは `data/crisis-behavior.json` の手動管理。各項目はレベル、要約、説明、注意、根拠、ソースURLを持つ。総合状態は最も高いリスク色を採用する。

### 5.6 `/investors`

SEC Form 13Fによる著名投資家ウォッチ。対象者は `src/data/smart-money-investors.json` で管理する。

表示内容:

- 投資家、運用会社、対象四半期、提出日
- 上位保有、ポートフォリオ比率
- 新規、買い増し、継続、小幅変更、減少、全売却
- 前四半期比較、姿勢判定、要約
- SEC原本リンクと遅延注意書き

SEC取得失敗時は対象投資家を `unavailable` とし、推測ポジションへ置き換えない。

### 5.7 `/global-risk`

Natural Earth 1:110mの国境データを使用した平面世界地図を表示する。地域カード表示へ切替可能とする。

対象はGDP上位10か国、G7、ロシア、インド、中東、南米、アフリカ、東南アジア、豪州、台湾・韓国など。構造リスクは `data/global-risk.json`、市場パルスはYahoo Finance Chart APIから取得する。

フィルター:

- 金利リスク
- 信用リスク
- 不動産リスク
- 地政学リスク
- AI・半導体リスク
- 流動性リスク

地域の最終色は構造リスクと市場パルスのうち高い方を採用する。市場パルスは前日終値比で、通常の株価指数は下落をストレス、通貨プロキシは上昇をストレスとして扱う。

| ストレス方向の変化率 | 市場パルス色 |
| --- | --- |
| 0.5%未満 | green |
| 0.5%以上 | yellow |
| 1.5%以上 | orange |
| 3.0%以上 | red |

世界資金フローは株式からMMF、銀行預金からMMF、リスク資産から金、長期債から短期債、新興国から米ドル、円キャリー巻き戻しを手動データで表示する。

## 6. 指標仕様

### 6.1 実装済み指標一覧

| ID | 指標 | type | category | 取得方式 |
| --- | --- | --- | --- | --- |
| `hy-oas` | HY OAS | safety_valve | credit | FRED |
| `baa-aaa` | BAA-AAA Spread | safety_valve | credit | FRED差分 |
| `ig-oas` | IG OAS | safety_valve | credit | FRED |
| `ccc-oas` | CCC OAS | warning_signal | credit | FRED |
| `vix` | VIX | warning_signal | credit | FRED |
| `dgs10` | U.S. 10Y Yield | warning_signal | rates | FRED/Treasury |
| `dgs30` | U.S. 30Y Yield | warning_signal | rates | FRED/Treasury |
| `move` | MOVE | warning_signal | rates | manual/published |
| `treasury-auction` | Treasury Auction Stress | safety_valve | rates | Fiscal Data |
| `sofr` | SOFR / Repo Stress | safety_valve | liquidity | NY Fed/FRED |
| `ted-spread` | TED Spread proxy | safety_valve | bank-funding | FRED計算 |
| `fra-ois` | FRA-OIS proxy | safety_valve | bank-funding | FRED計算 |
| `bank-deposit-outflow` | Bank Deposit Outflows | safety_valve | liquidity | FRED |
| `mmf-assets` | MMF Balance | safety_valve | liquidity | FRED |
| `discount-window` | Discount Window | safety_valve | bank-funding | FRED |
| `btfp` | BTFP | safety_valve | bank-funding | FRED |
| `bank-cet1` | Bank CET1 | safety_valve | bank-capital | manual |
| `fdic-dif` | FDIC DIF | safety_valve | bank-capital | manual |
| `household-debt-gdp` | Household Debt / GDP | safety_valve | household-credit | FRED |
| `household-dsr` | Household DSR | safety_valve | household-credit | FRED |
| `sloos` | SLOOS | safety_valve | credit-supply | FRED |
| `office-cmbs` | Office CMBS Delinquency | vulnerability | private-markets | manual |
| `cmbs-total` | Total CMBS Delinquency | vulnerability | private-markets | manual |
| `private-credit-default` | Private Credit Default | vulnerability | private-markets | manual |
| `pik-ratio` | PIK Ratio | vulnerability | private-markets | manual |
| `leveraged-loan-default` | Leveraged Loan Default | vulnerability | private-markets | manual |
| `shiller-cape` | Shiller CAPE | vulnerability | equity-vulnerability | manual |
| `buffett-indicator` | Buffett Indicator | vulnerability | equity-vulnerability | manual |
| `margin-debt-gdp` | Margin Debt / GDP | vulnerability | equity-vulnerability | manual |
| `icsa` | Initial Jobless Claims | warning_signal | economy | FRED |

閾値、単位、桁数、FRED系列、初心者向け説明の正本は `src/lib/indicators.ts` とする。

### 6.2 代理指標

- 旧TED系列は廃止済みのため、AA金融CPと3カ月T-Billの差を代理値とする。
- 無料で安定したFRA-OIS系列が限られるため、AA金融CPとSOFRの差を代理値とする。
- 画面と説明では代理指標であることを明示する。

### 6.3 総合リスク判定

HY OASまたはBAA-AAAが取得不可の場合、総合判定は `unavailable` とする。

優先順:

1. 赤の安全弁が2件以上、かつ赤の警告が1件以上: `crisis`
2. 赤の安全弁が1件以上: `red`
3. 赤または橙の脆弱性があり、安全弁に黄・橙がなく、赤の警告もない: `localized`
4. 安全弁に黄または橙、警告に赤または橙、黄の警告が2件以上: `yellow`
5. 黄の警告が1件: `green-yellow`
6. その他: `green`

脆弱性の赤だけで金融危機判定へ昇格させない。

## 7. データ仕様

### 7.1 IndicatorValue

主要フィールド:

```ts
type IndicatorValue = {
  id: IndicatorId;
  name: string;
  shortName: string;
  type: "safety_valve" | "warning_signal" | "vulnerability";
  category: IndicatorCategory;
  value: number | string | null;
  previousValue: number | string | null;
  numericValue: number | null;
  previousNumericValue: number | null;
  signal: "green" | "yellow" | "orange" | "red" | "unavailable";
  previousSignal: Signal;
  observationDate: string | null;
  source: string;
  sourceName?: string;
  sourceUrl?: string;
  updateFrequency?: string;
  history: Array<{ date: string; value: number }>;
};
```

### 7.2 手動指標

`src/data/manual-indicators.json` で管理する。数値指標は `value` と `previousValue` から設定済み閾値で信号を計算できる。定性判定は `signal` と `previousSignal` を明示する。

必須運用項目:

- `value`
- `previousValue`
- `observationDate`
- `sourceName` または `sourceLabel`
- `sourceUrl`
- `updateFrequency`
- 必要に応じて `signal`、`previousSignal`

更新時は値だけでなく観測日と出典を更新する。将来日や架空のリアルタイム値を入力しない。

### 7.3 自動条件データ

`src/lib/free-macro-data.ts` が次を取得する。

- FRED: `RECPROUSM156N`、`UMCSENT`、`CFNAI`、`SAHMREALTIME`、`PAYEMS`
- FDIC: Bank Failures API。直近90日の破綻数を計算する

すべて無料公開APIのみを使用する。再検証間隔とデータそのものの公表頻度は区別する。FRED月次系列は月次公表時に値が変わり、FDICは公表時に値が変わるため、「常時リアルタイム値」とは表現しない。

### 7.4 ニュース

GDELT DOC 2.0 APIから過去7日、最大100件を取得し、FRB、FDIC、SECの公的RSSを併用する。信用、銀行、国債、CRE、Private Credit、Fed、雇用などのキーワードで検索する。

- 鮮度、重大語、関連語で `impactScore` を計算する。
- URL一致または類似タイトルを重複排除する。
- 原則48時間以内。高影響記事は48時間超も候補に残す。
- 上位12件を内部利用し、通常UIは上位3件を表示する。
- 取得モードを `live`、`mixed`、`official`、`fallback` で表示する。
- GDELT障害・制限時は公的RSSを使用し、すべて失敗した場合だけ `src/data/news.json` へフォールバックする。
- 固定フォールバックをリアルタイム記事として表示しない。

### 7.5 世界リスク

- 構造リスク、GDP、地域リスク、資金フロー: `data/global-risk.json`
- 市場パルス: Yahoo Finance Chart API
- 地図形状: `src/data/natural-earth-countries-110m.json`
- 一部市場取得失敗時: `partial`
- 全市場取得失敗時: `fallback`

構造リスクはリアルタイムではなく、公表統計や手動調査の基準日時点である。

### 5.8 `/weather` 初心者向け世界経済天気予報

- 新NISA利用者や金融指標に不慣れな利用者向けの簡易ページ。
- `/api/indicators`と`/api/news`を読み、世界経済の状態を「晴れ・くもり・雨・嵐」で要約する。
- 信用市場、短期資金、銀行流動性、国債市場、信用供給を平易な説明で表示する。
- 今日の状態、環境スコア、注目点、主要カード、点火ラインまでの距離を表示する。
- Sahm Ruleは現行ページでは`unavailable`として扱い、取得済みと誤表示しない。
- 専門版トップへの導線と、投資助言ではない旨を常時表示する。

### 7.6 Smart Money

- 対象者定義: `src/data/smart-money-investors.json`
- ソース: SEC EDGAR submissions、13F情報テーブル
- 比較: 最新四半期と前四半期
- キャッシュ: 6時間
- 取得失敗: `unavailable`

## 8. API仕様

### `GET /api/indicators`

- 応答: `DashboardData`
- 更新間隔: 15分
- Cache-Control: `public, s-maxage=900, stale-while-revalidate=900`

### `GET /api/news`

- 応答: `MarketNewsItem[]`
- 更新間隔: 5分
- Cache-Control: `public, s-maxage=300, stale-while-revalidate=300`
- 互換性維持のため応答本文は `MarketNewsItem[]`
- 取得状態は `X-News-Mode`、`X-News-Fetched-At`、`X-News-Latest-Published-At` ヘッダーで返す

### `GET /api/global-risk`

- 応答: `GlobalRiskData`
- 更新間隔: 5分
- Cache-Control: `public, s-maxage=300, stale-while-revalidate=300`

### `GET /api/smart-money/investors`

- 応答: `generatedAt`、`delayNotice`、`investors`
- 更新間隔: 6時間
- Cache-Control: `public, s-maxage=21600, stale-while-revalidate=86400`

### `GET /api/sectors/momentum`

- 応答: `SectorMomentumData`
- 用途: セクター・テーマ・構成企業の市場価格、複数期間騰落率、モメンタムを返す
- Route Handler: `force-dynamic`
- CDN: `s-maxage=900, stale-while-revalidate=300`
- クライアントは15分ごと、または「今すぐ更新」で再取得する

### `GET /api/sectors/company-financials`

- `?all=1`: 無料スナップショットに含まれる全企業財務をticker別オブジェクトで返す
- `?symbol=<ticker>`: 指定企業の財務・成長データを返す
- tickerは英大文字、数字、`. ^ = -`だけを許可し、最大20文字とする
- `DATA_SOURCE=fmp`では`all=1`を使用せず、企業単位でFMPを取得する
- CDN: `s-maxage=900, stale-while-revalidate=300`

### `GET /api/sectors/hidden-gems`

- 応答: `HiddenGemsData`
- `DATA_SOURCE=free`または未設定: `public/data/hidden-gems.json`を返す
- `DATA_SOURCE=fmp`: FMPモードの取得処理へ切り替える
- CDN: `s-maxage=900, stale-while-revalidate=300`

APIエラー時に秘密情報、APIキー、内部スタックをクライアントへ返さない。

## 9. 外部データソース

| ソース | 用途 | 障害時 |
| --- | --- | --- |
| FRED | 信用、金利、流動性、家計、雇用 | 指標単位で取得不可または手動フォールバック |
| NY Fed | SOFR | FREDまたは取得不可 |
| U.S. Treasury Fiscal Data | 国債入札・利回り補完 | 手動値または取得不可 |
| GDELT | 市場影響ニュース | `src/data/news.json` |
| FRB / FDIC / SEC RSS | 市場影響ニュースの公的フィード | 他の取得済みフィードまたは固定フォールバック |
| FDIC Bank Failures API | 直近90日の銀行破綻条件 | 条件を `unavailable` とする |
| SEC EDGAR | 13F | 投資家単位で `unavailable` |
| Yahoo Finance Chart | 地域市場パルス | 構造リスクのみ表示 |
| IMF / 各国公的機関 | GDP・地域構造リスク | 手動データを維持し基準日表示 |
| Natural Earth | 世界地図形状 | 同梱データを使用 |
| Yahoo Finance / yfinance | 世界株価格、履歴、無料財務バッチ | 前回成功JSONを維持、対象企業を`unavailable`化 |
| FinanceDatabase | 無料パイプラインの銘柄分類補助 | config定義を使用 |
| Financial Modeling Prep | 任意の有料切替先。既定では使用しない | `DATA_SOURCE=free`へ戻す |
| GitHub Actions | Hidden Gems日次生成とJSONコミット | 前回JSONを保持し、手動workflow実行で再試行 |

## 10. 非機能要件

### 10.1 レスポンシブ

- モバイル最優先。基本カードは1列表示。
- 390px幅で横スクロールを発生させない。
- 本文は原則12px以上、主要見出しは18px以上を維持する。
- hover専用情報を作らず、タップまたは常時表示で同等情報へ到達できること。

### 10.2 アクセシビリティ

- 色だけで状態を表さず、状態ラベルを併記する。
- 見出し階層、リンク、ボタン、`aria-label` を使用する。
- 動きを減らすOS設定を尊重する。
- 外部リンクは新規タブとし、リンク先を判別できる文言を付ける。

### 10.3 性能

- サーバー取得は並列化する。
- 外部APIにタイムアウトを設定する。
- Next.js revalidationとCDNキャッシュを使用する。
- 3D表示は軽量フォールバックを持つ。
- FREDは最大90観測を取得し、画面・APIへ渡す履歴は最大60点に制限する。

### 10.4 セキュリティ

- `FRED_API_KEY` はサーバー環境変数だけで管理する。
- APIキーをクライアントコード、JSON、ログ、Gitへ含めない。
- 外部データは信頼済み命令として扱わず、表示データとしてのみ利用する。
- 外部リンクには `rel="noreferrer"` を付与する。

## 11. 環境・デプロイ

### 11.1 必須環境変数

```text
FRED_API_KEY=<FRED API key>
DATA_SOURCE=free
```

任意でSECのUser-Agentを設定できる。

```text
SEC_USER_AGENT=<service name and contact URL/email>
# DATA_SOURCE=fmp の場合だけ必要
FMP_API_KEY=<FMP API key>
```

### 11.2 ローカル起動

```bash
npm install
npm run dev
```

### 11.3 品質ゲート

公開前に次を成功させる。

```bash
npm run lint
npm run build
```

加えて、トップ、`/behavior`、`/investors`、`/global-risk`、`/sectors`、全APIを確認する。デスクトップと390px相当のモバイルで横はみ出し、リンク切れ、ブラウザエラーがないことを確認する。

### 11.4 本番

- ホスティング: Vercel
- 本番ドメイン: `macro-crisis-dashboard.vercel.app`
- main page revalidate: 5分
- 本番反映後、公開URLで新機能、API、コンソールエラーを確認する。

## 12. 運用手順

### 手動指標更新

1. 一次情報または明示された公開ソースを確認する。
2. `src/data/manual-indicators.json` の現在値を前回値へ移す。
3. 新しい現在値、観測日、出典、更新頻度を入力する。
4. 閾値と単位を確認する。
5. `lint` と `build` を実行する。
6. 公開後、カードの値、信号色、更新日、出典リンクを確認する。

### 行動シグナル更新

`data/crisis-behavior.json` のレベル、要約、根拠、更新日、ソースURLを更新する。単一ニュースだけで赤へ変更せず、広がり、継続性、複数ソースを確認する。

### 世界リスク更新

`data/global-risk.json` の構造リスク、GDP参照年、要約、ソースを更新する。市場パルスは自動取得のため、手動構造リスクと混同しない。

## 13. 免責・禁止表現

- 本サイトは市場環境の情報提供・教育目的であり、投資助言ではない。
- 信号やスコアは将来リターンを予測しない。
- 「買い」「売り」「暴落確定」「危機確定」などの表現を使用しない。
- 高いCAPE、Buffett Indicator、Margin Debtだけで下落時期を断定しない。
- ニュース密度や13Fだけで金融危機判定を行わない。
- 地域リスク色は国家・住民への評価ではなく、定義した経済・市場リスクの状態表示である。

## 14. 正本ファイル

| 対象 | 正本 |
| --- | --- |
| 指標ID、分類、閾値 | `src/lib/indicators.ts` |
| 指標型 | `src/types/indicator.ts` |
| データ取得・統合 | `src/lib/fred.ts` |
| Liquidity Core | `src/lib/liquidity-core.ts` |
| 3分類サマリー | `src/lib/classification.ts` |
| Apocalypse Score | `src/lib/apocalypse.ts` |
| 危機警戒レンジ、悪化角度、点火距離、条件、危機ルート | `src/lib/early-warning.ts` |
| 無料公開APIの自動条件 | `src/lib/free-macro-data.ts` |
| ニュース判定 | `src/lib/news.ts` |
| 行動シグナル | `data/crisis-behavior.json`、`src/lib/behavior.ts` |
| 世界リスク | `data/global-risk.json`、`src/lib/global-risk.ts` |
| 13F | `src/lib/sec-13f.ts`、`src/data/smart-money-investors.json` |
| トップ画面 | `src/app/page.tsx` |
| API | `src/app/api/**/route.ts` |

仕様書とコードが矛盾した場合、現行動作の調査ではコードを優先する。仕様変更時はコードと本書を同じ変更単位で更新する。

## 15. 現行実装ステータス

### 15.1 画面・機能

| 対象 | 状態 | 備考 |
| --- | --- | --- |
| トップダッシュボード | 実装済み | リスク状態、警戒レンジ、流動性、点火距離、危機ルート、悪化角度を表示 |
| 3層モデル | 実装済み | Vulnerability、Trigger、Ignitionを独立表示 |
| 指標マトリクス | 実装済み | type、category、信号、値、説明、閾値、出典を表示 |
| Apocalypse Command Center | 実装済み | 状態スコア、異常検知、ニュース密度、資金逃避等を表示 |
| Crisis Behavior Tracker | 実装済み・手動運用 | `data/crisis-behavior.json`を使用 |
| Smart Money / 13F | 実装済み | SEC EDGARを6時間キャッシュで取得 |
| Global Risk Map | 実装済み・一部手動 | Natural Earth SVG地図とYahoo市場パルスを合成 |
| Update Radar | 実装済み | 指標の前回値・前回信号、ニュース、手動データから重要差分を生成 |
| Next Update Watch | 実装済み・予定手動運用 | `src/data/update-schedule.json`と指標観測日から更新状態を判定 |
| Sector Momentum | 実装済み | セクター、成長テーマ、ツルハシテーマ、世界株、企業詳細を表示 |
| Hidden Gems | 実装済み・日次バッチ | yfinanceを用いた無料JSON、任意でFMPへ切替可能 |
| React Three Fiber基盤 | 実装済み | トップ画面のGlobe Heroと既存抽象リスクシーンで使用 |
| Contagion Watch | 実装済み | H.8優先・BUSLOANS代替、手動BDC/NAV、第17.1節 |
| 金融端末グレードUI | 実装済み | Inter、JetBrains Mono、12カラム、端末色、第17.2節 |
| 固定型ホログラム地球 | 実装済み | 2K/1K陸地テクスチャ、青色再着色、自転、軌道3ノード、第17.3節 |

### 15.2 現行3Dの実態

- `src/components/three/`にはReact Three Fiberによる球体、ノード、伝播線、WebGL判定、軽量フォールバックが存在する。
- `src/components/globe/GlobeHero.tsx`はMotionのスクロール進捗をThree.jsシーンへ渡し、米国、日本、全球の表示段階を制御する。
- `src/components/globe/GlobeHeroScene.tsx`はシーンとカメラを管理し、地球表面、大気、都市ネットワーク、実データ柱、資金フロー弧、国別発光を別モジュール・別ジオメトリで描画する。
- `src/lib/globe-hero.ts`は現行指標と世界リスクデータを3D表示用の型へ変換する。米国3指標は取得値、日本3指標は`src/config/globe-data.ts`の手動設定を使用する。
- `/global-risk`の世界地図はThree.jsではない。Natural Earth 1:110mをSVGへ投影し、CSS perspectiveとpointer tiltで奥行きを表現している。
- `public/textures/`にHiggsfield生成の地球、雲、都市光、宇宙背景を2K/1K WebPで保持する。

### 15.3 現行デザイン基盤

- Tailwind CSS 4のCSS-first構成を採用し、`tailwind.config.*`は置いていない。
- テーマ変数と共通スタイルは`src/app/globals.css`の`@theme inline`で管理する。
- フォントは`next/font`経由のInterとJetBrains Mono。
- 背景は`#0A0B0D`、カードは`#111317`と`#16181D`、境界は低コントラストの1px線。
- 状態色以外は無彩色中心とし、主要カードの角丸は6〜8px、影とグラデーションは使用しない。

## 16. システムアーキテクチャ

### 16.1 技術構成

| レイヤー | 技術 |
| --- | --- |
| Web Framework | Next.js 16.2.7 App Router |
| UI | React 19.2.4、Tailwind CSS 4 |
| Animation | Motion 12 |
| 3D基盤 | Three.js 0.184、React Three Fiber 9、Drei 10、React Three Postprocessing 3 |
| Language | TypeScript 5 |
| XML/RSS | fast-xml-parser |
| Hosting | Vercel |

`@react-three/postprocessing`はデスクトップGlobe Heroの弱いBloomにだけ使用し、モバイルでは無効化する。

### 16.2 サーバーデータフロー

```text
FRED / NY Fed / Treasury / FDIC / GDELT / SEC / Yahoo
                         |
                         v
src/lib内の取得・正規化モジュール
                         |
          +--------------+---------------+
          |                              |
          v                              v
  Server Component                    Route Handler
  src/app/page.tsx                    src/app/api/**
          |                              |
          v                              v
  判定モデル生成                    JSON + Cache-Control
          |
          v
  React UIコンポーネント
```

トップページはサーバーコンポーネントで、指標、ニュース、自動条件を`Promise.all`で並列取得する。取得後に総合信号、3層コメント、危機警戒モデル、3D用データを生成し、表示コンポーネントへ渡す。

### 16.3 モジュール責務

| モジュール | 責務 |
| --- | --- |
| `src/lib/fred.ts` | 指標取得、代理値計算、手動フォールバック、DashboardData生成 |
| `src/lib/indicators.ts` | 指標定義、閾値、信号判定、総合判定 |
| `src/lib/liquidity-core.ts` | 5つの流動性カテゴリと悪化項目の集約 |
| `src/lib/early-warning.ts` | 警戒レンジ、悪化角度、点火距離、チェックリスト、危機ルート |
| `src/lib/classification.ts` | 3分類コメント生成 |
| `src/lib/apocalypse.ts` | Apocalypse Scoreと関連補助スコア |
| `src/lib/news.ts` | GDELT・公的RSS取得、重複排除、impact算出 |
| `src/lib/free-macro-data.ts` | 無料公的APIによるチェックリスト補助データ |
| `src/lib/global-risk.ts` | 構造リスクと市場パルスの統合 |
| `src/lib/sec-13f.ts` | SEC 13F取得、前四半期比較、姿勢判定 |
| `src/lib/three-risk.ts` | 指標から3Dノード・伝播線への変換 |
| `src/lib/update-radar.ts` | 最新値・信号・ニュース・手動更新の差分集約 |
| `src/lib/next-update-watch.ts` | 更新予定の状態、残り時間、優先順位判定 |
| `src/lib/sector-momentum.ts` | 世界株価格、期間騰落率、バスケット集約、モメンタム算出 |
| `src/lib/free-company-financials.ts` | 無料JSONまたはFMPから企業財務を正規化 |
| `src/lib/hidden-gems-source.ts` | `DATA_SOURCE`に応じたHidden Gems読込切替 |
| `scripts/data-pipeline/generate_hidden_gems.py` | 無料財務取得、スコア算出、JSON生成 |

### 16.4 データ鮮度

キャッシュ再検証間隔はデータの公表頻度ではない。再検証が5分でも、月次統計は次回公表まで同じ値を返す。

| データ | アプリ再検証 | 実データの主な頻度 |
| --- | ---: | --- |
| FRED主要指標 | 15分 | 日次、週次、月次、四半期が混在 |
| NY Fed SOFR | 15分 | 営業日次 |
| Treasury | 15分 | 日次または入札実施時 |
| ニュース | 5分 | 配信元の公開時 |
| 世界市場パルス | 5分 | 市場営業中の配信状況に依存 |
| SEC 13F | 6時間 | 四半期末基準、提出は最大45日後 |
| 行動シグナル | 手動 | JSON更新時 |
| 構造的世界リスク | 手動 | JSON更新時 |
| CET1、FDIC DIF、Private Credit等 | 手動 | 原典公表後に更新 |
| Sector Momentum市場価格 | 15分 | 市場営業・Yahoo配信状況に依存 |
| 企業財務・Hidden Gems | 日次バッチ | 財務自体は主に四半期更新 |

画面の`LIVE`は「アプリが現在取得処理を行った」ことを意味し、全指標が取引所ティック単位でリアルタイムであることを意味しない。

### 16.5 障害時挙動

1. 指標単位の取得失敗は他指標の取得を妨げない。
2. 手動フォールバックが定義されている場合は、出典と観測日を付けて使用する。
3. フォールバックがない場合は`unavailable`とし、0や推測値に置き換えない。
4. ニュースはGDELT、公的RSS、固定JSONの順で縮退する。
5. 世界市場パルスの一部失敗は`partial`、全失敗は`fallback`とする。
6. 13F取得失敗は投資家単位で`unavailable`とする。
7. APIエラー応答へ秘密情報、APIキー、内部スタックを含めない。

### 16.6 既知の制約

- 無料APIだけですべてのPrivate Credit、BDC、CLO、企業内部者行動をリアルタイム取得することはできない。
- TEDとFRA-OISは無料で継続取得できる直接系列ではなく代理計算。
- 手動指標は更新担当者と原典確認が必要。
- Yahoo Finance Chart APIは公式SLAのある契約APIではなく、停止や仕様変更の可能性がある。
- ニュースimpactはルールベース順位であり、事象の真偽や因果関係を保証しない。
- 危機ルートは監視順序であり、因果関係や到達時間を予測しない。
- 日本の円、JGB、日銀データは無料で安定した統一APIがないため、3D表示では手動configを使用する。

## 17. 拡張仕様と実装フェーズ

本章の機能はフェーズ順に実装する。各フェーズで`npm run lint`、`npm run build`、対象画面のブラウザ確認を完了し、次フェーズへ進む。フェーズ1と2は2026-06-20、フェーズ3は2026-06-21に実装済み。

### 17.1 フェーズ1: Contagion Watch / 染み出しウォッチ

実装状態: 実装済み。

正本ファイル:

- `src/components/dashboard/ContagionWatch.tsx`
- `src/lib/contagion-watch.ts`
- `src/config/manual-data.ts`
- `src/types/contagion-watch.ts`

#### 目的

Private Credit等の慢性的な脆弱性が、銀行・ノンバンク与信を通じて信用市場へ伝播し、HY OAS等の点火指標へ到達する経路を可視化する。脆弱性と点火を直接同一視せず、その間の橋として扱う。

#### 配置

- 新規コンポーネント: `src/components/dashboard/ContagionWatch.tsx`
- 3層表示内でVulnerabilityとIgnitionを接続する横長ブリッジとして配置する。
- 左側を脆弱性、右側を点火として、細い線と矢印で方向を示す。
- モバイルは縦積みでも情報順序を維持し、矢印を下方向へ切り替える。
- 赤状態のときだけIgnitionカードへ「HY OAS点火の予兆」バッジを表示する。

#### 監視指標

| 指標 | 取得 | 初期値・判定 |
| --- | --- | --- |
| 銀行からノンバンク向け与信 | FRED `LNFACBW027SBOG` | 週次、季節調整済み、残高と前年比・方向を表示 |
| 代替系列 | FRED `BUSLOANS` | 優先系列取得失敗時だけ使用し、代替であることを表示 |
| BDC非発生率 | 手動config | 初期3.5%、上昇中。3%未満=緑、3〜5%=黄、5%超=赤 |
| 大型PCファンドNAV | 手動config | 単月マイナス=黄、連続マイナス=赤、非マイナス=緑 |

銀行からノンバンク向け与信は単純な残高増加だけで危機と判定しない。前年比増加、増加加速、BDC非発生率またはNAV悪化との組み合わせを表示し、閾値はconfigで変更可能にする。

#### 手動設定

`src/config/manual-data.ts`を新設し、値、前回値、方向、観測日、出典名、出典URL、更新頻度を保持する。コンポーネントへ数値を直接記述しない。既存`src/data/manual-indicators.json`の責務は変更しない。

#### 総合判定

| 条件 | 状態 |
| --- | --- |
| 3指標すべて緑 | じわじわ継続（安全） / green |
| 1〜2指標が黄または赤 | 染み出し開始 / yellow |
| 3指標すべて悪化、特にBDC非発生率5%超 | 急性化目前 / red |

赤は「S&L型からリーマン型への相転移シグナル」と説明するが、危機確定とは表現しない。

### 17.2 フェーズ2: 金融端末グレードUI

実装状態: 実装済み。

主な実装ファイル:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/dashboard/DashboardHero.tsx`
- `src/components/dashboard/OverallRiskStatus.tsx`
- `src/components/dashboard/ContagionWatch.tsx`
- `src/components/indicator-card.tsx`

#### デザイン原則

- Bloomberg Terminal、Linear、Vercelを参考に、精密、静謐、高密度、規律ある余白を優先する。
- ネオン、派手なグラデーション、絵文字、カード全面の状態色、大きな影を使用しない。
- 状態色は左端3pxバー、6〜8pxドット、細い閾値バーに限定する。
- データは左揃えを基本とし、数値列は右揃えにする。

#### デザイントークン

| 用途 | 値 |
| --- | --- |
| Base | `#0A0B0D`〜`#111317` |
| Surface | `#16181D` |
| Border | `rgba(255,255,255,0.06)` |
| Primary text | `#E6E7E9` |
| Secondary text | `#8B8D93` |
| Green | `#3FB950` |
| Yellow | `#D29922` |
| Red | `#F85149` |
| Radius | 6〜8px |
| Transition | 150〜200ms ease |

- 見出し・ラベルはInter、数値・単位・時刻はJetBrains Monoを`next/font`で読み込む。
- すべての数値へ`font-variant-numeric: tabular-nums`を適用する。
- Tailwind 4の既存方式に合わせ、色とフォントは`globals.css`の`@theme inline`へ定義する。
- 12カラム、16pxガター、カード内20〜24pxを基本とする。
- 数値更新時は150msの控えめな背景フラッシュを使用する。
- モバイルではカードを1列とし、本文12px未満を避ける。

データ取得、閾値、信号、総合判定は変更しない。UI変更前後で同一入力に対する値と信号が一致することを回帰条件とする。

### 17.3 固定型ホログラム地球

実装状態: 実装済み。

主な実装ファイル:

- `src/components/globe/CompactGlobe.tsx`
- `src/components/globe/CompactGlobeScene.tsx`
- `src/components/globe/hologram/HolographicGlobe.tsx`
- `src/components/globe/hologram/HolographicAtmosphere.tsx`
- `src/components/globe/hologram/CityNetwork.tsx`
- `src/components/globe/shaders/holographic-globe-shaders.ts`

- 地球はトップ画面中央の214px高の背景要素とし、カードUIより前面へ出さない。
- `earth-day-cloudless-2k.webp`を陸海マスクとして使用する。写真色は表示せず、GLSLで海を黒紺、陸地をシアン〜青へ再着色する。
- 陸海境界を海岸線として強調し、都市光、薄い経緯線、フレネルリム、大気ハロを加える。
- Y軸自転は約90秒/周。`prefers-reduced-motion`では自転を停止する。
- 軌道リングは3本、ノードはLiquidity、Rates、Growthだけを表示する。
- Theatre.js、スクロールカメラ、資金フローパーティクル、染み出し波、光の柱は使用しない。
- Canvasはdynamic importし、DPRを1〜1.5へ制限する。

### 17.4 参考画像準拠ダッシュボード

実装状態: 実装済み。

主な実装ファイル:

- `src/components/dashboard/ReferenceDashboard.tsx`
- `src/components/dashboard/ReferenceDisclosure.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`

常時表示するメイン画面は次の三段とする。

1. Overall Risk Status / 中央タイトル・地球 / Today's Change
2. 主要9指標カード / AI Market Summary・Impact News Top 3
3. Similar Historical Regime / Asset Temperature Map / Risk Trend 30D

- 主要9指標カードはクリック選択式。選択中カードを縦2段へ展開し、前回値、判定基準、観測日、初心者向け説明を表示する。
- メイン画面の後ろに、流動性・点火、3層・染み出し、補助情報、全指標、シナリオの5つのネイティブ`details`を配置する。
- 折りたたみは初期状態を閉とし、長大な詳細情報をメイン画面から分離する。
- デスクトップは参考画像に近い3カラム構成、モバイルは1〜2カラムへ変換し、横スクロールを発生させない。
- 既存のAPI、閾値、信号色、ニュース取得、危機判定は変更しない。

## 18. 変更管理

仕様変更は次の単位で管理する。

1. 要件と判定根拠を本書へ記載する。
2. 型、データ取得、判定、UIの影響範囲を確認する。
3. 手動値には観測日と一次出典を設定する。
4. `npm run lint`と`npm run build`を実行する。
5. PCとモバイルで対象画面を確認する。
6. 本番反映後に公開URLとAPIを確認する。

危機判定、閾値、データソースを変更した場合は、コードだけでなく本書の該当表も同じコミットで更新する。

## 19. Update Radar / 今日の更新レーダー

### 19.1 目的

サイトを開いた時点で、最新値、前回値、信号、新着ニュース、重要な手動データの差分をまとめる。危機状態そのものではなく「前回観測から何が変わったか」を示す。

### 19.2 入力

- `IndicatorValue[]`: 現在値、前回値、現在信号、前回信号、観測日、出典
- `MarketNewsItem[]`: 最新ニュース、impact、関連指標、公開日時
- 生成時刻: トップページのサーバー処理時刻

### 19.3 更新項目

| category | 内容 |
| --- | --- |
| `indicator` | 値が前回から変化した指標 |
| `signal_change` | 信号色が前回から変化した指標 |
| `news` | 最新ニュース最大3件 |
| `manual_data` | 手動・公表値のうち重要または高リスクの更新 |
| `risk_velocity` | 型上予約済み。現行生成処理では独立項目を作らない |
| `system` | 型上予約済み。システム通知用 |

### 19.4 方向判定

- 信号段階は `unavailable < green < yellow < orange < red` とする。
- 現在信号が前回より上なら`worse`、下なら`better`、同じなら値方向を確認する。
- `thresholdDirection=lower-is-worse`の指標は値の低下を悪化とする。
- 数値差が表示精度未満なら`unchanged`とする。
- ニュースは`new`とする。単一ニュースを危機確定とは扱わない。

### 19.5 優先順位

重要更新は最大5件。次を加点して並べる。

1. 悪化方向
2. 赤・橙など高い信号
3. HY OAS、IG OAS、BAA-AAA、SOFR、Discount Window、預金流出、国債入札、FRA-OIS、TED
4. 新着ニュース
5. 改善または変化なし

サマリーには総更新数、悪化数、改善数、新着ニュース数、手動更新数を表示する。

### 19.6 制約

- ブラウザの前回訪問状態を永続保存して比較する機能ではない。
- 指標が持つ`previousValue`と`previousSignal`を比較する。
- 公表頻度が月次・四半期の指標は、アプリを再取得しても原典が更新されるまで値は変わらない。

## 20. Next Update Watch / 次回更新予定

### 20.1 目的

次に更新される重要データ、理由、注目ライン、更新状態を最大3件表示する。予定日時は公表スケジュールまたは運用上の予定であり、確定的な配信保証ではない。

### 20.2 正本データ

`src/data/update-schedule.json`を手動管理する。各項目は次を保持する。

- イベントID、表示名、関連indicator ID
- 分類、重要度、予定日時、タイムゾーン、日本語表示時刻
- 更新頻度、出典、重要理由、注目ライン
- 初期状態、関連指標

`expectedAt`にはISO日時のほか、`next-business-day`、`event`、`manual`を使用できる。

### 20.3 状態判定

| status | 条件 |
| --- | --- |
| `upcoming` | 予定時刻前、またはイベント・手動更新待ち |
| `updated` | 対応指標の観測日が予定日以上。特殊予定では観測日が当日 |
| `delayed` | 予定時刻後も対応指標の観測日が更新されていない |
| `unavailable` | スケジュールまたは対象データが取得不能と明示されている |

残り時間は「あとN日」「あとN時間」「あとN分」「予定時刻を通過」「次回営業日」「イベント待ち」「手動更新予定」で表示する。

### 20.4 並び順

1. 重要度 `SSS > SS > S > A > B`
2. 予定時刻への近さ
3. 信用、流動性、金利、雇用、中央銀行カテゴリ
4. 手動更新項目

現行の日時固定項目は運用者が公表カレンダーに合わせて更新する。過去日付を放置した場合は`delayed`となるため、架空の未来日時へ自動補正しない。

## 21. Sector Momentum / セクター動向

### 21.1 目的とルート

- ルート: `/sectors`
- 危機監視とは独立して、世界株のセクター、テーマ、企業の相対的な勢いと構造データを可視化する。
- 状態表示であり、上昇予測や投資推奨ではない。
- 既存の危機判定、指標分類、総合信号へ影響を与えない。

### 21.2 三階層

| 階層 | 内容 |
| --- | --- |
| 1 | セクターまたはテーマのヒートマップ比較 |
| 2 | 選択バスケットの構成企業一覧 |
| 3 | 選択企業の価格履歴、成長、収益性、財務、バリュエーション詳細 |

### 21.3 表示モード

1. `sector`: GICS準拠の大分類と半導体等の独立分類
2. `theme`: 成長テーマとツルハシ型テーマ
3. `hidden-gems`: 実態と注目の乖離スクリーナー

地域フィルタは米国、日本、韓国、台湾、中国本土、香港、欧州、インド、その他を扱う。

### 21.4 市場指標

各セクター、テーマ、企業について可能な範囲で次を計算する。

- 価格、通貨、観測時刻
- 騰落率: 1日、1週、1カ月、3カ月、YTD、1年、3年、5年
- 52週レンジ位置
- 5年高値からの距離
- 市場全体ベンチマークに対する相対強度
- モメンタムスコア
- 期待度スコア
- 構成企業の時価総額合計
- 3カ月平均騰落率と短期過熱判定

履歴不足の場合は対象期間を`null`として`unavailable`表示し、短い履歴から長期騰落率を推測しない。

### 21.5 ソートと操作

- バスケット: 各期間騰落率、モメンタム、期待度、時価総額
- 企業: 時価総額、サブカテゴリ、期待度、売上成長、予想PER、各期間騰落率
- 昇順・降順切替
- テーマでは「すべて」「成長テーマ」「ツルハシ」を切替
- バスケット選択で構成企業を切替、企業選択で詳細を表示
- 価格チャート範囲は1カ月、3カ月、1年、5年

### 21.6 期待度スコア

設定可能な重みは次を基本とする。

| 要素 | 基本比率 | 無料モードの扱い |
| --- | ---: | --- |
| SNS・検索の伸び | 30% | 手動configまたは取得不可 |
| アナリスト上方修正 | 25% | 手動configまたは取得不可 |
| 相対モメンタム | 25% | 市場価格から自動計算 |
| 資金フロー | 20% | 手動configまたは取得不可 |

欠損要素を0点と断定せず、利用できる入力とconfigの範囲で合成する。期待度は市場期待の状態であり、将来リターン確率ではない。

### 21.7 テーマ定義

正本は`src/config/themes.ts`。銘柄追加・削除はコード変更で行う。現行テーマは次の28系統。

**成長テーマ**

- 量子コンピューティング
- 宇宙・宇宙開発
- AI半導体
- AIソフトウェア・基盤モデル
- AIインフラ・データセンター
- 電力・原子力
- 核融合
- ロボティクス・ヒューマノイド
- 自動運転
- サイバーセキュリティ
- 防衛・軍需
- バイオテック・ゲノム
- 肥満症治療薬（GLP-1）
- 電池・エネルギー貯蔵
- レアアース・重要鉱物
- ブロックチェーン・暗号資産関連

**ツルハシ型テーマ**

- HBM・半導体製造装置・材料
- AIデータセンター建設
- AI電力・原子力ツルハシ
- ロボット・自動化部品
- 宇宙インフラ・部品
- EV・電池製造装置・材料
- 創薬支援・CDMO
- 防衛エレクトロニクス
- AIソフト基盤・セキュリティ
- 暗号資産インフラ

構成企業にはticker、企業名、国、地域、取引所、事業説明、任意のサブカテゴリを持たせる。事業説明は`src/config/company-notes.ts`で日本語上書きできる。

### 21.8 企業成長・財務データ

`SectorCompanyGrowthData`は次を保持する。

- 売上高、純利益、売上前年比、売上CAGR
- EPS前年比、EPS CAGR、年次履歴
- 受注、受注残、受注残成長
- ROE、ROIC、営業利益率、利益率変化、粗利率
- フリーキャッシュフロー、配当利回り、自社株買い
- PER、PSR、Debt/Equity
- アナリストカバレッジ、機関保有、空売り比率、ベータ
- 実態スコア、注目スコア、Gem Score、テーマ中央値比較
- 3カ月・6カ月騰落率、出典、更新日、取得状態

無料ソースで受注・受注残を取得できない企業は「受注データなし」とする。推測値で埋めない。手動補完は`src/config/manual-company-financials.ts`へ観測日と出典を付けて保存する。

### 21.9 更新動作

- サーバー初期描画: 15分revalidate
- クライアント: 15分ごとに市場データと財務JSONを再取得
- 手動: 「今すぐ更新」で両方を並列再取得
- 画面表示: 市場データ時刻、財務データ時刻、取得カバレッジ、再取得確認時刻
- 15分再取得は原典データの更新を保証しない。財務値は日次バッチまたは決算公表時の値である。

## 22. Hidden Gems / 原石スクリーナー

### 22.1 定義

Hidden Gemsは、ファンダメンタルズの強さを表す実態スコアと、市場で既に注目されている度合いを表す注目スコアの差を計算する。

```text
Gem Score = Fundamental Score - Attention Score
```

Gem Scoreは価格上昇予測ではない。「構造データに対して市場注目が相対的に低い状態」を表す。

### 22.2 足切り

原則として次を満たす企業だけを候補にする。

- 売上CAGR 10%以上
- 営業利益が黒字
- 時価総額1億米ドル以上
- 直近3カ月騰落率が+50%未満
- 必須データが取得できる

除外数は、必須データ不足、低成長、赤字、小規模、急騰済みに分けて保持する。

### 22.3 実態スコア

- 売上CAGR
- 直近売上成長の加速
- 営業利益率の水準と改善
- ROIC
- 受注・受注残。取得できる場合のみ加点
- 財務健全性。過剰債務は減点

### 22.4 注目スコア

- PER・PSRとテーマ中央値または過去レンジの比較
- 3カ月・6カ月騰落率
- SNS・検索量。取得できる場合のみ
- アナリストカバレッジ。取得できる場合のみ
- 時価総額

無料モードでは主にバリュエーション、騰落率、時価総額を用いる。アナリスト予想、SNS、受注が欠けるため、FMPモードと同精度とはみなさない。

### 22.5 表示

- Gem Score降順の企業一覧
- 企業名、事業説明、国、テーマ
- Gem Score、実態スコア、注目スコア
- 売上CAGR、PER、時価総額
- テーマ・地域フィルタ
- スコア内訳と判定理由の展開
- データ生成日時、データソース、対象数、候補数、除外内訳
- 3日以上古い場合の更新停滞警告

### 22.6 履歴

各スナップショットは日付、生成時刻、手法版、ticker別の3スコアと価格を保持する。履歴は将来の検証用であり、過去成績を保証するものではない。

## 23. 無料データパイプライン

### 23.1 構成

```text
Yahoo / yfinance / FinanceDatabase
                 |
                 v
scripts/data-pipeline/generate_hidden_gems.py
                 |
                 v
public/data/hidden-gems.json
                 |
                 v
Next.js API -> /sectors
```

### 23.2 実行

```bash
npm run data:pipeline
npm run hidden-gems:snapshot
```

Python依存は`scripts/data-pipeline/requirements.txt`で管理する。既定データソースは`free`。企業間には待機時間を設け、無料ソースへの集中アクセスを避ける。

### 23.3 失敗時保護

1. 取得失敗企業は`unavailable`とする。
2. 成功率が最低基準を下回る場合は壊れたJSONで前回ファイルを上書きしない。
3. 取得できない値を0や平均値で補完しない。
4. 前回成功JSONをサイトが継続利用する。
5. 画面に生成日時と更新停滞を表示する。

### 23.4 GitHub Actions

- Workflow: `.github/workflows/data-pipeline.yml`
- 定期: 毎日`21:20 UTC`（日本時間翌日06:20）
- 手動: `workflow_dispatch`
- 生成JSONを検証し、差分がある場合だけコミット・pushする
- push後、VercelのGit連携が有効なら自動デプロイされる
- GitHub Actions、Git push、Vercel連携のいずれかが失敗した場合、本番JSONは更新されない

## 24. データ鮮度と「リアルタイム」の定義

| 区分 | 例 | アプリ取得 | 原典更新 | 表示上の扱い |
| --- | --- | ---: | --- | --- |
| 市場データ | VIX、金利、世界株価格 | 5〜15分 | 市場・提供元依存 | 準リアルタイム |
| 営業日日次 | OAS、SOFR | 15分 | 次回営業日公表 | 日次 |
| 週次 | 失業保険、預金、MMF、FRB貸出 | 15分 | 週次公表 | 週次 |
| 月次・四半期 | 家計、SLOOS、CET1、FDIC、財務 | 15分または日次 | 原典公表時 | 公表時更新 |
| 手動 | Private Credit、BDC、CAPE等 | ファイル反映時 | 運用者更新 | 手動 |
| ニュース | GDELT、公的RSS | 5分 | 記事公開時 | 準リアルタイム |
| Hidden Gems | 財務・スコア | 15分でJSON確認 | 日次バッチ | 日次 |
| 13F | 著名投資家保有 | 6時間 | 四半期・最大45日遅延 | 遅行補助データ |

画面上の`LIVE`、`AUTO 15M`、再取得時刻はアプリが取得を試みた時刻を示す。全データが秒単位で変化することを意味しない。

## 25. 運用チェックリスト

### 25.1 日常確認

1. `/api/indicators`の`fetchedAt`、`unavailableCount`を確認する。
2. `/api/news`の`X-News-Mode`と最新公開日時を確認する。
3. Next Update Watchに過去の固定日付が残っていないか確認する。
4. `/sectors`の市場時刻、財務時刻、取得カバレッジを確認する。
5. Hidden Gemsが3日以上古くないか確認する。

### 25.2 手動更新対象

- `src/data/manual-indicators.json`
- `src/data/published-indicators.json`
- `src/config/manual-data.ts`
- `src/config/manual-company-financials.ts`
- `data/crisis-behavior.json`
- `data/global-risk.json`
- `src/data/update-schedule.json`

手動値には値、前回値、観測日、更新日、一次出典、更新頻度を設定する。

### 25.3 リリース確認

```bash
npm run lint
npm run build
```

次をブラウザで確認する。

- `/`
- `/behavior`
- `/investors`
- `/global-risk`
- `/sectors`
- `/api/indicators`
- `/api/news`
- `/api/global-risk`
- `/api/smart-money/investors`
- `/api/sectors/momentum`
- `/api/sectors/company-financials?all=1`
- `/api/sectors/hidden-gems`

## 26. 受入条件

1. 安全弁、警告サイン、脆弱性が混在せず、VIXは警告、CRE・Private Credit・株式バリュエーションは脆弱性として表示される。
2. Liquidity Coreが信用、短期資金、銀行、国債、信用供給を独立判定する。
3. 脆弱性だけの赤でシステミック危機を確定表示しない。
4. すべての指標に値または取得不可、信号、閾値、出典、観測日が表示される。
5. Update Radarが前回値・前回信号との差分を示す。
6. Next Update Watchが最大3件と更新状態を示し、過去時刻を架空の未来へ補正しない。
7. ニュース取得モードと最新公開日時を確認できる。
8. `/sectors`でセクター、テーマ、Hidden Gemsを切り替えられる。
9. 世界株の地域フィルタ、複数期間騰落率、企業ドリルダウンが機能する。
10. 取得不能な財務、受注、SNS、アナリストデータを推測値で埋めない。
11. Hidden Gemsは日次生成日時、対象数、候補数、除外理由、注意書きを表示する。
12. データ取得失敗時も前回成功データまたは`unavailable`で画面が継続動作する。
13. `npm run lint`と`npm run build`が成功する。
14. 本番画面とAPIに秘密情報、内部スタック、APIキーを出さない。
