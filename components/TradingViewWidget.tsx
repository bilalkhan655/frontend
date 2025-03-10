"use client";
import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  market: string;
}

export default function TradingViewWidget({ market }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Pehle se koi widget loaded ho to remove kar do
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: market,
      width: "100%",
      height: "500",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      toolbar_bg: "#f1f3f6",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      container_id: "tradingview_widget",
    });

    containerRef.current.appendChild(script);
  }, [market]);

  return <div ref={containerRef} id="tradingview_widget" />;
}
