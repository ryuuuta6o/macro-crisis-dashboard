import type { IndicatorId } from "@/types/indicator";

type IndicatorGlossary = {
  plainName: string;
  shortDefinition: string;
  measuredValue: string;
};

export const INDICATOR_GLOSSARY: Record<IndicatorId, IndicatorGlossary> = {
  "hy-oas": {
    plainName: "低格付け社債の上乗せ金利",
    shortDefinition:
      "信用力が低い企業がお金を借りるとき、米国債より何％余計な金利を求められているか",
    measuredValue: "ハイイールド社債の米国債に対する上乗せ金利",
  },
  "baa-aaa": {
    plainName: "信用力による社債金利の差",
    shortDefinition:
      "信用力が中程度の企業と、信用力が非常に高い企業の借入金利の差",
    measuredValue: "BAA格社債とAAA格社債の利回り差",
  },
  "ig-oas": {
    plainName: "優良企業社債の上乗せ金利",
    shortDefinition:
      "比較的信用力が高い企業がお金を借りる際に求められる追加金利",
    measuredValue: "投資適格社債の米国債に対する上乗せ金利",
  },
  "ccc-oas": {
    plainName: "信用力が非常に低い企業の上乗せ金利",
    shortDefinition:
      "返済不安が大きい企業がお金を借りる際に求められる追加金利",
    measuredValue: "CCC格社債の米国債に対する上乗せ金利",
  },
  vix: {
    plainName: "株式市場の不安度",
    shortDefinition:
      "S&P 500が今後約30日でどれほど大きく動くと市場が予想しているか",
    measuredValue: "株式オプション価格から計算した予想変動率",
  },
  dgs10: {
    plainName: "米国が10年間借りる金利",
    shortDefinition:
      "米国政府へ10年間お金を貸した場合に得られる年利の目安",
    measuredValue: "米10年国債の市場利回り",
  },
  dgs30: {
    plainName: "米国が30年間借りる金利",
    shortDefinition:
      "米国政府へ30年間お金を貸した場合に得られる年利の目安",
    measuredValue: "米30年国債の市場利回り",
  },
  move: {
    plainName: "債券市場の不安度",
    shortDefinition:
      "米国債の金利が今後どれほど大きく動くと市場が予想しているか",
    measuredValue: "米国債オプション価格から計算した予想変動率",
  },
  "treasury-auction": {
    plainName: "米国債の買い手の多さ",
    shortDefinition:
      "米国債の販売額に対して、何倍の購入申し込みが集まったか",
    measuredValue: "長期米国債入札の応札倍率",
  },
  sofr: {
    plainName: "金融機関の翌日借入金利",
    shortDefinition:
      "銀行などが国債を担保に、翌日返済の資金を貸し借りするときの代表的な金利",
    measuredValue: "米国の国債担保付き翌日物資金調達金利",
  },
  "ted-spread": {
    plainName: "銀行信用と短期国債の金利差",
    shortDefinition:
      "銀行間の信用リスクを含む短期金利と、安全性の高い短期国債金利の差",
    measuredValue: "旧3カ月LIBORと3カ月米国債利回りの差",
  },
  "fra-ois": {
    plainName: "銀行間調達の信用上乗せ",
    shortDefinition:
      "将来の銀行間金利と、信用リスクが小さい翌日物金利見通しの差",
    measuredValue: "FRA金利とOIS金利の差",
  },
  "bank-deposit-outflow": {
    plainName: "中小銀行の預金の増減",
    shortDefinition:
      "米国の中小銀行から預金が流出しているか、流入しているか",
    measuredValue: "中小銀行預金残高の前週からの増減額",
  },
  "mmf-assets": {
    plainName: "短期の安全資産に集まった資金",
    shortDefinition:
      "短期国債などで運用するマネー・マーケット・ファンドの残高",
    measuredValue: "個人向けMMFの運用資産残高",
  },
  "discount-window": {
    plainName: "銀行のFRB緊急借入額",
    shortDefinition:
      "銀行が通常市場ではなく、中央銀行の窓口から直接借りている資金の規模",
    measuredValue: "FRB Primary Creditの週末残高",
  },
  btfp: {
    plainName: "2023年型の銀行緊急借入残高",
    shortDefinition:
      "銀行が国債などを担保にFRBから借りた時限的な緊急資金の残高",
    measuredValue: "Bank Term Funding Programの週末残高",
  },
  "bank-cet1": {
    plainName: "銀行が損失を吸収できる自己資本",
    shortDefinition:
      "銀行のリスク資産に対して、質の高い普通株式資本がどれだけあるか",
    measuredValue: "大手銀行の普通株式等Tier1資本比率",
  },
  "fdic-dif": {
    plainName: "預金保険に使える基金残高",
    shortDefinition:
      "銀行破綻時に保護対象預金を支払うためFDICが保有する基金",
    measuredValue: "Deposit Insurance Fundの四半期末残高",
  },
  "household-debt-gdp": {
    plainName: "経済規模に対する家計借金",
    shortDefinition:
      "住宅ローンや消費者ローンなど家計債務がGDPの何％に相当するか",
    measuredValue: "米国家計債務のGDP比",
  },
  "household-dsr": {
    plainName: "家計収入に対する借金返済負担",
    shortDefinition:
      "家計の可処分所得のうち、元金と利息の支払いに必要な割合",
    measuredValue: "家計債務返済額の可処分所得比",
  },
  sloos: {
    plainName: "融資基準を厳しくした銀行の割合",
    shortDefinition:
      "企業向け融資の審査基準を引き締めた銀行が、緩和した銀行をどれだけ上回るか",
    measuredValue: "大中企業向け貸出基準の引き締め超過割合",
  },
  "office-cmbs": {
    plainName: "オフィス融資の延滞割合",
    shortDefinition:
      "証券化されたオフィス向け不動産ローンのうち、返済が遅れている割合",
    measuredValue: "オフィス向けCMBSローンの延滞率",
  },
  "cmbs-total": {
    plainName: "商業不動産融資全体の延滞割合",
    shortDefinition:
      "証券化された商業不動産ローン全体で、返済が遅れている割合",
    measuredValue: "CMBSローン全体の延滞率",
  },
  "private-credit-default": {
    plainName: "非公開融資の債務不履行割合",
    shortDefinition:
      "銀行を通さない相対融資で、予定どおり返済できなくなった案件の割合",
    measuredValue: "プライベートクレジット市場のデフォルト率",
  },
  "pik-ratio": {
    plainName: "現金で払わず元本へ積んだ利息の割合",
    shortDefinition:
      "利息を現金で払えず、借金の元本へ上乗せして先送りした割合",
    measuredValue: "利息収入に占めるPIK利息の割合",
  },
  "leveraged-loan-default": {
    plainName: "借金の多い企業の債務不履行割合",
    shortDefinition:
      "借入負担が大きい企業向けローンで、返済不能になった割合",
    measuredValue: "レバレッジドローンの過去12カ月デフォルト率",
  },
  "shiller-cape": {
    plainName: "企業の実力に対する株価の高さ",
    shortDefinition:
      "過去10年平均の実質利益に対して、株式市場がどれだけ高く評価されているか",
    measuredValue: "S&P 500のシラーPER",
  },
  "buffett-indicator": {
    plainName: "経済規模に対する株式市場の大きさ",
    shortDefinition:
      "米国のGDPに対して、株式市場全体の時価総額がどれだけ膨らんでいるか",
    measuredValue: "米国株式時価総額のGDP比",
  },
  "margin-debt-gdp": {
    plainName: "GDPに対する信用取引の借入規模",
    shortDefinition:
      "投資家が借入を使って株式を買っている規模を、経済全体の大きさと比べた割合",
    measuredValue: "FINRA Margin DebtのGDP比",
  },
  "margin-debt-m2": {
    plainName: "お金の量に対する信用買いの過熱度",
    shortDefinition:
      "投資家が借金を使って買っている株式の規模を、M2マネーストックと比べた割合",
    measuredValue: "FINRA Margin DebtをM2で割った比率",
  },
  icsa: {
    plainName: "新たに失業給付を申請した人数",
    shortDefinition:
      "米国で初めて失業保険を申請した人の週次人数",
    measuredValue: "初回失業保険申請件数",
  },
};

export function getIndicatorGlossary(id: IndicatorId) {
  return INDICATOR_GLOSSARY[id];
}
