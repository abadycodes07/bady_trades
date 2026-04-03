'use client';

// src/app/(app)/news/page.tsx
// Live Market News — server-cached, sentiment arrows, symbol tabs, auto-Arabic

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ExternalLink, RefreshCw, Radio, Globe, Zap, TrendingUp,
  TrendingDown, Minus, Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: number;
  url: string;
  image?: string;
  isLive?: boolean;
  category?: string;
  sentiment?: 'up' | 'down' | 'neutral';
}

// ─── Symbol tabs config ───────────────────────────────────────────────────────
const TABS = [
  { key: 'gold',   label: 'Gold',   emoji: '🥇', description: 'XAU/USD · COMEX',    fast: true },
  { key: 'oil',    label: 'Oil',    emoji: '🛢',  description: 'WTI · Brent',        fast: false },
  { key: 'nasdaq', label: 'NASDAQ', emoji: '📈',  description: 'NQ · Tech Stocks',   fast: false },
  { key: 'forex',  label: 'Forex',  emoji: '💱',  description: 'EUR/USD · DXY',      fast: false },
  { key: 'crypto', label: 'Crypto', emoji: '₿',   description: 'BTC · ETH',          fast: false },
];

// ─── Client-side translation (MyMemory free — no key) ─────────────────────────
const translationCache = new Map<string, string>();

async function translateText(text: string, to: string): Promise<string> {
  if (!text || text.length < 3) return text;
  const cacheKey = `${to}:${text.slice(0, 50)}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|${to}`
    );
    const data = await res.json();
    const translated = data?.responseData?.translatedText ?? text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SOURCE_COLORS: Record<string, string> = {
  Reuters: 'bg-orange-500', Bloomberg: 'bg-blue-600', CNBC: 'bg-blue-500',
  'Financial Times': 'bg-pink-700', MarketWatch: 'bg-green-600',
  Kitco: 'bg-yellow-600', GNews: 'bg-purple-600', Finnhub: 'bg-cyan-600',
};
function srcColor(source: string) {
  return SOURCE_COLORS[source] ?? 'bg-slate-600';
}

