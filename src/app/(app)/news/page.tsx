'use client';

// src/app/(app)/news/page.tsx
// Live Gold News Feed — polls Finnhub + GNews, auto-refreshes every 5s
// Free tier: Finnhub 60 req/min, GNews 100 req/day

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, RefreshCw, Radio, Globe, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: number; // unix timestamp ms
  url: string;
  image?: string;
  isLive?: boolean;
  category?: string;
}

// ─── MyMemory Translation (free, no key needed) ───────────────────────────────
async function translateToArabic(text: string): Promise<string> {
  if (!text || text.length < 2) return text;
  try {
    const encoded = encodeURIComponent(text.slice(0, 500));
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|ar`
    );
    const data = await res.json();
    return data?.responseData?.translatedText ?? text;
  } catch {
    return text;
  }
}

// ─── GNews free-tier (no key needed up to 100/day) ────────────────────────────
async function fetchGNews(): Promise<NewsItem[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GNEWS_API_KEY;
    const keyParam = apiKey ? `&apikey=${apiKey}` : '';
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=gold+XAU+forex&lang=en&max=20&sortby=publishedAt${keyParam}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles ?? []).map((a: any, i: number) => ({
      id: `gnews-${i}-${a.publishedAt}`,
      headline: a.title ?? '',
      summary: a.description ?? '',
      source: a.source?.name ?? 'GNews',
      publishedAt: new Date(a.publishedAt).getTime(),
      url: a.url ?? '#',
      image: a.image,
      isLive: false,
      category: 'Gold',
    }));
  } catch {
    return [];
  }
}

// ─── Finnhub news ─────────────────────────────────────────────────────────────
async function fetchFinnhub(): Promise<NewsItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const goldKeywords = /gold|xau|precious metal|bullion|comex|lbma/i;
    return (data ?? [])
      .filter((a: any) => goldKeywords.test(a.headline ?? '') || goldKeywords.test(a.summary ?? ''))
      .slice(0, 25)
      .map((a: any) => ({
        id: `fh-${a.id}`,
        headline: a.headline ?? '',
        summary: a.summary ?? '',
        source: a.source ?? 'Finnhub',
        publishedAt: (a.datetime ?? 0) * 1000,
        url: a.url ?? '#',
        image: a.image,
        isLive: false,
        category: 'Gold',
      }));
  } catch {
    return [];
  }
}

// ─── Merge + dedup + sort ─────────────────────────────────────────────────────
function mergeNews(existing: NewsItem[], incoming: NewsItem[]): NewsItem[] {
  const map = new Map<string, NewsItem>();
  [...existing, ...incoming].forEach(item => map.set(item.id, item));
  return Array.from(map.values()).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 100);
}

// ─── Time formatting ──────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Source color map ─────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  'Reuters': 'bg-orange-500',
  'Bloomberg': 'bg-blue-600',
  'CNBC': 'bg-blue-500',
  'Financial Times': 'bg-pink-700',
  'MarketWatch': 'bg-green-600',
  'Kitco': 'bg-yellow-600',
  'GNews': 'bg-purple-600',
  'Finnhub': 'bg-cyan-600',
};
function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? 'bg-slate-600';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewsPage() {
  const { t, isArabic } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [translatedItems, setTranslatedItems] = useState<Map<string, { headline: string; summary: string }>>(new Map());
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAll = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isManual) setRefreshing(true);

    try {
      const [gNews, fhNews] = await Promise.allSettled([fetchGNews(), fetchFinnhub()]);
      const gNewsItems = gNews.status === 'fulfilled' ? gNews.value : [];
      const fhItems = fhNews.status === 'fulfilled' ? fhNews.value : [];
      const combined = mergeNews([], [...fhItems, ...gNewsItems]);
      setNews(prev => mergeNews(prev, combined));
      setLastUpdated(new Date());
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchAll(false);
    intervalRef.current = setInterval(() => fetchAll(false), 30000); // every 30s
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  // Translate visible headlines when toggle turns on
  useEffect(() => {
    if (!translateEnabled) return;
    const toTranslate = news.slice(0, 20).filter(a => !translatedItems.has(a.id));
    if (toTranslate.length === 0) return;

    const translateBatch = async () => {
      for (const item of toTranslate) {
        if (translatingIds.has(item.id)) continue;
        setTranslatingIds(prev => new Set(prev).add(item.id));
        const [translatedHeadline, translatedSummary] = await Promise.all([
          translateToArabic(item.headline),
          translateToArabic(item.summary),
        ]);
        setTranslatedItems(prev => new Map(prev).set(item.id, {
          headline: translatedHeadline,
          summary: translatedSummary,
        }));
        setTranslatingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
      }
    };
    translateBatch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateEnabled, news.length]);

  const getDisplayText = (item: NewsItem) => {
    if (!translateEnabled) return { headline: item.headline, summary: item.summary };
    const translated = translatedItems.get(item.id);
    if (translated) return translated;
    if (translatingIds.has(item.id)) return { headline: '...', summary: '...' };
    return { headline: item.headline, summary: item.summary };
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-5xl mx-auto" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <span className="text-xl">🥇</span>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"/>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('Live Gold News')}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500"/>
              {lastUpdated ? `Updated ${timeAgo(lastUpdated.getTime())}` : 'Loading...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="hover-effect"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            {refreshing ? t('Refreshing...') : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <TrendingUp className="h-4 w-4 text-green-500"/>, label: 'Articles', value: news.length },
          { icon: <Radio className="h-4 w-4 text-red-500"/>, label: 'Live', value: news.filter(n => n.isLive).length },
          { icon: <Zap className="h-4 w-4 text-yellow-500"/>, label: 'Sources', value: new Set(news.map(n => n.source)).size },
        ].map(stat => (
          <div key={stat.label} className="bg-card border rounded-lg p-3 flex items-center gap-3">
            {stat.icon}
            <div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── News Feed ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 flex gap-4">
              <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : news.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
            <div className="text-4xl mb-3">📰</div>
            <p className="font-medium">{t('No news available')}</p>
            <p className="text-sm mt-1">Add your API keys in Railway env vars for live data</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchAll(true)}>
              Try again
            </Button>
          </div>
        ) : (
          news.map(item => {
            const display = getDisplayText(item);
            const srcColor = getSourceColor(item.source);
            const isTranslating = translatingIds.has(item.id);
            const isTranslated = translateEnabled && translatedItems.has(item.id);

            return (
              <article
                key={item.id}
                className="group bg-card border rounded-xl p-4 flex gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
                dir={isTranslated ? 'rtl' : 'ltr'}
              >
                {/* Source logo placeholder */}
                <div className={cn(
                  'h-12 w-12 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold',
                  srcColor
                )}>
                  {item.source.slice(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">{item.source}</span>
                      {item.isLive && (
                        <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 animate-pulse">
                          {t('LIVE')}
                        </Badge>
                      )}
                      {isTranslated && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-yellow-500 border-yellow-500/50">
                          🌐 AR
                        </Badge>
                      )}
                      {isTranslating && (
                        <span className="text-[10px] text-muted-foreground animate-pulse">translating...</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>

                  <h3 className={cn(
                    'font-semibold text-sm leading-snug mb-1 group-hover:text-primary transition-colors',
                    isTranslated ? 'text-right font-arabic' : ''
                  )}>
                    {display.headline || item.headline}
                  </h3>

                  {display.summary && (
                    <p className={cn(
                      'text-xs text-muted-foreground line-clamp-2',
                      isTranslated ? 'text-right' : ''
                    )}>
                      {display.summary}
                    </p>
                  )}
                </div>

                {/* Link */}
                {item.url && item.url !== '#' && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 self-start mt-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* ── API Key Notice ─────────────────────────────────────────── */}
      {!process.env.NEXT_PUBLIC_FINNHUB_API_KEY && !process.env.NEXT_PUBLIC_GNEWS_API_KEY && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm">
          <p className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">⚡ Connect Live News Sources</p>
          <p className="text-muted-foreground text-xs">
            Add these to Railway environment variables for live feeds:
          </p>
          <div className="mt-2 font-mono text-xs text-muted-foreground space-y-1">
            <p>• <code>NEXT_PUBLIC_FINNHUB_API_KEY</code> — free at finnhub.io</p>
            <p>• <code>NEXT_PUBLIC_GNEWS_API_KEY</code> — free at gnews.io</p>
          </div>
        </div>
      )}
    </div>
  );
}
