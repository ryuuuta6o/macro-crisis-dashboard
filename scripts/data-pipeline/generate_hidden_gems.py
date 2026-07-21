from __future__ import annotations

import json
import math
import os
import re
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf


ROOT = Path(__file__).resolve().parents[2]
THEMES_FILE = ROOT / "src" / "config" / "themes.ts"
NOTES_FILE = ROOT / "src" / "config" / "company-notes.ts"
OUTPUT_FILE = ROOT / "public" / "data" / "hidden-gems.json"
METHODOLOGY_VERSION = "hidden-gems-free-v1"
SLEEP_SECONDS = float(os.getenv("YFINANCE_SLEEP_SECONDS", "1.25"))
MIN_SUCCESS_RATIO = float(os.getenv("HIDDEN_GEMS_MIN_SUCCESS_RATIO", "0.35"))
MIN_MARKET_CAP = 100_000_000
MIN_REVENUE_CAGR = 10.0
MAX_THREE_MONTH_RETURN = 50.0


@dataclass
class CompanyRef:
    ticker: str
    name: str
    region: str
    country_code: str
    country_name: str
    exchange: str
    themes: list[dict[str, str]]
    business_summary: str


def safe_float(value: Any) -> float | None:
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return min(maximum, max(minimum, value))


def percent_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous in (None, 0):
        return None
    return ((current - previous) / abs(previous)) * 100.0


def cagr(current: float | None, oldest: float | None, years: int) -> float | None:
    if current is None or oldest is None or current <= 0 or oldest <= 0 or years <= 0:
        return None
    return (pow(current / oldest, 1.0 / years) - 1.0) * 100.0


def ratio_percent(value: float | None) -> float | None:
    if value is None:
        return None
    return value * 100.0 if abs(value) <= 2 else value


def parse_company_notes() -> dict[str, str]:
    notes: dict[str, str] = {}
    pattern = re.compile(
        r'^\s*(?:"(?P<quoted>[^"]+)"|(?P<plain>[A-Z0-9.^=-]+)):\s*"(?P<note>[^"]+)"'
    )
    for line in NOTES_FILE.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match:
            notes[match.group("quoted") or match.group("plain")] = match.group("note")
    return notes


def parse_theme_universe() -> list[CompanyRef]:
    text = THEMES_FILE.read_text(encoding="utf-8")
    theme_pattern = re.compile(
        r'\{\s*id:\s*"(?P<id>[^"]+)".*?nameJa:\s*"(?P<name_ja>[^"]+)".*?'
        r'displayMode:\s*"theme".*?companies:\s*\[(?P<companies>.*?)\]\s*,?\s*\}',
        re.DOTALL,
    )
    company_pattern = re.compile(
        r'intl\("(?P<ticker>[^"]+)",\s*"(?P<name>[^"]+)",\s*"(?P<region>[^"]+)",\s*'
        r'"(?P<country_code>[^"]+)",\s*"(?P<country_name>[^"]+)",\s*"(?P<exchange>[^"]+)"'
        r'(?:,\s*"(?P<subcategory>[^"]+)")?\)'
    )
    notes = parse_company_notes()
    companies: dict[str, CompanyRef] = {}
    for theme_match in theme_pattern.finditer(text):
        theme = {
            "id": theme_match.group("id"),
            "nameJa": theme_match.group("name_ja"),
        }
        for match in company_pattern.finditer(theme_match.group("companies")):
            ticker = match.group("ticker")
            existing = companies.get(ticker)
            if existing:
                existing.themes.append(theme)
                continue
            companies[ticker] = CompanyRef(
                ticker=ticker,
                name=match.group("name"),
                region=match.group("region"),
                country_code=match.group("country_code"),
                country_name=match.group("country_name"),
                exchange=match.group("exchange"),
                themes=[theme],
                business_summary=notes.get(ticker, "事業内容データなし"),
            )
    if not companies:
        raise RuntimeError("No companies were parsed from src/config/themes.ts")
    return list(companies.values())


