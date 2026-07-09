"use client";

import { useEffect, useRef } from "react";

const config = {
  symbols: [
    { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
    { proName: "NASDAQ:NDX", title: "NASDAQ 100" },
    { proName: "TVC:US10Y", title: "US 10Y" },
    { proName: "CBOE:VIX", title: "VIX" },
    { proName: "TVC:DXY", title: "DXY" },
    { proName: "OANDA:XAUUSD", title: "Gold" },
    { proName: "FX_IDC:USDJPY", title: "USD/JPY" },
    { proName: "OSE:NK2251!", title: "日経225先物" },
    { proName: "ECONOMICS:USNFP", title: "米雇用統計 NFP" },
    { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  ],
  showSymbolLogo: false,
  isTransparent: true,
  displayMode: "adaptive",
  colorTheme: "dark",
  locale: "ja",
};

export function TopTickerBar() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.textContent = JSON.stringify(config);
    container.append(widget, script);

    return () => container.replaceChildren();
  }, []);

  return (
    <header className="tradingview-ticker-shell">
      <div
        ref={containerRef}
        className="tradingview-widget-container min-h-[54px]"
        aria-label="TradingView市場ティッカー"
      />
    </header>
  );
}