function SentimentArrow({ sentiment }: { sentiment?: 'up' | 'down' | 'neutral' }) {
  if (!sentiment || sentiment === 'neutral') {
    return <Minus className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />;
  }
  if (sentiment === 'up') {
    return (
      <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-green-500/10">
        <TrendingUp className="h-4 w-4 text-green-500" />
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-red-500/10">
      <TrendingDown className="h-4 w-4 text-red-500" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewsPage() {
  const { t, isArabic } = useLanguage();

  const [activeTab, setActiveTab] = useState('gold');
  const [newsByTab, setNewsByTab] = useState<Record<string, NewsItem[]>>({ gold: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // Translation — auto on when site is Arabic, otherwise toggle
  const [translateEnabled, setTranslateEnabled] = useState(isArabic);
  const [translateTo, setTranslateTo] = useState(isArabic ? 'ar' : 'ar');
  const [translatedItems, setTranslatedItems] = useState<Map<string, { headline: string; summary: string }>>(new Map());
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());

  const isFetchingRef = useRef<Record<string, boolean>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync auto-translate with site language
  useEffect(() => {
    setTranslateEnabled(isArabic);
  }, [isArabic]);

  // Fetch news for a given symbol via server-cached API route
  const fetchNews = useCallback(async (symbol: string, manual = false) => {
    if (isFetchingRef.current[symbol]) return;
    isFetchingRef.current[symbol] = true;
    if (manual && symbol === activeTab) setRefreshing(true);

    try {
      const res = await fetch(`/api/news?symbol=${symbol}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      setNewsByTab(prev => ({
        ...prev,
        [symbol]: data.items ?? [],
      }));
      if (symbol === activeTab) {
        setLastUpdated(new Date());
        setFromCache(data.fromCache ?? false);
        setLoading(false);
      }
    } catch {
      if (symbol === activeTab) setLoading(false);
    } finally {
      isFetchingRef.current[symbol] = false;
      if (manual && symbol === activeTab) setRefreshing(false);
    }
  }, [activeTab]);

  // On tab change — show existing cache immediately, then refresh
  useEffect(() => {
    setLoading(!(newsByTab[activeTab]?.length > 0));
    fetchNews(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Initial gold fetch + 30s polling for gold, 60s for others
  useEffect(() => {
    fetchNews('gold');
    const goldInterval = setInterval(() => fetchNews('gold'), 30_000);
    const otherInterval = setInterval(() => {
      TABS.filter(t => t.key !== 'gold' && newsByTab[t.key] !== undefined)
        .forEach(t => fetchNews(t.key));
    }, 60_000);
    return () => {
      clearInterval(goldInterval);
      clearInterval(otherInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const news = newsByTab[activeTab] ?? [];

  // ─── Auto-translate when enabled ─────────────────────────────────────────
  useEffect(() => {
    if (!translateEnabled) return;
    const toTranslate = news.slice(0, 20).filter(a => !translatedItems.has(a.id));
    if (toTranslate.length === 0) return;

    (async () => {
      for (const item of toTranslate) {
        if (translatingIds.has(item.id)) continue;
        setTranslatingIds(prev => new Set(prev).add(item.id));
        const [h, s] = await Promise.all([
          translateText(item.headline, translateTo),
          translateText(item.summary, translateTo),
        ]);
        setTranslatedItems(prev => new Map(prev).set(item.id, { headline: h, summary: s }));
        setTranslatingIds(prev => { const ns = new Set(prev); ns.delete(item.id); return ns; });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateEnabled, news.length, activeTab, translateTo]);

  const getDisplay = (item: NewsItem) => {
    if (!translateEnabled) return { headline: item.headline, summary: item.summary };
    const tr = translatedItems.get(item.id);
    if (tr) return tr;
    if (translatingIds.has(item.id)) return { headline: '· · ·', summary: '· · ·' };
    return { headline: item.headline, summary: item.summary };
  };

  const activeTabInfo = TABS.find(t => t.key === activeTab)!;
  const isRtl = translateEnabled && translateTo === 'ar';

  return (
    <div className="flex flex-col gap-5 animate-fade-in-up max-w-5xl mx-auto" dir={isArabic ? 'rtl' : 'ltr'}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <span className="text-xl">{activeTabInfo.emoji}</span>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"/>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('Live Gold News')} — {activeTabInfo.label}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-yellow-500"/>
              {lastUpdated ? `Updated ${timeAgo(lastUpdated.getTime())}` : 'Loading...'}
              {fromCache && (
                <span className="flex items-center gap-0.5 text-green-500">
                  <Server className="h-3 w-3"/> cached
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Translate toggle */}
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="translate-toggle" className="text-sm cursor-pointer select-none">
              {t('Translate to Arabic')}
            </Label>
            <Switch
              id="translate-toggle"
              checked={translateEnabled}
              onCheckedChange={setTranslateEnabled}
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => fetchNews(activeTab, true)} disabled={refreshing} className="hover-effect">
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            {refreshing ? t('Refreshing...') : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Symbol tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-200 hover:border-primary/50',
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            )}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {tab.fast && (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"/>
              </span>
            )}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-1 whitespace-nowrap">{activeTabInfo.description}</span>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: <TrendingUp className="h-4 w-4 text-green-500"/>, label: 'Articles', value: news.length },
          { icon: <TrendingUp className="h-3.5 w-3.5 text-green-500"/>, label: '↑ Bullish', value: news.filter(n => n.sentiment === 'up').length },
          { icon: <TrendingDown className="h-3.5 w-3.5 text-red-500"/>, label: '↓ Bearish', value: news.filter(n => n.sentiment === 'down').length },
          { icon: <Zap className="h-4 w-4 text-yellow-500"/>, label: 'Sources', value: new Set(news.map(n => n.source)).size },
        ].map(stat => (
          <div key={stat.label} className="bg-card border rounded-lg p-2.5 flex items-center gap-2">
            {stat.icon}
            <div>
              <p className="text-base font-bold leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── News feed ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 flex gap-4">
              <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-7 rounded-full flex-shrink-0 self-center" />
            </div>
          ))
        ) : news.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
            <div className="text-4xl mb-3">📰</div>
            <p className="font-medium">{t('No news available')}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchNews(activeTab, true)}>
              Try again
            </Button>
          </div>
        ) : (
          news.map(item => {
            const display = getDisplay(item);
            const isTranslated = translateEnabled && translatedItems.has(item.id);
            const isTranslating = translatingIds.has(item.id);

            return (
              <article
                key={item.id}
                className="group bg-card border rounded-xl p-4 flex gap-3 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {/* Source badge */}
                <div className={cn(
                  'h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold',
                  srcColor(item.source)
                )}>
                  {item.source.slice(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">{item.source}</span>
                    {item.isLive && (
                      <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 animate-pulse">{t('LIVE')}</Badge>
                    )}
                    {isTranslated && !isTranslating && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-yellow-500 border-yellow-500/50">
                        🌐 {translateTo.toUpperCase()}
                      </Badge>
                    )}
                    {isTranslating && (
                      <span className="text-[10px] text-muted-foreground animate-pulse">translating…</span>
                    )}
                  </div>

                  <h3 className={cn(
                    'font-semibold text-sm leading-snug mb-1 group-hover:text-primary transition-colors',
                    isRtl ? 'text-right' : ''
                  )}>
                    {display.headline || item.headline}
                  </h3>

                  {display.summary && display.summary !== '· · ·' && (
                    <p className={cn('text-xs text-muted-foreground line-clamp-2', isRtl ? 'text-right' : '')}>
                      {display.summary}
                    </p>
                  )}
                </div>

                {/* Right side: time + sentiment + link */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {timeAgo(item.publishedAt)}
                  </span>

                  {/* Sentiment arrow */}
                  <SentimentArrow sentiment={item.sentiment} />

                  {/* External link */}
                  {item.url && item.url !== '#' && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
