// src/app/api/ai-coach/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini(prompt: string, apiKey: string): Promise<any> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  };

  let lastError = '';

  for (let modelIdx = 0; modelIdx < GEMINI_MODELS.length; modelIdx++) {
    const model = GEMINI_MODELS[modelIdx];
    
    // Try each model up to 2 times (for 503 retries)
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(1500); // wait 1.5s before retry

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );

        if (response.ok) {
          const resData = await response.json();
          const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          try {
            return JSON.parse(rawText);
          } catch {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw new Error(`Non-JSON response: ${rawText.substring(0, 80)}`);
          }
        }

        const status = response.status;
        const errData = await response.json().catch(() => ({}));
        lastError = errData.error?.message || response.statusText;

        // 503 = overloaded, retry with same or next model
        // 404 = model not found, go to next model immediately
        // 429 = rate limit, go to next model
        if (status === 404 || status === 429) break; // try next model
        if (status === 400) throw new Error(`Bad request: ${lastError}`);
        // 503 or other: retry this model once, then try next
        
      } catch (fetchErr: any) {
        lastError = fetchErr.message;
        break; // network error, try next model
      }
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trades, date, mode } = body;

    if (!trades || !Array.isArray(trades)) {
      return NextResponse.json({ error: 'Invalid trades data' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        insights: [
          { icon: 'alert', title: 'AI Not Configured', description: 'Please add GOOGLE_GENAI_API_KEY to your Railway environment variables.' }
        ],
        assessment: 'AI Coach is not configured.',
        score: null,
      });
    }

    let prompt: string;
    let parsed: any;

    // --- MODE: Single Trade Insight ---
    if (mode === 'trade' && trades.length === 1) {
      const t = trades[0];
      const pnl = parseFloat(t.netPnl || '0');
      const roi = t.roi ? parseFloat(t.roi) : null;
      const rMultiple = t.rMultiple ? parseFloat(t.rMultiple) : null;

      prompt = `You are an elite trading performance coach (like TradeZella's AI) analyzing a single trade.

TRADE DATA:
- Symbol: ${t.symbol || 'N/A'}
- Side: ${t.side || 'N/A'}
- Net P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}
- Net ROI: ${roi !== null ? roi.toFixed(2) + '%' : 'N/A'}
- R-Multiple: ${rMultiple !== null ? rMultiple.toFixed(2) + 'R' : 'N/A'}
- Strategy: ${t.strategy || 'No strategy tagged'}
- Entry Time: ${t.entryTime || 'N/A'}

Analyze this SPECIFIC trade and produce 2-3 behavioral/psychological/technical insights.
Examples: "Time in Drawdown", "Leaving money on table", "Good R discipline", "Quick exit (panic)", "Revenge entry".

Return valid JSON:
{
  "insights": [
    {
      "icon": "alert|info|success",
      "title": "Short Title (3-5 words)",
      "description": "One specific sentence under 25 words with actual trade data."
    }
  ],
  "score": <0-100 trade quality score>
}`;

      parsed = await callGemini(prompt, apiKey);

      return NextResponse.json({
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
        score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
      });
    }

    // --- MODE: Daily Session Analysis ---
    const totalTrades = trades.length;
    const wins = trades.filter((t: any) => parseFloat(t.netPnl || '0') > 0).length;
    const losses = trades.filter((t: any) => parseFloat(t.netPnl || '0') < 0).length;
    const totalPnl = trades.reduce((sum: number, t: any) => sum + parseFloat(t.netPnl || '0'), 0);
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const bestTrade = Math.max(...trades.map((t: any) => parseFloat(t.netPnl || '0')));
    const worstTrade = Math.min(...trades.map((t: any) => parseFloat(t.netPnl || '0')));

    const grossProfit = trades.reduce((s: number, t: any) => s + Math.max(0, parseFloat(t.netPnl || '0')), 0);
    const grossLoss = Math.abs(trades.reduce((s: number, t: any) => s + Math.min(0, parseFloat(t.netPnl || '0')), 0));
    const profitFactor = grossLoss === 0 ? 0 : grossProfit / grossLoss;

    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    for (const t of trades) {
      if (parseFloat(t.netPnl || '0') < 0) { consecutiveLosses++; maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses); }
      else consecutiveLosses = 0;
    }

    const tradeDetails = trades.slice(0, 30).map((t: any, i: number) => {
      const pnl = parseFloat(t.netPnl || '0');
      return `  ${i + 1}. ${t.symbol || 'N/A'} ${t.side || ''} P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}${t.rMultiple ? ` R:${t.rMultiple}` : ''}`;
    }).join('\n');

    prompt = `You are an elite trading performance coach analyzing a trader's full daily session for ${date}.

SESSION:
- Total Trades: ${totalTrades} | Wins: ${wins} | Losses: ${losses}
- Win Rate: ${winRate.toFixed(1)}% | Profit Factor: ${profitFactor.toFixed(2)}
- Total P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}
- Best: +$${bestTrade.toFixed(2)} | Worst: $${worstTrade.toFixed(2)}
- Max consecutive losses: ${maxConsecutiveLosses}

TRADES:
${tradeDetails}

Produce 3-5 behavioral insights. Look for:
- Overtrading (many trades > usual)
- Revenge Trading (trading after 3+ consecutive losses)
- Tilt Session (many losses, short intervals, emotional spiral)
- Deep in Drawdown (session mostly negative)
- Left Money on the Table (gave back profits)
- Giving Away Profits (was up then lost it all)
- Discipline Maintained (positive if risk management was good)

Return valid JSON:
{
  "insights": [
    {
      "icon": "alert|info|success",
      "title": "Insight Title (3-5 words)",
      "description": "One specific sentence under 25 words with concrete session numbers."
    }
  ],
  "assessment": "One overall sentence about this trading day.",
  "score": <0-100 discipline score>
}`;

    parsed = await callGemini(prompt, apiKey);

    return NextResponse.json({
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [],
      assessment: parsed.assessment || 'Session analysis complete.',
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
    });

  } catch (error: any) {
    console.error('AI Coach error:', error);
    return NextResponse.json({
      insights: [
        { icon: 'alert', title: 'Analysis Failed', description: error.message }
      ],
      assessment: 'Error: ' + error.message,
      score: null,
    }, { status: 200 }); // return 200 so the UI still renders
  }
}
