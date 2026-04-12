'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, SeriesMarker, Time } from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { format, parse } from 'date-fns';

interface ExecutionChartProps {
  symbol: string;
  side: string; // 'Buy' or 'Sell'
  entryPrice: number;
  exitPrice: number;
  entryTime: string; // Date string or timestamp
  exitTime: string; 
  netPnl: number;
}

export const ExecutionChart: React.FC<ExecutionChartProps> = ({
  symbol,
  side,
  entryPrice,
  exitPrice,
  entryTime,
  exitTime,
  netPnl,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isDark = theme === 'dark';
    const backgroundColor = isDark ? '#0A0A0A' : '#FFFFFF';
    const textColor = isDark ? '#D1D5DB' : '#1F2937';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: gridColor,
      },
      rightPriceScale: {
        borderColor: gridColor,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Mock Candle Data generation centered around trade execution
    // In a real app, this would be fetched from a Market Data API
    const generateMockData = () => {
      const data = [];
      const startTime = new Date(entryTime).getTime() - 3600000; // 1 hour before
      const endTime = new Date(exitTime).getTime() + 3600000; // 1 hour after
      
      let currentPrice = entryPrice;
      let currentTime = startTime;
      
      while (currentTime < endTime) {
        const change = (Math.random() - 0.5) * (entryPrice * 0.002);
        const open = currentPrice;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * (entryPrice * 0.001);
        const low = Math.min(open, close) - Math.random() * (entryPrice * 0.001);
        
        data.push({
          time: (currentTime / 1000) as Time,
          open,
          high,
          low,
          close,
        });
        
        currentPrice = close;
        currentTime += 60000; // 1 minute candle
      }
      return data;
    };

    const data = generateMockData();
    candlestickSeries.setData(data);

    // Add Entry/Exit Markers (Arrows)
    const markers: SeriesMarker<Time>[] = [
      {
        time: (new Date(entryTime).getTime() / 1000) as Time,
        position: side.toLowerCase() === 'buy' ? 'belowBar' : 'aboveBar',
        color: side.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        shape: side.toLowerCase() === 'buy' ? 'arrowUp' : 'arrowDown',
        text: `ENTRY @ ${entryPrice}`,
      },
      {
        time: (new Date(exitTime).getTime() / 1000) as Time,
        position: side.toLowerCase() === 'buy' ? 'aboveBar' : 'belowBar',
        color: side.toLowerCase() === 'buy' ? '#EF4444' : '#10B981',
        shape: side.toLowerCase() === 'buy' ? 'arrowDown' : 'arrowUp',
        text: `EXIT @ ${exitPrice}`,
      },
    ];

    candlestickSeries.setMarkers(markers);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [theme, entryTime, exitTime, entryPrice, exitPrice, side]);

  return (
    <div className="w-full relative group">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="px-3 py-1.5 bg-background/80 backdrop-blur-md border border-border/50 rounded-md shadow-sm">
          <span className="text-[11px] font-black tracking-widest text-foreground/70 uppercase">{symbol}</span>
          <span className="mx-2 text-border">|</span>
          <span className="text-[11px] font-bold text-indigo-500 uppercase">1M Chart</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px] border border-border/10 rounded-xl overflow-hidden shadow-inner" />
      <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[9px] font-black text-muted-foreground uppercase bg-background/40 backdrop-blur-sm px-2 py-1 rounded">
          TradingView Lightweight Engine
        </div>
      </div>
    </div>
  );
};