def dataframe_row(frame: pd.DataFrame, labels: list[str]) -> pd.Series | None:
    if frame is None or frame.empty:
        return None
    for label in labels:
        if label in frame.index:
            return frame.loc[label]
    return None


def value_at(series: pd.Series | None, column: Any) -> float | None:
    if series is None or column not in series.index:
        return None
    return safe_float(series[column])


def annual_history(income: pd.DataFrame) -> list[dict[str, Any]]:
    if income is None or income.empty:
        return []
    columns = sorted(income.columns, reverse=True)
    revenue = dataframe_row(
        income, ["Total Revenue", "TotalRevenue", "Operating Revenue", "OperatingRevenue"]
    )
    operating = dataframe_row(income, ["Operating Income", "OperatingIncome"])
    net_income = dataframe_row(
        income,
        [
            "Net Income",
            "NetIncome",
            "Net Income Common Stockholders",
            "NetIncomeCommonStockholders",
        ],
    )
    eps = dataframe_row(income, ["Diluted EPS", "DilutedEPS", "Basic EPS", "BasicEPS"])
    history = []
    for column in columns:
        year = str(getattr(column, "year", str(column)[:4]))
        history.append(
            {
                "year": year,
                "revenue": value_at(revenue, column),
                "operatingIncome": value_at(operating, column),
                "netIncome": value_at(net_income, column),
                "eps": value_at(eps, column),
            }
        )
    return history


def price_return(history: pd.DataFrame, trading_days: int) -> float | None:
    if history is None or history.empty or "Close" not in history:
        return None
    close = history["Close"].dropna()
    if len(close) <= trading_days:
        return None
    return percent_change(safe_float(close.iloc[-1]), safe_float(close.iloc[-trading_days - 1]))


def compute_roic(income: pd.DataFrame, balance: pd.DataFrame) -> float | None:
    if income is None or income.empty or balance is None or balance.empty:
        return None
    column = income.columns[0]
    balance_column = balance.columns[0]
    operating_income = value_at(
        dataframe_row(income, ["Operating Income", "OperatingIncome"]), column
    )
    tax = value_at(dataframe_row(income, ["Tax Provision", "TaxProvision"]), column)
    pretax = value_at(dataframe_row(income, ["Pretax Income", "PretaxIncome"]), column)
    total_debt = value_at(
        dataframe_row(balance, ["Total Debt", "TotalDebt"]), balance_column
    )
    equity = value_at(
        dataframe_row(
            balance,
            [
                "Stockholders Equity",
                "StockholdersEquity",
                "Total Equity Gross Minority Interest",
                "TotalEquityGrossMinorityInterest",
            ],
        ),
        balance_column,
    )
    cash = value_at(
        dataframe_row(
            balance,
            [
                "Cash Cash Equivalents And Short Term Investments",
                "CashCashEquivalentsAndShortTermInvestments",
                "Cash And Cash Equivalents",
                "CashAndCashEquivalents",
            ],
        ),
        balance_column,
    )
    if operating_income is None or equity is None:
        return None
    tax_rate = clamp((tax / pretax) if tax is not None and pretax not in (None, 0) else 0.21, 0, 0.5)
    invested_capital = (total_debt or 0) + equity - (cash or 0)
    if invested_capital <= 0:
        return None
    return (operating_income * (1 - tax_rate) / invested_capital) * 100.0


