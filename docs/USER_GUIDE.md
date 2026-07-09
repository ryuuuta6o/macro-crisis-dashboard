# Macro Crisis Dashboard 使用書

## 1. このサイトの目的

Macro Crisis Dashboard は、金融危機・信用収縮・景気後退の早期警戒を目的とした情報ダッシュボードです。

株価の上下そのものではなく、次のような「お金の流れの詰まり」を中心に見ます。

- 企業がお金を借りにくくなっているか
- 銀行や短期金融市場で資金調達が詰まっているか
- 信用スプレッドが急拡大しているか
- 銀行預金、MMF、FRB緊急貸出などに異常が出ているか
- 脆弱性が高い状態で、点火条件が近づいているか

本サイトは投資助言、売買推奨、価格予測、危機発生確率の断定を行いません。
表示されるスコアや信号は、独自ルールに基づく市場環境の状態表示です。

## 2. 最初に見る場所

トップページでは、次の順番で見ると全体像をつかみやすいです。

1. Overall Risk Status
2. Crisis Risk Range
3. Liquidity Core
4. Ignition Distance
5. Crisis Route Tracker
6. Bubble Trigger Monitor
7. Risk Velocity
8. Three-Layer Summary
9. Combination Checklist
10. Signal Matrix

## 3. 信号色の意味

| 色 | 意味 | 読み方 |
| --- | --- | --- |
| 緑 | 正常 | 現時点で大きなストレスは確認されていない |
| 黄 | 注意 | 一部に悪化または接近サインがある |
| 橙 | 警戒 | 複数条件または強めの悪化が見える |
| 赤 | 危険 | 重要ラインを超えており、強い警戒が必要 |
| グレー / 未取得 | データ待ち | API、手動データ、外部公表値が未取得または更新待ち |

注意:

- 赤が出ても「危機確定」ではありません。
- 脆弱性の赤だけでは金融危機とは判定しません。
- 点火層、信用市場、短期流動性、銀行流動性の悪化を最重要視します。

## 4. Overall Risk Status

市場ストレスの総合状態を表示します。

主に次を総合します。

- 信用市場
- 流動性
- 金利
- ボラティリティ
- 銀行・資金調達
- 脆弱性

使い方:

- まずここで全体の温度感を確認します。
- ただし、総合表示だけで判断せず、Liquidity Core と Ignition Distance を必ず確認します。

## 5. Crisis Risk Range

危機の種類ごとに警戒レンジを表示します。

表示対象:

- Recession Risk / 景気後退リスク
- Bear Market Risk / ベア相場リスク
- Systemic Crisis Risk / システミック危機リスク
- Extreme Crisis Risk / 極端危機リスク

表示は確率ではありません。
「低」「低〜中」「中」「中〜高」「高」のレンジで、市場環境の警戒度を表します。

## 6. Liquidity Core

本サイトで最も重要なセクションです。

金融危機は、単なる株価下落ではなく「お金の流れ」が詰まった時に深刻化します。
Liquidity Core は、その詰まりを5つに分けて表示します。

| カテゴリ | 見るもの |
| --- | --- |
| Credit Market | HY OAS、IG OAS、BAA-AAAなど企業信用市場 |
| Short-Term Funding | SOFR、Repo Stress、FRA-OIS、TED Spread |
| Bank Liquidity | 預金流出、MMF、Discount Window、BTFP、CET1 |
| Treasury Market | 米10年債、米30年債、国債入札、MOVE |
| Credit Supply | SLOOS、倒産、レバレッジドローン |

読み方:

- 信用市場が緑なら、信用市場全体への延焼はまだ確認されていません。
- 短期金融市場が悪化すると、銀行・金融機関同士のお金の流れが詰まっている可能性があります。
- 銀行流動性が悪化すると、預金移動や緊急資金調達の圧力が高まっている可能性があります。

## 7. Ignition Distance

危機の警戒ラインまでの距離を表示します。

例:

- HY OAS 現在 300bp、注意線 400bpまであと100bp
- VIX 現在 24、警戒線30まであと6
- TED Spread 現在 0.20%、警戒線0.30%まであと0.10%

使い方:

- 「まだ緑か」だけでなく「警戒線まで近いか」を確認します。
- 距離が急に縮む場合は Risk Velocity も確認します。

## 8. Crisis Route Tracker

危機がどの経路で進行しているかを見るセクションです。

表示ルート:

1. Inflation / Supply Shock Route
   - コモディティ、CPI、中央銀行、景気悪化、信用悪化を見る。

2. Credit Bubble Collapse Route
   - CRE、Private Credit、信用スプレッド、貸出態度、銀行流動性を見る。

3. Sovereign / Liquidity Route
   - 国債入札、長期金利、Repo/SOFR、銀行流動性、政策対応を見る。

4. Energy Credit Paradox Route
   - 原油安、シェール採算、Energy HY、HY OAS、信用市場全体を見る。

「現在地」は、先頭から注意以上が連続している位置だけを表示します。
途中の一部だけ悪化している場合は、経路進行とは扱わず「単独注意」として表示します。

## 9. Bubble Trigger Monitor

バブル崩壊の引き金を2種類に分けて表示します。

### 9.1 Dot-com Type

流動性・金利主導の崩れ方です。

見るもの:

- FRB政策スタンス
- 米10年債
- 米30年債
- S&P500テック集中度
- 50日線 / 200日線モメンタム

意味:

