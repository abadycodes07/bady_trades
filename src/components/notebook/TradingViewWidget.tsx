
// src/components/notebook/TradingViewWidget.tsx
'use client';

import React, { useEffect, useRef, memo } from 'react';
import type { Theme } from 'next-themes'; // Or your specific theme type

interface TradingViewWidgetProps {
  symbol: string;
  theme?: Theme | string; // Allow string for 'light'/'dark'
  className?: string;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol, theme = 'dark', className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptAddedRef = useRef(false); // To prevent adding script multiple times

  useEffect(() => {
    if (!containerRef.current || scriptAddedRef.current) {
      return;
    }

    // Clear any existing widget if symbol or theme changes (though this component is memoized)
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig = {
      autosize: true,
      symbol: symbol || "NASDAQ:AAPL", // Fallback to AAPL if symbol is not provided
      interval: "D",
      timezone: "America/New_York",
      theme: theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme,
      style: "1",
      locale: "en",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com",
    };

    script.innerHTML = JSON.stringify(widgetConfig);

    containerRef.current.appendChild(script);
    scriptAddedRef.current = true;

    // Clean up the script when the component unmounts or symbol/theme changes
    return () => {
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
      scriptAddedRef.current = false;
    };
  }, [symbol, theme]); // Re-run effect if symbol or theme changes

  return (
    <div className={`tradingview-widget-container ${className || ''}`} ref={containerRef} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