def fetch_company(ref: CompanyRef) -> dict[str, Any]:
    record: dict[str, Any] = {
        "ticker": ref.ticker,
        "companyName": ref.name,
        "businessSummary": ref.business_summary,
        "countryCode": ref.country_code,
        "countryName": ref.country_name,
        "region": ref.region,
        "exchange": ref.exchange,
        "themes": ref.themes,
        "primaryThemeId": ref.themes[0]["id"],
        "primaryThemeName": ref.themes[0]["nameJa"],
        "sourceName": "Yahoo Finance via yfinance",
        "status": "unavailable",
        "error": None,
    }
    try:
        ticker = yf.Ticker(ref.ticker)
        income = ticker.get_income_stmt(freq="yearly")
        balance = ticker.get_balance_sheet(freq="yearly")
        cash_flow = ticker.get_cash_flow(freq="yearly")
        price_history = ticker.history(period="5y", interval="1d", auto_adjust=True)
        info = ticker.get_info() or {}
        history = annual_history(income)
        record["companyName"] = info.get("longName") or info.get("shortName") or ref.name
        record["businessSummary"] = info.get("longBusinessSummary") or ref.business_summary
        record["revenueHistory"] = history
        record["marketCapLocal"] = safe_float(info.get("marketCap"))
        record["marketCapCurrency"] = info.get("currency") or "USD"
        record["financialCurrency"] = info.get("financialCurrency") or info.get("currency") or None
        record["marketCapUsd"] = None
        record["peRatio"] = safe_float(info.get("forwardPE") or info.get("trailingPE"))
        record["priceToSalesRatio"] = safe_float(info.get("priceToSalesTrailing12Months"))
        record["return3m"] = price_return(price_history, 63)
        record["return6m"] = price_return(price_history, 126)
        record["price"] = safe_float(price_history["Close"].dropna().iloc[-1]) if not price_history.empty else None
        revenues = [item["revenue"] for item in history if item["revenue"] is not None]
        cagr_years = len(revenues) - 1
        record["revenueCagrYears"] = cagr_years if cagr_years > 0 else None
        record["revenueCagr5y"] = cagr(revenues[0], revenues[-1], cagr_years) if cagr_years > 0 else None
        record["revenueGrowthYoY"] = (
            percent_change(revenues[0], revenues[1]) if len(revenues) >= 2 else None
        )
        latest = history[0] if history else {}
        previous = history[1] if len(history) >= 2 else {}
        latest_revenue = latest.get("revenue")
        latest_operating = latest.get("operatingIncome")
        previous_revenue = previous.get("revenue")
        previous_operating = previous.get("operatingIncome")
        record["operatingMargin"] = (
            (latest_operating / latest_revenue) * 100.0
            if latest_operating is not None and latest_revenue not in (None, 0)
            else None
        )
        previous_margin = (
            (previous_operating / previous_revenue) * 100.0
            if previous_operating is not None and previous_revenue not in (None, 0)
            else None
        )
        record["operatingMarginChange"] = (
            record["operatingMargin"] - previous_margin
            if record["operatingMargin"] is not None and previous_margin is not None
            else None
        )
        eps_values = [item["eps"] for item in history if item["eps"] is not None]
        eps_years = len(eps_values) - 1
        record["epsGrowthYoY"] = (
            percent_change(eps_values[0], eps_values[1]) if len(eps_values) >= 2 else None
        )
        record["epsCagr5y"] = (
            cagr(eps_values[0], eps_values[-1], eps_years) if eps_years > 0 else None
        )
        record["revenueLatest"] = latest_revenue
        record["netIncomeLatest"] = latest.get("netIncome")
        record["grossMargin"] = ratio_percent(safe_float(info.get("grossMargins")))
        record["roic"] = compute_roic(income, balance)
        record["roe"] = ratio_percent(safe_float(info.get("returnOnEquity")))
        record["dividendYield"] = safe_float(info.get("dividendYield"))
        record["institutionalOwnership"] = ratio_percent(
            safe_float(info.get("heldPercentInstitutions"))
        )
        shares_short = safe_float(info.get("sharesShort"))
        shares_outstanding = safe_float(info.get("sharesOutstanding"))
        record["shortInterest"] = (
            (shares_short / shares_outstanding) * 100.0
            if shares_short is not None and shares_outstanding not in (None, 0)
            else None
        )
        record["beta"] = safe_float(info.get("beta"))
        analyst_coverage = safe_float(info.get("numberOfAnalystOpinions"))
        record["analystCoverage"] = (
            int(analyst_coverage) if analyst_coverage is not None else None
        )
        record["freeCashFlow"] = None
        record["shareRepurchases"] = None
        if cash_flow is not None and not cash_flow.empty:
            cash_column = cash_flow.columns[0]
            record["freeCashFlow"] = value_at(
                dataframe_row(cash_flow, ["Free Cash Flow", "FreeCashFlow"]),
                cash_column,
            )
            repurchases = value_at(
                dataframe_row(
                    cash_flow,
                    [
                        "Repurchase Of Capital Stock",
                        "RepurchaseOfCapitalStock",
                        "Repurchase Of Stock",
                        "RepurchaseOfStock",
                    ],
                ),
                cash_column,
            )
            record["shareRepurchases"] = abs(repurchases) if repurchases is not None else None
        if balance is not None and not balance.empty:
            balance_column = balance.columns[0]
            total_debt = value_at(
                dataframe_row(balance, ["Total Debt", "TotalDebt"]), balance_column
            )
            equity = value_at(
                dataframe_row(
                    balance,
                    [
                        "Stockholders Equity",
                        "StockholdersEquity",
                        "Total Equity Gross Minority Interest",
                        "TotalEquityGrossMinorityInterest",
                    ],
                ),
                balance_column,
            )
            record["debtToEquity"] = (
                total_debt / equity if total_debt is not None and equity not in (None, 0) else None
            )
        else:
            record["debtToEquity"] = None
        record["backlog"] = None
        record["backlogGrowth"] = None
        record["updatedAt"] = datetime.now(timezone.utc).isoformat()
        record["status"] = "available" if history and record["marketCapLocal"] else "unavailable"
    except Exception as error:
        record["error"] = f"{type(error).__name__}: {str(error)[:240]}"
        record["revenueHistory"] = []
    return record