信用市場がまだ壊れていなくても、金利上昇や流動性引き締めでテーマ株から資金が抜ける型を監視します。

### 9.2 Lehman Type

信用主導の崩れ方です。

見るもの:

- HY OAS
- IG OAS
- BAA-AAA
- TED Spread
- FRA-OIS
- Discount Window
- 銀行預金流出

意味:

お金の貸し借りそのものが詰まり、社債・銀行・短期資金市場へ波及する型を監視します。

### 9.3 Conversion Watch

流動性型から信用型へ転化しているかを見ます。

点灯条件:

- Dot-com Type が赤
- Lehman Type が黄以上

この状態は、株式市場の調整が信用市場へ波及している可能性を示します。
ただし、危機発生を断定するものではありません。

## 10. Risk Velocity

悪化のスピードを表示します。

表示期間:

- 1日
- 7日
- 30日

見るもの:

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
- 失業保険
- 重要ニュースimpact

表示は「比較前 → 現在」と「変化量」で出ます。

判定:

- 安定
- やや悪化
- 急悪化
- 連鎖悪化

## 11. Three-Layer Summary

指標を3層に分けます。

| 層 | 意味 |
| --- | --- |
| Vulnerability / 脆弱性・爆薬 | 危機時の被害を大きくする要因 |
| Trigger / 触発・火花 | 景気後退やベア相場を近づけるサイン |
| Ignition / 点火・導火線 | 金融危機を近づける信用・流動性ストレス |

重要:

- VIXやサームルールは安全弁ではなく、警告サインです。
- CREやPrivate Creditは安全弁ではなく、脆弱性です。
- HY OAS、BAA-AAA、IG OAS、SOFR、CET1、FDIC、SLOOS、家計DSRなどは安全弁・点火層に属します。

## 12. Combination Checklist

危機タイプごとに条件がどこまで揃っているかを表示します。

### Recession Checklist

主な条件:

- 景気後退確率モデル上昇
- 消費者心理悪化
- 実体経済活動低下
- 失業保険250K超
- サームルール0.5超
- NFP下方修正
- 非農業雇用の増加ペース鈍化

### Systemic Crisis Checklist

主な条件:

- HY OAS 400bp超
- IG OAS 1.5%超
- BAA-AAA 2.0%超
- VIX 30定着
- 銀行預金流出加速
- Discount Window急増
- 国債入札不調連続
- FDIC銀行破綻

### Extreme Crisis Checklist

主な条件:

- HY OAS 600bp超
- VIX 40定着
- FDIC銀行破綻が複数
- SOFR / Repoストレス
- 国債入札不調連続
- 緊急支援後も安全弁ストレス

## 13. Contagion Watch

隠れた信用悪化が銀行や信用市場へ染み出していないかを見るセクションです。

監視項目:

- 銀行からノンバンク向け与信
- BDC非発生率
- 大型Private CreditファンドのNAVマークダウン

状態:

- じわじわ継続
- 染み出し開始
- 急性化目前

赤状態では「HY OAS点火の予兆」として点火層にもバッジを出します。

## 14. Signal Matrix

すべての指標を一覧で確認する場所です。

カードに表示されるもの:

- 指標名
- 現在値
- 前回値
- 変化方向
- 信号色
- 初心者向け説明
- なぜ重要か
- 閾値
- 危険シナリオ
- 関連指標
- データソース
- 最終更新日

## 15. 補助ページ

### 15.1 /behavior

Crisis Behavior Tracker を表示します。

対象:

- Smart Money
- Insider Selling
- Escape Money
- Credit Escape
- Corporate Defense
- Policy Stress

### 15.2 /investors

著名投資家の13Fポジションを表示します。

注意:

- 13Fは最大45日遅れです。
- Smart Moneyは安全弁ではありません。
- 補助シグナルとして扱います。

### 15.3 /global-risk

世界経済リスクを地域別に表示します。

対象:

- 米国
- G7各国
- GDP上位国
- 中国
- インド
- ロシア
- 中東
- アフリカ
- 南米
- 新興国
- 台湾 / 韓国 / 半導体地域

## 16. データ更新

自動取得:

- FRED
- U.S. Treasury
- NY Fed
- Fiscal Data
- GDELT
- FRB / FDIC / SEC等の公開RSS
- Yahoo Chart系の無料市場データ

手動管理:

- Private Credit
- BDC非発生率
- 大型PCファンドNAV
- FINRA Margin Debt
- NFP下方修正
- FRB政策スタンス
- テック集中度
- Energy HY Spread

手動データは `src/config/manual-data.ts` または `data/*.json` に保存します。

## 17. API

主要API:

- `/api/indicators`
- `/api/news`
- `/api/global-risk`
- `/api/smart-money/investors`

## 18. 運用時の確認

更新前に実行:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

ローカル確認:

```bash
npm run dev
```

ローカルURL:

```text
http://localhost:3000
```

本番URL:

```text
https://macro-crisis-dashboard.vercel.app/
```

## 19. 禁止表現

サイト上で避ける表現:

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

## 20. 既知の制約

- 無料APIだけでPrivate Credit、BDC、CLO、内部者売買を完全リアルタイム取得することはできません。
- FINRA Margin Debtは月次公表で、通常遅れがあります。
- 13Fは最大45日遅れです。
- ニュースimpactはルールベースであり、記事内容の真偽を保証しません。
- 危機ルートは監視順序であり、将来の到達時間を予測しません。
- スコアは投資判断ではなく、市場環境を把握するための補助表示です。
