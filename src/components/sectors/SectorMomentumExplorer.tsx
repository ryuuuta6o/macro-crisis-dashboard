"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiddenGemsPanel } from "@/components/sectors/HiddenGemsPanel";
import type {
  SectorCompanyData,
  SectorCompanyGrowthData,
  SectorDisplayMode,
  SectorMarketSeries,
  SectorMomentumData,
  SectorMomentumDataItem,
  SectorMomentumPeriod,
  SectorRegion,
} from "@/types/sector-momentum";

const periods: SectorMomentumPeriod[] = ["1d", "1w", "1m", "3m", "ytd", "1y", "3y", "5y"];
const periodLabels: Record<SectorMomentumPeriod, string> = {
  "1d": "1日",
  "1w": "1週",
  "1m": "1ヶ月",
  "3m": "3ヶ月",
  ytd: "YTD",
  "1y": "1年",
  "3y": "3年",
  "5y": "5年",
};

type SortKey = SectorMomentumPeriod | "momentum" | "expectation" | "marketCap";
type CompanySortKey = "marketCap" | "subcategory" | "expectation" | "revenueGrowth" | "forwardPE" | "1d" | "1m" | "ytd" | "1y";
type ChartRange = "1m" | "3m" | "1y" | "5y";
type ThemeFamilyFilter = "all" | "growth" | "pickaxe";
type SectorViewMode = SectorDisplayMode | "hidden-gems";