def apply_usd_market_caps(records: list[dict[str, Any]]) -> None:
    currencies = {
        record.get("marketCapCurrency")
        for record in records
        if record.get("marketCapLocal") is not None
    }
    rates: dict[str, float] = {"USD": 1.0}
    for currency in sorted(value for value in currencies if value and value != "USD"):
        normalized = "GBP" if currency == "GBp" else currency
        try:
            history = yf.Ticker(f"{normalized}USD=X").history(period="5d", interval="1d")
            close = history["Close"].dropna()
            if not close.empty:
                rate = safe_float(close.iloc[-1])
                if rate is not None:
                    rates[currency] = rate / 100.0 if currency == "GBp" else rate
        except Exception as error:
            print(f"FX unavailable for {currency}: {error}", file=sys.stderr)
    for record in records:
        local_cap = record.get("marketCapLocal")
        rate = rates.get(record.get("marketCapCurrency"))
        record["marketCapUsd"] = local_cap * rate if local_cap is not None and rate is not None else None


def median(values: list[float]) -> float | None:
    available = sorted(value for value in values if value is not None and value > 0)
    if not available:
        return None
    middle = len(available) // 2
    return (
        (available[middle - 1] + available[middle]) / 2.0
        if len(available) % 2 == 0
        else available[middle]
    )


def weighted_score(parts: list[tuple[float | None, float]]) -> int:
    available = [(score, weight) for score, weight in parts if score is not None]
    if not available:
        return 0
    weight_sum = sum(weight for _, weight in available)
    return round(sum(score * weight for score, weight in available) / weight_sum)


