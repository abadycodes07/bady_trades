// src/app/api/news/route.ts
// Server-side cached news API — ALL users share this one fetched + cached response.
// Caches gold for 30 sec, other symbols for 60 sec.
// This means Finnhub/GNews will only be called once per interval,
// regardless of whether 1 user or 1 million users hit the page.

import { NextRequest, NextResponse } from 'next/server';

// ─── In-memory server cache (persists between requests in same process) ───────
interface CacheEntry {
  data: NewsItem[];
  fetchedAt: number; // unix ms
}

const SYMBOL_TTL: Record<string, number> = {
  gold: 30_000,   // 30s — gold is pre-cached and fast
  oil:  60_000,
  nasdaq: 60_000,
  forex: 60_000,
  crypto: 60_000,
};

const serverCache = new Map<string, CacheEntry>();

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

// ─── Sentiment analysis (keyword scoring) ─────────────────────────────────────
const BULLISH = [
  'rises', 'rose', 'surges', 'surged', 'gains', 'gained', 'rally', 'rallies', 'rallied',
  'bullish', 'jumps', 'jumped', 'soars', 'soared', 'hits record', 'hit record',
  'safe haven', 'climbs', 'climbed', 'advances', 'advanced', 'strengthens', 'boost',
  'buying', 'demand', 'inflows', 'higher', 'upside', 'all-time high', 'surge'
];
const BEARISH = [
  'falls', 'fell', 'drops', 'dropped', 'slumps', 'slumped', 'bearish',
  'declines', 'declined', 'slides', 'slid', 'plunges', 'plunged', 'crashes', 'crashed',
  'weakens', 'weakened', 'retreats', 'retreated', 'pressure', 'lower', 'losses',
  'selling', 'outflows', 'downside', 'correction', 'sink', 'sinks'
];

function detectSentiment(headline: string, summary: string): 'up' | 'down' | 'neutral' {
  const text = `${headline} ${summary}`.toLowerCase();
  let score = 0;
  BULLISH.forEach(w => { if (text.includes(w)) score++; });
  BEARISH.forEach(w => { if (text.includes(w)) score--; });
  if (score > 0) return 'up';
  if (score < 0) return 'down';
  return 'neutral';
}

// ─── Symbol → query map ───────────────────────────────────────────────────────
const SYMBOL_QUERIES: Record<string, { gnews: string; finnhubFilter: RegExp; category: string }> = {
  gold:   { gnews: 'gold XAU XAUUSD bullion', finnhubFilter: /gold|xau|bullion|comex|lbma|precious metal/i, category: 'Gold' },
  oil:    { gnews: 'oil WTI crude petroleum OPEC', finnhubFilter: /oil|wti|crude|brent|opec|petroleum/i, category: 'Oil' },
  nasdaq: { gnews: 'NASDAQ NQ technology stocks', finnhubFilter: /nasdaq|nq|tech stock|s&p|dow jones|equity/i, category: 'NASDAQ' },
  forex:  { gnews: 'forex EUR USD dollar euro currency', finnhubFilter: /forex|eur|usd|dollar|euro|currency|fx|pound|yen/i, category: 'Forex' },
  crypto: { gnews: 'bitcoin ethereum crypto BTC ETH', finnhubFilter: /bitcoin|ethereum|crypto|btc|eth|blockchain/i, category: 'Crypto' },
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────
async function fetchGNews(symbol: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_GNEWS_API_KEY ?? process.env.GNEWS_API_KEY;
  if (!apiKey) return [];
  const query = SYMBOL_QUERIES[symbol]?.gnews ?? symbol;
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=20&sortby=publishedAt&apikey=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const category = SYMBOL_QUERIES[symbol]?.category ?? symbol;
    return (data.articles ?? []).map((a: any, i: number) => {
      const headline = a.title ?? '';
      const summary = a.description ?? '';
      return {
        id: `gn-${symbol}-${i}-${a.publishedAt}`,
        headline,
        summary,
        source: a.source?.name ?? 'GNews',
        publishedAt: new Date(a.publishedAt).getTime(),
        url: a.url ?? '#',
        image: a.image,
        category,
        isLive: false,
        sentiment: detectSentiment(headline, summary),
      };
    });
  } catch {
    return [];
  }
}

async function fetchFinnhub(symbol: string): Promise<NewsItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  const filter = SYMBOL_QUERIES[symbol]?.finnhubFilter;
  const category = SYMBOL_QUERIES[symbol]?.category ?? symbol;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data ?? [])
      .filter((a: any) => !filter || filter.test(`${a.headline ?? ''} ${a.summary ?? ''}`))
      .slice(0, 25)
      .map((a: any) => {
        const headline = a.headline ?? '';
        const summ = a.summary ?? '';
        return {
          id: `fh-${symbol}-${a.id}`,
          headline,
          summary: summ,
          source: a.source ?? 'Finnhub',
          publishedAt: (a.datetime ?? 0) * 1000,
          url: a.url ?? '#',
          image: a.image,
          category,
          isLive: false,
          sentiment: detectSentiment(headline, summ),
        };
      });
  } catch {
    return [];
  }
}

function mergeAndSort(a: NewsItem[], b: NewsItem[]): NewsItem[] {
  const map = new Map<string, NewsItem>();
  [...a, ...b].forEach(item => map.set(item.id, item));
  return Array.from(map.values())
    .sort((x, y) => y.publishedAt - x.publishedAt)
    .slice(0, 80);
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get('symbol') ?? 'gold').toLowerCase();
  const ttl = SYMBOL_TTL[symbol] ?? 60_000;

  // Check server-side cache
  const cached = serverCache.get(symbol);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < ttl) {
    return NextResponse.json(
      { items: cached.data, cachedAt: cached.fetchedAt, fromCache: true },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${Math.floor(ttl / 1000)}, stale-while-revalidate=10`,
          'X-Cache': 'HIT',
          'X-Cache-Age': String(Math.floor((now - cached.fetchedAt) / 1000)),
        }
      }
    );
  }

  // Fetch fresh data
  const [gNews, finnhub] = await Promise.allSettled([
    fetchGNews(symbol),
    fetchFinnhub(symbol),
  ]);
  const items = mergeAndSort(
    gNews.status === 'fulfilled' ? gNews.value : [],
    finnhub.status === 'fulfilled' ? finnhub.value : [],
  );

  // Store in server cache
  serverCache.set(symbol, { data: items, fetchedAt: now });

  return NextResponse.json(
    { items, cachedAt: now, fromCache: false },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${Math.floor(ttl / 1000)}, stale-while-revalidate=10`,
        'X-Cache': 'MISS',
      }
    }
  );
}