export function SectorMomentumExplorer({ data }: { data: SectorMomentumData }) {
  const [sectorData, setSectorData] = useState(data);
  const [displayMode, setDisplayMode] = useState<SectorViewMode>("sector");
  const [regionFilter, setRegionFilter] = useState<SectorRegion | "all">("all");
  const [themeFamilyFilter, setThemeFamilyFilter] = useState<ThemeFamilyFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("momentum");
  const [descending, setDescending] = useState(true);
  const [selectedSectorId, setSelectedSectorId] = useState(data.sectors[0]?.id ?? "");
  const [selectedTicker, setSelectedTicker] = useState(data.sectors[0]?.companies[0]?.ticker ?? "");
  const [companySortKey, setCompanySortKey] = useState<CompanySortKey>("marketCap");
  const [chartRange, setChartRange] = useState<ChartRange>("1y");
  const [financialsByTicker, setFinancialsByTicker] = useState<Record<string, SectorCompanyGrowthData>>({});
  const [financialErrorTickers, setFinancialErrorTickers] = useState<string[]>([]);
  const [lastSectorRefreshAt, setLastSectorRefreshAt] = useState(data.generatedAt);
  const [autoRefreshState, setAutoRefreshState] = useState<"idle" | "refreshing" | "error">("idle");

  const fetchSectorMomentum = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/sectors/momentum?t=${Date.now()}`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Sector momentum refresh failed");
    const refreshed = (await response.json()) as SectorMomentumData;
    setSectorData(refreshed);
  }, []);

  const fetchCompanyFinancials = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/sectors/company-financials?all=1&schema=free-v2&t=${Date.now()}`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Company financials refresh failed");
    const financials = (await response.json()) as Record<string, SectorCompanyGrowthData>;
    setFinancialsByTicker((current) => ({ ...current, ...financials }));
  }, []);

  const refreshAllData = useCallback(async (signal?: AbortSignal) => {
    setAutoRefreshState("refreshing");
    try {
      await Promise.all([
        fetchSectorMomentum(signal),
        fetchCompanyFinancials(signal),
      ]);
      setLastSectorRefreshAt(new Date().toISOString());
      setAutoRefreshState("idle");
    } catch (error) {
      if (!signal?.aborted && !(error instanceof DOMException && error.name === "AbortError")) {
        setAutoRefreshState("error");
      }
    }
  }, [fetchCompanyFinancials, fetchSectorMomentum]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sectors/company-financials?all=1&schema=free-v2&t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) return null;
        return response.json() as Promise<Record<string, SectorCompanyGrowthData>>;
      })
      .then((financials) => {
        if (financials) {
          setFinancialsByTicker((current) => ({ ...current, ...financials }));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshAllData();
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshAllData]);

  const financialDataSummary = useMemo(() => {
    const records = Object.values(financialsByTicker);
    const available = records.filter((record) => record.status !== "unavailable");
    const latestTimestamp = available.reduce<number | null>((latest, record) => {
      if (!record.updatedAt) return latest;
      const timestamp = new Date(record.updatedAt).getTime();
      if (!Number.isFinite(timestamp)) return latest;
      return latest === null ? timestamp : Math.max(latest, timestamp);
    }, null);
    return {
      available: available.length,
      total: records.length,
      updatedAt: latestTimestamp === null ? null : new Date(latestTimestamp).toISOString(),
    };
  }, [financialsByTicker]);

  const visibleSectors = useMemo(() => {
    return sectorData.sectors
      .filter((sector) => sector.displayMode === displayMode)
      .filter((sector) =>
        displayMode !== "theme" || themeFamilyFilter === "all"
          ? true
          : (sector.themeFamily ?? "growth") === themeFamilyFilter,
      )
      .filter((sector) =>
        regionFilter === "all"
          ? true
          : sector.companies.some((company) => company.region === regionFilter),
      );
  }, [sectorData.sectors, displayMode, regionFilter, themeFamilyFilter]);

  const sortedSectors = useMemo(() => {
    return [...visibleSectors].sort((a, b) => compareNullable(sectorSortValue(a, sortKey), sectorSortValue(b, sortKey), descending));
  }, [descending, sortKey, visibleSectors]);

  const selectedSectorBase =
    visibleSectors.find((sector) => sector.id === selectedSectorId) ?? visibleSectors[0];
  const selectedSector = selectedSectorBase
    ? {
        ...selectedSectorBase,
        companies:
          regionFilter === "all"
            ? selectedSectorBase.companies
            : selectedSectorBase.companies.filter((company) => company.region === regionFilter),
      }
    : null;
  const sortedCompanies = useMemo(() => {
    return [...(selectedSector?.companies ?? [])].sort((a, b) => {
      if (companySortKey === "subcategory") {
        return (a.subcategory ?? "未分類").localeCompare(b.subcategory ?? "未分類", "ja");
      }
      return compareNullable(companySortValue(a, companySortKey), companySortValue(b, companySortKey), true);
    });
  }, [companySortKey, selectedSector?.companies]);
  const selectedCompany =
    selectedSector?.companies.find((company) => company.ticker === selectedTicker) ??
    sortedCompanies[0];
  const selectedFinancials = selectedCompany
    ? financialsByTicker[selectedCompany.ticker]
    : undefined;

  useEffect(() => {
    const ticker = selectedCompany?.ticker;
    if (
      displayMode === "hidden-gems" ||
      !ticker ||
      financialsByTicker[ticker] ||
      financialErrorTickers.includes(ticker)
    ) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/sectors/company-financials?symbol=${encodeURIComponent(ticker)}&schema=free-v2`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Financial data unavailable");
        return response.json() as Promise<SectorCompanyGrowthData>;
      })
      .then((financials) => {
        setFinancialsByTicker((current) => ({ ...current, [ticker]: financials }));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFinancialErrorTickers((current) =>
            current.includes(ticker) ? current : [...current, ticker],
          );
        }
      });
    return () => controller.abort();
  }, [displayMode, financialErrorTickers, financialsByTicker, selectedCompany?.ticker]);

  function selectSector(sector: SectorMomentumDataItem) {
    setSelectedSectorId(sector.id);
    const companies =
      regionFilter === "all"
        ? sector.companies
        : sector.companies.filter((company) => company.region === regionFilter);
    setSelectedTicker(companies[0]?.ticker ?? "");
  }

  return (
    <div className="sector-terminal space-y-5">
      <section className="sector-hero-panel">
        <div className="sector-hero-copy">
          <p className="sector-eyebrow">SECTOR MOMENTUM TERMINAL</p>
          <h1>
            <span>Sector Momentum</span>
            <span>セクター動向</span>
          </h1>
          <p>
            危機監視とは別に、各セクターの上昇率、相対的な強さ、期待度の高まりを可視化します。
            これは投資助言ではなく、市場状態の整理です。
          </p>
        </div>
        <div className="sector-refresh-cluster">
          <span className={`sector-live-refresh is-${autoRefreshState}`} aria-live="polite">
            {autoRefreshState === "refreshing"
              ? "再取得中"
              : autoRefreshState === "error"
                ? "再取得失敗"
                : "AUTO 15M"}
          </span>
          <button
            type="button"
            className="sector-refresh-button"
            onClick={() => void refreshAllData()}
            disabled={autoRefreshState === "refreshing"}
          >
            {autoRefreshState === "refreshing" ? "更新中" : "今すぐ更新"}
          </button>
        </div>
        <div className="sector-freshness-grid">
          <FreshnessCell
            label="市場データ"
            value={formatDateTime(sectorData.benchmark.observedAt ?? sectorData.generatedAt)}
            detail="価格・騰落率 / 15分間隔"
            tone={autoRefreshState === "error" ? "error" : "current"}
          />
          <FreshnessCell
            label="財務データ"
            value={financialDataSummary.updatedAt ? formatDateTime(financialDataSummary.updatedAt) : "取得中"}
            detail="CAGR・ROE・ROIC / 日次バッチ"
            tone={financialDataSummary.updatedAt ? "batch" : "loading"}
          />
          <FreshnessCell
            label="取得カバレッジ"
            value={financialDataSummary.total > 0 ? `${financialDataSummary.available} / ${financialDataSummary.total}` : "確認中"}
            detail="取得不可は推測値で補完しません"
            tone={financialDataSummary.total > 0 ? "neutral" : "loading"}
          />
          <FreshnessCell
            label="再取得確認"
            value={formatDateTime(lastSectorRefreshAt)}
            detail={`比較対象 ${sectorData.benchmark.symbol}`}
            tone="neutral"
          />
        </div>
      </section>

      <nav className="sector-primary-tabs" aria-label="Sector Momentum表示切替">
        <button type="button" className={displayMode === "sector" ? "is-active" : ""} onClick={() => setDisplayMode("sector")}>
          セクター
        </button>
        <button type="button" className={displayMode === "theme" ? "is-active" : ""} onClick={() => setDisplayMode("theme")}>
          テーマ
        </button>
        <button type="button" className={displayMode === "hidden-gems" ? "is-active" : ""} onClick={() => setDisplayMode("hidden-gems")}>
          Hidden Gems
        </button>
      </nav>

      {displayMode === "hidden-gems" ? (
        <HiddenGemsPanel />
      ) : (
        <>
      <section className="sector-panel">
        <div className="sector-panel-head">
          <div>
            <p className="sector-eyebrow">LAYER 1 / HEATMAP</p>
            <h2>{displayMode === "sector" ? "全セクター比較" : "テーマ別バスケット比較"}</h2>
          </div>
          <div className="sector-controls">
            {displayMode === "theme" && (
              <label>
                Theme type
                <select value={themeFamilyFilter} onChange={(event) => setThemeFamilyFilter(event.target.value as ThemeFamilyFilter)}>
                  <option value="all">すべて</option>
                  <option value="growth">成長テーマ</option>
                  <option value="pickaxe">ツルハシ</option>
                </select>
              </label>
            )}
            <label>
              Region
              <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value as SectorRegion | "all")}>
                <option value="all">全地域</option>
                  {sectorData.availableRegions.map((region) => (
                  <option key={region.id} value={region.id}>{region.label}</option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="momentum">モメンタムスコア</option>
                <option value="expectation">期待度スコア</option>
                <option value="marketCap">時価総額合計</option>
                {periods.map((period) => (
                  <option key={period} value={period}>{periodLabels[period]} 騰落率</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setDescending((value) => !value)}>
              {descending ? "降順" : "昇順"}
            </button>
          </div>
        </div>

        <div className="sector-heatmap">
          <div className="sector-heatmap-row sector-heatmap-head" aria-hidden="true">
            <span>Sector</span>
            {periods.map((period) => <span key={period}>{periodLabels[period]}</span>)}
            <span>Momentum</span>
            <span>Expectation</span>
            <span>52W</span>
          </div>
          {sortedSectors.map((sector) => (
            <button
              type="button"
              key={sector.id}
              data-sector-id={sector.id}
              className={`sector-heatmap-row ${sector.id === selectedSector?.id ? "is-active" : ""}`}
              onClick={() => selectSector(sector)}
            >
              <span className="sector-name-cell">
                <strong>
                  {sector.nameJa}
                  {sector.isOverheated && <em className="sector-overheat-badge">短期過熱</em>}
                </strong>
                <small>{sector.name} · {sector.benchmarkSymbol} · {sector.displayMode.toUpperCase()}</small>
                {sector.structureDescription && <small className="sector-structure-line">{sector.structureDescription}</small>}
              </span>
              {periods.map((period) => (
                <span key={period} className="sector-return-cell" style={heatStyle(sector.market.returns[period])}>
                  {formatPercent(sector.market.returns[period])}
                </span>
              ))}
              <ScoreCell value={sector.momentumScore} />
              <ScoreCell value={sector.expectationScore} label={expectationLabel(sector.expectationLevel)} />
              <span className="sector-range-cell">{formatPercent(sector.market.rangePosition.week52, 0)}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedSector && (
        <section className="sector-drill-grid">
          <div className="sector-panel">
            <div className="sector-panel-head">
              <div>
                <p className="sector-eyebrow">LAYER 2 / COMPANIES</p>
                <h2>{selectedSector.nameJa} / 企業一覧</h2>
                {selectedSector.structureDescription && (
                  <p className="sector-theme-structure">{selectedSector.structureDescription}</p>
                )}
                {selectedSector.isOverheated && (
                  <p className="sector-overheat-note">
                    短期過熱: 構成銘柄の3ヶ月平均 {formatPercent(selectedSector.shortTermAverageReturn3m)}
                  </p>
                )}
              </div>
              <div className="sector-controls">
                <label>
                  Sort
                  <select value={companySortKey} onChange={(event) => setCompanySortKey(event.target.value as CompanySortKey)}>
                    <option value="marketCap">時価総額</option>
                    <option value="subcategory">サブカテゴリ</option>
                    <option value="expectation">期待度</option>
                    <option value="revenueGrowth">売上成長率</option>
                    <option value="forwardPE">予想PER</option>
                    <option value="1d">1日騰落率</option>
                    <option value="1m">1ヶ月騰落率</option>
                    <option value="ytd">YTD騰落率</option>
                    <option value="1y">1年騰落率</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="sector-company-list">
              {sortedCompanies.map((company) => (
                <button
                  type="button"
                  key={company.ticker}
                  data-ticker={company.ticker}
                  className={`sector-company-row ${company.ticker === selectedCompany?.ticker ? "is-active" : ""}`}
                  onClick={() => setSelectedTicker(company.ticker)}
                >
                  <span>
                    <strong>{company.ticker} <em>{company.countryCode}</em></strong>
                    <small>{company.name} · {company.exchange}</small>
                    <small className="sector-company-summary">{company.businessSummary}</small>
                    {company.subcategory && <small className="sector-company-subcategory">{company.subcategory}</small>}
                  </span>
                  <span>{formatPrice(company.market)}</span>
                  <span style={heatStyle(company.market.returns["1m"])}>{formatPercent(company.market.returns["1m"])}</span>
                  <span>
                    {formatMarketCap(company.marketCapUsd)}
                    <small className="sector-cap-class">{marketCapClass(company.marketCapUsd)}</small>
                  </span>
                  <span className="sector-growth-brief">
                    <small>売上CAGR</small>
                    {formatPercent(financialsByTicker[company.ticker]?.revenueCagr5y ?? null)}
                  </span>
                  <ScoreCell value={company.expectationScore} compact />
                </button>
              ))}
            </div>
          </div>

          {selectedCompany && (
            <CompanyDetail
              company={selectedCompany}
              sector={selectedSector}
              chartRange={chartRange}
              setChartRange={setChartRange}
              growth={selectedFinancials}
              loadingGrowth={
                !selectedFinancials &&
                !financialErrorTickers.includes(selectedCompany.ticker)
              }
            />
          )}
        </section>
      )}
        </>
      )}

      <section className="sector-panel sector-disclaimer">
        <p>{sectorData.disclaimer}</p>
        <p>
          期待度スコア比率: SNS/検索 {Math.round(sectorData.scoreWeights.socialSearchGrowth * 100)}%、
          アナリスト予想 {Math.round(sectorData.scoreWeights.analystRevision * 100)}%、
          相対モメンタム {Math.round(sectorData.scoreWeights.relativeMomentum * 100)}%、
          資金フロー {Math.round(sectorData.scoreWeights.fundFlow * 100)}%。
        </p>
      </section>
    </div>
  );
}

function CompanyDetail({
  company,
  sector,
  chartRange,
  setChartRange,
  growth,
  loadingGrowth,
}: {
  company: SectorCompanyData;
  sector: SectorMomentumDataItem;
  chartRange: ChartRange;
  setChartRange: (range: ChartRange) => void;
  growth: SectorCompanyGrowthData | undefined;
  loadingGrowth: boolean;
}) {
  return (
    <div className="sector-panel sector-company-detail">
      <div className="sector-panel-head">
        <div>
          <p className="sector-eyebrow">LAYER 3 / COMPANY DETAIL</p>
          <h2>{company.ticker} / {company.name}</h2>
          <p className="sector-company-detail-subtitle">{company.countryName} · {company.exchange} · {company.businessSummary}</p>
        </div>
        <a href={company.market.sourceUrl} target="_blank" rel="noreferrer">Source</a>
      </div>

      <div className="sector-detail-metrics">
        <Stat label="株価" value={formatPrice(company.market)} />
        <Stat label="1ヶ月" value={formatPercent(company.market.returns["1m"])} />
        <Stat label="YTD" value={formatPercent(company.market.returns.ytd)} />
        <Stat label="期待度" value={company.expectationScore === null ? "unavailable" : `${company.expectationScore}/100`} />
      </div>

      <div className="sector-chart-card">
        <div className="sector-chart-head">
          <span>Price Chart</span>
          <div>
            {(["1m", "3m", "1y", "5y"] as ChartRange[]).map((range) => (
              <button
                key={range}
                type="button"
                className={range === chartRange ? "is-active" : ""}
                onClick={() => setChartRange(range)}
              >
                {periodLabels[range]}
              </button>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 620 180" preserveAspectRatio="none" aria-label={`${company.ticker} price chart`}>
          <line x1="0" x2="620" y1="90" y2="90" stroke="rgba(148,163,184,.18)" strokeDasharray="4 6" />
          <polyline points={chartPoints(company.market, chartRange)} fill="none" stroke="#38bdf8" strokeWidth="2.4" />
        </svg>
      </div>

      <div className="sector-detail-grid">
        <InfoBlock title="成長データ">
          {loadingGrowth ? (
            <div className="sector-financial-skeleton" aria-label="成長データを取得中">
              <i /><i /><i /><i />
            </div>
          ) : (
            <>
          <DataLine label="直近売上高" value={formatMoney(growth?.revenueLatest ?? null, growth?.financialCurrency)} />
              <DataLine label="売上高 YoY" value={formatPercent(growth?.revenueGrowthYoY ?? null)} />
              <DataLine label="売上高 5年CAGR" value={formatPercent(growth?.revenueCagr5y ?? null)} />
              <DataLine label="EPS YoY" value={formatPercent(growth?.epsGrowthYoY ?? null)} />
              <DataLine label="EPS 5年CAGR" value={formatPercent(growth?.epsCagr5y ?? null)} />
              <FinancialHistoryChart history={growth?.annualHistory ?? []} />
            </>
          )}
        </InfoBlock>

        <InfoBlock title="受注・供給能力">
          <DataLine label="新規受注" value={growth?.orders === null || growth?.orders === undefined ? (growth?.ordersLabel ?? "受注データなし") : formatMoney(growth.orders)} />
          <DataLine label="受注残" value={growth?.backlog === null || growth?.backlog === undefined ? (growth?.backlogLabel ?? "受注残データなし") : formatMoney(growth.backlog)} />
          <p className="sector-note">
            受注・受注残は標準化されていないため、会社開示を確認できた場合のみ手動設定で補完します。
          </p>
        </InfoBlock>

        <InfoBlock title="収益性・資本効率">
          <DataLine label="ROE" value={formatPercent(growth?.roe ?? null)} />
          <DataLine label="ROIC" value={formatPercent(growth?.roic ?? null)} />
          <DataLine label="営業利益率" value={formatPercent(growth?.operatingMargin ?? null)} />
          <DataLine label="粗利率" value={formatPercent(growth?.grossMargin ?? null)} />
          <DataLine label="フリーキャッシュフロー" value={formatMoney(growth?.freeCashFlow ?? null, growth?.financialCurrency)} />
          <DataLine label="配当利回り" value={formatPercent(growth?.dividendYield ?? null)} />
          <DataLine label="自社株買い" value={formatMoney(growth?.shareRepurchases ?? null, growth?.financialCurrency)} />
        </InfoBlock>

        <InfoBlock title="市場ポジショニング">
          <DataLine label="実態スコア" value={formatScore(growth?.fundamentalScore ?? null)} />
          <DataLine label="注目スコア" value={formatScore(growth?.attentionScore ?? null)} />
          <DataLine label="Gem Score" value={formatSignedNumber(growth?.gemScore ?? null)} />
          <DataLine label="テーマ中央値比" value={formatRatio(growth?.valuationToThemeMedian ?? null)} />
          <DataLine label="3ヶ月騰落率" value={formatPercent(growth?.return3m ?? null)} />
          <DataLine label="6ヶ月騰落率" value={formatPercent(growth?.return6m ?? null)} />
          <DataLine label="PER" value={formatMultiple(growth?.peRatio ?? null)} />
          <DataLine label="PSR" value={formatMultiple(growth?.priceToSalesRatio ?? null)} />
          <DataLine label="アナリストカバー" value={formatCount(growth?.analystCoverage ?? null, "社")} />
          <DataLine label="機関投資家保有比率" value={formatPercent(growth?.institutionalOwnership ?? null)} />
          <DataLine label="空売り比率" value={formatPercent(growth?.shortInterest ?? null)} />
          <DataLine label="ベータ値" value={formatDecimal(growth?.beta ?? null)} />
          <DataLine label="データ状態" value={loadingGrowth ? "取得中" : growth?.status ?? "unavailable"} />
          <DataLine label="更新日" value={growth?.updatedAt ?? "unavailable"} />
          <p className="sector-note">Source: {growth?.sourceName ?? "Unavailable"}</p>
        </InfoBlock>

        <InfoBlock title="業績指標">
          <DataLine label="売上高成長率 YoY" value={formatPercent(growth?.revenueGrowthYoY ?? company.fundamentals.revenueGrowthYoY)} />
          <DataLine label="純利益" value={formatMoney(growth?.netIncomeLatest ?? company.fundamentals.netIncome, growth?.financialCurrency)} />
          <DataLine label="EPS成長率" value={formatPercent(growth?.epsGrowthYoY ?? company.fundamentals.epsGrowthYoY)} />
          <DataLine label="EPS CAGR" value={formatPercent(growth?.epsCagr5y ?? null)} />
          <DataLine label="PER" value={formatMultiple(growth?.peRatio ?? company.fundamentals.forwardPE)} />
          <DataLine label="予想売上成長" value={formatPercent(company.fundamentals.forwardRevenueGrowth)} />
          <DataLine label="粗利率" value={formatPercent(growth?.grossMargin ?? company.fundamentals.grossMargin)} />
        </InfoBlock>

        <InfoBlock title="決算・レンジ">
          <DataLine label="直近決算" value={earningsLabel(company.fundamentals.earningsSurprise)} />
          <DataLine label="次回決算日" value={company.fundamentals.nextEarningsDate ?? "unavailable"} />
          <DataLine label="52週レンジ内位置" value={formatPercent(company.market.rangePosition.week52, 0)} />
          <DataLine label="5年高値からの距離" value={formatPercent(company.market.rangePosition.fiveYearHighDistance)} />
          <DataLine label="セクター相対強度" value={formatPercent(sector.relativeStrength)} />
        </InfoBlock>

        <InfoBlock title="期待度の内訳(取得可能範囲)">
          <DataLine label="SNS/検索の伸び" value={company.expectation.socialSearchGrowth === null ? "無料取得対象外" : formatScore(company.expectation.socialSearchGrowth)} />
          <DataLine label="アナリスト上方修正" value={company.expectation.analystRevision === null ? "無料取得対象外" : formatScore(company.expectation.analystRevision)} />
          <DataLine label="相対モメンタム" value={formatPercent(growth?.return3m ?? null)} />
          <DataLine label="資金フロー" value={company.expectation.fundFlow === null ? "無料取得対象外" : formatScore(company.expectation.fundFlow)} />
          <p className="sector-note">
            無料構成では、検証可能な価格・財務・保有データだけを表示します。SNS、予想修正、ETF資金フローは推測しません。
          </p>
        </InfoBlock>

        <InfoBlock title="関連キーワード">
          <div className="sector-keyword-list">
            {[...sector.keywords, ...company.expectation.trendingKeywords].length === 0
              ? <span>unavailable</span>
              : [...sector.keywords, ...company.expectation.trendingKeywords].map((keyword) => <span key={keyword}>{keyword}</span>)}
          </div>
        </InfoBlock>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="sector-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function FreshnessCell({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "current" | "batch" | "neutral" | "loading" | "error";
}) {
  return (
    <div className={`sector-freshness-cell is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ScoreCell({ value, label, compact = false }: { value: number | null; label?: string; compact?: boolean }) {
  return (
    <span className={`sector-score-cell ${compact ? "is-compact" : ""}`}>
      <i style={{ width: `${value ?? 0}%` }} />
      <b>{value === null ? "--" : value}</b>
      {label && <small>{label}</small>}
    </span>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="sector-info-block"><h3>{title}</h3>{children}</section>;
}

function DataLine({ label, value }: { label: string; value: string }) {
  return <div className="sector-data-line"><span>{label}</span><b>{value}</b></div>;
}

function sectorSortValue(sector: SectorMomentumDataItem, key: SortKey) {
  if (key === "momentum") return sector.momentumScore;
  if (key === "expectation") return sector.expectationScore;
  if (key === "marketCap") return sector.marketCapUsd;
  return sector.market.returns[key];
}

function companySortValue(company: SectorCompanyData, key: CompanySortKey) {
  if (key === "marketCap") return company.marketCapUsd;
  if (key === "expectation") return company.expectationScore;
  if (key === "revenueGrowth") return company.fundamentals.revenueGrowthYoY;
  if (key === "forwardPE") return company.fundamentals.forwardPE === null ? null : -company.fundamentals.forwardPE;
  if (key === "subcategory") return null;
  return company.market.returns[key];
}

function FinancialHistoryChart({ history }: { history: SectorCompanyGrowthData["annualHistory"] }) {
  const points = financialChartPoints(history);
  return (
    <div className="sector-financial-chart">
      <div>
        <span>5Y REVENUE</span>
        <small>{history.length > 1 ? `${history[0].year} - ${history.at(-1)?.year}` : "unavailable"}</small>
      </div>
      {points ? (
        <svg viewBox="0 0 320 84" preserveAspectRatio="none" aria-label="5年間の売上推移">
          <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        </svg>
      ) : (
        <p>売上推移データなし</p>
      )}
    </div>
  );
}

function financialChartPoints(history: SectorCompanyGrowthData["annualHistory"]) {
  const values = history
    .map((point) => point.revenue)
    .filter((value): value is number => value !== null);
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 320;
    const y = max === min ? 42 : 74 - ((value - min) / (max - min)) * 64;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function compareNullable(a: number | null, b: number | null, descending: boolean) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return descending ? b - a : a - b;
}

function heatStyle(value: number | null): React.CSSProperties {
  if (value === null) return { background: "rgba(100,116,139,.12)", color: "#94a3b8" };
  const intensity = Math.min(1, Math.abs(value) / 18);
  const color = value >= 0 ? "34,197,94" : "248,113,113";
  return {
    background: `rgba(${color},${0.1 + intensity * 0.38})`,
    color: value >= 0 ? "#bbf7d0" : "#fecdd3",
    borderColor: `rgba(${color},${0.18 + intensity * 0.42})`,
  };
}

function chartPoints(market: SectorMarketSeries, range: ChartRange) {
  if (market.history.length < 2) return "0,130 620,130";
  const count = range === "1m" ? 22 : range === "3m" ? 64 : range === "1y" ? 253 : market.history.length;
  const selected = market.history.slice(-count);
  const values = selected.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 620;
  const height = 180;
  return selected.map((point, index) => {
    const x = selected.length === 1 ? 0 : (index / (selected.length - 1)) * width;
    const y = max === min ? height / 2 : height - ((point.value - min) / (max - min)) * (height - 24) - 12;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function expectationLabel(level: string) {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  if (level === "low") return "低";
  return "未取得";
}

function earningsLabel(value: string) {
  if (value === "beat") return "予想比上振れ";
  if (value === "miss") return "予想比下振れ";
  if (value === "inline") return "概ね一致";
  return "unavailable";
}

function formatPercent(value: number | null, decimals = 1) {
  if (value === null) return "unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

function formatScore(value: number | null) {
  return value === null ? "unavailable" : `${Math.round(value)}/100`;
}

function formatMultiple(value: number | null) {
  return value === null ? "unavailable" : `${value.toFixed(1)}x`;
}

function formatDecimal(value: number | null) {
  return value === null ? "unavailable" : value.toFixed(2);
}

function formatMoney(value: number | null, currency?: string | null) {
  if (value === null) return "unavailable";
  const prefix = currency ? `${currency} ` : "$";
  if (Math.abs(value) >= 1_000_000_000_000) return `${prefix}${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (Math.abs(value) >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  return `${prefix}${value.toLocaleString("en-US")}`;
}

function formatMarketCap(value: number | null) {
  return formatMoney(value);
}

function formatSignedNumber(value: number | null) {
  return value === null ? "unavailable" : `${value >= 0 ? "+" : ""}${value}`;
}

function formatRatio(value: number | null) {
  return value === null ? "unavailable" : `${value.toFixed(2)}x`;
}

function formatCount(value: number | null, suffix: string) {
  return value === null ? "unavailable" : `${Math.round(value)}${suffix}`;
}

function marketCapClass(value: number | null) {
  if (value === null) return "規模未取得";
  if (value >= 200_000_000_000) return "大型";
  if (value >= 10_000_000_000) return "中型";
  return "小型";
}

function formatPrice(market: SectorMarketSeries) {
  if (market.price === null) return "unavailable";
  const currency = market.currency ? `${market.currency} ` : "";
  return `${currency}${market.price.toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