def build_theme_medians(records: list[dict[str, Any]]) -> dict[str, dict[str, float | None]]:
    buckets: dict[str, dict[str, list[float]]] = {}
    for record in records:
        for theme in record["themes"]:
            bucket = buckets.setdefault(theme["id"], {"pe": [], "ps": []})
            if record.get("peRatio") and record["peRatio"] > 0:
                bucket["pe"].append(record["peRatio"])
            if record.get("priceToSalesRatio") and record["priceToSalesRatio"] > 0:
                bucket["ps"].append(record["priceToSalesRatio"])
    return {
        theme_id: {"pe": median(bucket["pe"]), "ps": median(bucket["ps"])}
        for theme_id, bucket in buckets.items()
    }


def relative_valuation(record: dict[str, Any], theme_median: dict[str, float | None]) -> float | None:
    pe = record.get("peRatio")
    median_pe = theme_median.get("pe")
    if pe and pe > 0 and median_pe and median_pe > 0:
        return pe / median_pe
    ps = record.get("priceToSalesRatio")
    median_ps = theme_median.get("ps")
    if ps and ps > 0 and median_ps and median_ps > 0:
        return ps / median_ps
    return None


def score_record(record: dict[str, Any], theme_medians: dict[str, dict[str, float | None]]) -> None:
    cagr_value = record.get("revenueCagr5y")
    revenue_growth = record.get("revenueGrowthYoY")
    margin = record.get("operatingMargin")
    margin_change = record.get("operatingMarginChange")
    acceleration = (
        revenue_growth - cagr_value
        if revenue_growth is not None and cagr_value is not None
        else None
    )
    margin_level = clamp((margin / 30.0) * 100.0) if margin is not None else None
    margin_improvement = clamp(50.0 + margin_change * 8.0) if margin_change is not None else None
    margin_score = (
        margin_level * 0.7 + margin_improvement * 0.3
        if margin_level is not None and margin_improvement is not None
        else margin_level
    )
    fundamental_parts = [
        (clamp(((cagr_value - 10.0) / 20.0) * 100.0) if cagr_value is not None else None, 0.25),
        (clamp(50.0 + acceleration * 4.0) if acceleration is not None else None, 0.15),
        (margin_score, 0.20),
        (clamp((record["roic"] / 25.0) * 100.0) if record.get("roic") is not None else None, 0.20),
        (None, 0.10),
        (
            clamp(100.0 - record["debtToEquity"] * 40.0)
            if record.get("debtToEquity") is not None
            else None,
            0.10,
        ),
    ]
    theme_median = theme_medians.get(record["primaryThemeId"], {"pe": None, "ps": None})
    valuation_ratio = relative_valuation(record, theme_median)
    momentum_values = [
        value for value in [record.get("return3m"), record.get("return6m")] if value is not None
    ]
    momentum = sum(momentum_values) / len(momentum_values) if momentum_values else None
    market_cap = record.get("marketCapUsd")
    attention_parts = [
        (clamp(valuation_ratio * 50.0) if valuation_ratio is not None else None, 0.30),
        (clamp(((momentum + 20.0) / 70.0) * 100.0) if momentum is not None else None, 0.30),
        (None, 0.20),
        (
            clamp((math.log10(market_cap / MIN_MARKET_CAP) / 4.0) * 100.0)
            if market_cap and market_cap >= MIN_MARKET_CAP
            else None,
            0.20,
        ),
    ]
    record["fundamentalScore"] = weighted_score(fundamental_parts)
    record["attentionScore"] = weighted_score(attention_parts)
    record["gemScore"] = record["fundamentalScore"] - record["attentionScore"]
    record["valuationToThemeMedian"] = valuation_ratio
    record["fundamentalComponents"] = [
        {"id": "revenue-cagr", "label": "売上5年CAGR", "value": cagr_value, "score": fundamental_parts[0][0], "detail": f"取得期間{record.get('revenueCagrYears') or 0}年の年率換算"},
        {"id": "growth-acceleration", "label": "売上成長の加速", "value": acceleration, "score": fundamental_parts[1][0], "detail": "直近成長率とCAGRの差"},
        {"id": "operating-margin", "label": "営業利益率", "value": margin, "score": fundamental_parts[2][0], "detail": "利益率の水準と前年差"},
        {"id": "roic", "label": "ROIC", "value": record.get("roic"), "score": fundamental_parts[3][0], "detail": "推定NOPATと投下資本から算出"},
        {"id": "backlog", "label": "受注残の伸び", "value": None, "score": None, "detail": "手動補完対象"},
        {"id": "balance-sheet", "label": "財務健全性", "value": record.get("debtToEquity"), "score": fundamental_parts[5][0], "detail": "Debt/Equityで評価"},
    ]
    record["attentionComponents"] = [
        {"id": "valuation", "label": "相対バリュエーション", "value": valuation_ratio, "score": attention_parts[0][0], "detail": "テーマ内PERまたはPSR中央値との比較"},
        {"id": "price-momentum", "label": "株価モメンタム", "value": momentum, "score": attention_parts[1][0], "detail": "3ヶ月と6ヶ月の騰落率"},
        {"id": "analyst-coverage", "label": "アナリストカバレッジ", "value": None, "score": None, "detail": "無料構成では取得対象外"},
        {"id": "market-cap", "label": "時価総額", "value": market_cap, "score": attention_parts[3][0], "detail": "規模が大きいほど発見済みとして評価"},
    ]


