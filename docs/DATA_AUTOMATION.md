# Data automation matrix

The dashboard distinguishes the retrieval interval from the publication interval. A page refresh can revalidate a source, but it cannot create a new observation before the source publishes one.

## Automatic public data

| Area | Source | Behavior |
| --- | --- | --- |
| Credit spreads, rates, employment, deposits, MMF, lending standards and household credit | FRED | Revalidated automatically; the observation changes only when FRED publishes it |
| Treasury auctions | U.S. Fiscal Data | Retrieved automatically with a checked manual fallback |
| SOFR | FRED, then New York Fed fallback | Retrieved automatically |
| MOVE and listed market prices | Yahoo chart endpoint | Market-day retrieval with cache |
| Margin Debt / M2 | FINRA Margin Statistics + FRED M2SL | FINRA HTML is parsed after monthly publication; M2 is aligned automatically |
| Margin Debt / GDP | FINRA Margin Statistics + FRED GDP | Monthly margin debt is aligned to the latest available quarterly GDP |
| Bank capital proxy | FRED BOGZ1FL010000016Q | Quarterly Tier 1 capital/risk-weighted assets proxy; this is not exact CET1 |
| FDIC Deposit Insurance Fund | FDIC Quarterly Banking Profile | Latest official statement is discovered and parsed after quarterly publication |
| Bank failures | FDIC Bank Failures API | Revalidated automatically |
| News | GDELT and official RSS feeds | Revalidated automatically; duplicate and freshness checks apply |
| Smart Money holdings | SEC 13F | Retrieved automatically, but 13F can be up to 45 days late |
| Sector prices and Hidden Gems | Yahoo/yfinance daily batch | Daily pipeline; failed runs keep the last valid JSON |

## Hybrid data

| Area | Automatic part | Non-automatic part |
| --- | --- | --- |
| Global Risk Map | Listed market-price pulse | Regional policy, property and geopolitical baseline in `data/global-risk.json` |
| Contagion Watch | FRED bank-to-nonbank credit, listed BDC/OWL prices and HY OAS | BDC non-accrual, private-fund NAV, redemption requests, asset sales and quarterly NAV per share |
| Sector Momentum | Prices and available yfinance fundamentals | Orders, backlog, analyst revisions, fund flows and social/search inputs when no permitted free feed exists |

## Verified published values without automatic retrieval

- Office and total CMBS delinquency
- Private-credit default rate
- PIK ratio
- Leveraged-loan default rate
- Shiller CAPE
- Buffett Indicator

These values are stored in `src/data/published-indicators.json` or `src/data/manual-indicators.json`. Their UI metadata explicitly says that automatic retrieval is not available.

## Editorial or qualitative inputs

- `data/crisis-behavior.json`
- Similar historical regimes and asset-temperature commentary
- Regional summaries in `data/global-risk.json`
- FOMC stance, NFP revisions, shale breakeven and energy-credit route assumptions
- Update calendar dates that are not exposed through a stable official calendar feed

These inputs must not be presented as live measurements. Unknown values remain `unavailable`; the application does not invent estimates.

## Operating rule

Public-source failures fall back only to a dated, labeled value. Proprietary or non-standardized data remains unavailable until a verified publication is entered. “Automatic” means automatic retrieval after publication, not tick-by-tick real-time data.