def exclusion_reason(record: dict[str, Any]) -> str | None:
    if record.get("status") != "available":
        return "missingRequiredData"
    required = [
        record.get("revenueCagr5y"),
        record.get("operatingMargin"),
        record.get("marketCapUsd"),
        record.get("return3m"),
    ]
    if any(value is None for value in required):
        return "missingRequiredData"
    if record["revenueCagr5y"] < MIN_REVENUE_CAGR:
        return "lowRevenueGrowth"
    if record["operatingMargin"] <= 0:
        return "unprofitable"
    if record["marketCapUsd"] < MIN_MARKET_CAP:
        return "tooSmall"
    if record["return3m"] >= MAX_THREE_MONTH_RETURN:
        return "alreadySurged"
    return None


def format_percent(value: float | None) -> str:
    return "unavailable" if value is None else f"{value:+.1f}%"


def to_hidden_gem(record: dict[str, Any]) -> dict[str, Any]:
    reasons = [
        f"売上5年CAGR {format_percent(record.get('revenueCagr5y'))}",
        f"営業利益率 {format_percent(record.get('operatingMargin'))}",
    ]
    if record.get("revenueGrowthYoY") is not None and record["revenueGrowthYoY"] > record["revenueCagr5y"]:
        reasons.append(f"直近売上成長 {format_percent(record['revenueGrowthYoY'])}で加速")
    if record.get("roic") is not None:
        reasons.append(f"ROIC {format_percent(record['roic'])}")
    if record.get("valuationToThemeMedian") is not None:
        reasons.append(f"評価倍率はテーマ中央値の{record['valuationToThemeMedian']:.2f}倍")
    return {
        "ticker": record["ticker"],
        "companyName": record["companyName"],
        "businessSummary": record["businessSummary"],
        "countryCode": record["countryCode"],
        "countryName": record["countryName"],
        "region": record["region"],
        "exchange": record["exchange"],
        "themes": record["themes"],
        "primaryThemeId": record["primaryThemeId"],
        "primaryThemeName": record["primaryThemeName"],
        "gemScore": record["gemScore"],
        "fundamentalScore": record["fundamentalScore"],
        "attentionScore": record["attentionScore"],
        "revenueCagr5y": record["revenueCagr5y"],
        "revenueGrowthYoY": record.get("revenueGrowthYoY"),
        "operatingMargin": record["operatingMargin"],
        "roic": record.get("roic"),
        "forwardPE": record.get("peRatio"),
        "priceToSalesRatio": record.get("priceToSalesRatio"),
        "marketCapUsd": record["marketCapUsd"],
        "return3m": record["return3m"],
        "return6m": record.get("return6m"),
        "components": {
            "fundamentals": record["fundamentalComponents"],
            "attention": record["attentionComponents"],
        },
        "reasons": reasons,
        "sourceName": record["sourceName"],
        "updatedAt": record.get("updatedAt"),
    }


def previous_history() -> list[dict[str, Any]]:
    try:
        payload = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        history = payload.get("history", [])
        return history if isinstance(history, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def write_atomic(payload: dict[str, Any]) -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    json.loads(serialized)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=OUTPUT_FILE.parent, delete=False, suffix=".tmp"
    ) as handle:
        handle.write(serialized)
        temp_path = Path(handle.name)
    temp_path.replace(OUTPUT_FILE)


def main() -> int:
    universe = parse_theme_universe()
    print(f"Hidden Gems universe: {len(universe)} symbols")
    records = []
    for index, ref in enumerate(universe, start=1):
        print(f"[{index:03d}/{len(universe):03d}] {ref.ticker}", flush=True)
        records.append(fetch_company(ref))
        if index < len(universe):
            time.sleep(SLEEP_SECONDS)

    available_count = sum(record["status"] == "available" for record in records)
    success_ratio = available_count / len(records)
    if success_ratio < MIN_SUCCESS_RATIO:
        raise RuntimeError(
            f"Success ratio {success_ratio:.1%} is below safety threshold {MIN_SUCCESS_RATIO:.1%}. "
            "Existing JSON was preserved."
        )

    apply_usd_market_caps(records)
    medians = build_theme_medians(records)
    exclusions = {
        "missingRequiredData": 0,
        "lowRevenueGrowth": 0,
        "unprofitable": 0,
        "tooSmall": 0,
        "alreadySurged": 0,
    }
    items = []
    for record in records:
        if record["status"] == "available":
            score_record(record, medians)
        else:
            record["fundamentalScore"] = None
            record["attentionScore"] = None
            record["gemScore"] = None
        reason = exclusion_reason(record)
        if reason:
            exclusions[reason] += 1
            record["status"] = "unavailable" if reason == "missingRequiredData" else "excluded"
            record["exclusionReason"] = reason
        else:
            items.append(to_hidden_gem(record))
    items.sort(key=lambda item: item["gemScore"], reverse=True)

    now = datetime.now(timezone.utc).isoformat()
    date = now[:10]
    history = [entry for entry in previous_history() if entry.get("date") != date]
    history.append(
        {
            "date": date,
            "generatedAt": now,
            "methodologyVersion": METHODOLOGY_VERSION,
            "entries": [
                {
                    "ticker": item["ticker"],
                    "gemScore": item["gemScore"],
                    "fundamentalScore": item["fundamentalScore"],
                    "attentionScore": item["attentionScore"],
                    "price": next(
                        (record.get("price") for record in records if record["ticker"] == item["ticker"]),
                        None,
                    ),
                }
                for item in items
            ],
        }
    )
    payload = {
        "generatedAt": now,
        "methodologyVersion": METHODOLOGY_VERSION,
        "dataSource": "free",
        "status": "ready",
        "items": items,
        "evaluatedCompanies": len(records),
        "eligibleCompanies": len(items),
        "exclusions": exclusions,
        "history": history[-365:],
        "disclaimer": "これは状態の可視化であり、推奨ではありません。注目が低いことには、構造変化やガバナンス問題などの理由がある場合もあります。Gem Scoreは実態と注目の乖離であり、価格上昇の予測ではありません。",
        "dataNote": "Yahoo Financeの非公式データを日次バッチで取得しています。アナリスト予想と受注データは無料構成の採点対象外です。欠損値は推測しません。",
        "records": records,
    }
    write_atomic(payload)
    print(f"Wrote {OUTPUT_FILE}: {available_count} available, {len(items)} eligible")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Pipeline failed: {error}", file=sys.stderr)
        raise
