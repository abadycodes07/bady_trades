// src/app/api/ai-coach/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function callGemini(prompt: string, apiKey: string): Promise<any> {
  const primaryModel = "gemini-3-flash-preview";
  const fallbackModel = "gemini-1.5-flash";
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  let response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!response.ok && response.status === 404) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`Gemini API [${response.status}]: ${errorMessage}`);
  }

  const resData = await response.json();
  const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return JSON.parse(rawText);
  } catch (e) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`AI returned non-JSON text: ${rawText.substring(0, 100)}...`);
  }
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
          { icon: "warning", title: "AI Not Configured", description: "Please add GOOGLE_GENAI_API_KEY to your Railway environment variables." }
        ],
        assessment: "AI Coach is not configured.",
        score: null,
      });
    }

    let prompt: string;
    let parsed: any;

    // --- MODE: Single Trade Insight (from Trade View page) ---
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
- Exit Time: ${t.exitTime || 'N/A'}
- Hold Time: ${t.holdTime || 'N/A'}

Analyze this SPECIFIC trade and produce 2-3 pinpoint insights. These insights should be behavioral, psychological, or technical. Look for patterns like: "Time in Drawdown", "Leaving money on the table", "Good R-Multiple discipline", "Quick exit (panic sell)", "Revenge entry pattern", etc.

Return valid JSON with this EXACT structure:
{
  "insights": [
    {
      "icon": "alert" or "info" or "success",
      "title": "Short Insight Title (3-5 words max)",
      "description": "One specific, actionable sentence explaining this insight with reference to the exact trade data."
    }
  ],
  "score": <number 0-100 representing this trade's quality/discipline score>
}

Rules:
- Maximum 3 insights
- Each description must be under 25 words and reference actual trade data
- Be specific and actionable, not generic
- Use "alert" icon for risks/warnings, "success" for positives, "info" for neutral observations`;

      parsed = await callGemini(prompt, apiKey);

      return NextResponse.json({
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [],
        score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
      });
    }

    // --- MODE: Daily Session Analysis (from Day View / Dashboard) ---
    const totalTrades = trades.length;
    const wins = trades.filter((t: any) => parseFloat(t.netPnl || '0') > 0).length;
    const losses = trades.filter((t: any) => parseFloat(t.netPnl || '0') < 0).length;
    const breakEvens = totalTrades - wins - losses;
    const totalPnl = trades.reduce((sum: number, t: any) => sum + parseFloat(t.netPnl || '0'), 0);
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const bestTrade = Math.max(...trades.map((t: any) => parseFloat(t.netPnl || '0')));
    const worstTrade = Math.min(...trades.map((t: any) => parseFloat(t.netPnl || '0')));
    const rMultiples = trades.filter((t: any) => t.rMultiple && !isNaN(parseFloat(t.rMultiple))).map((t: any) => parseFloat(t.rMultiple));
    const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a: number, b: number) => a + b, 0) / rMultiples.length : null;

    // Check for behavioral red flags
    const hasRevengeTrading = (() => {
      // Check if there are consecutive losses followed by more trades
      let consecutiveLosses = 0;
      let maxConsecutiveLosses = 0;
      for (const t of trades) {
        if (parseFloat(t.netPnl || '0') < 0) { consecutiveLosses++; maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses); }
        else { consecutiveLosses = 0; }
      }
      return maxConsecutiveLosses >= 3;
    })();

    const profitFactor = (() => {
      const grossProfit = trades.reduce((s: number, t: any) => s + Math.max(0, parseFloat(t.netPnl || '0')), 0);
      const grossLoss = Math.abs(trades.reduce((s: number, t: any) => s + Math.min(0, parseFloat(t.netPnl || '0')), 0));
      return grossLoss === 0 ? 0 : grossProfit / grossLoss;
    })();

    const tradeDetails = trades.slice(0, 30).map((t: any, i: number) => {
      const pnl = parseFloat(t.netPnl || '0');
      return `  ${i + 1}. ${t.symbol || 'N/A'} ${t.side || ''} P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}${t.rMultiple ? ` R:${t.rMultiple}` : ''}${t.strategy ? ` [${t.strategy}]` : ''}`;
    }).join('\n');

    prompt = `You are an elite trading performance coach (like TradeZella's AI) analyzing a trader's full daily session for ${date}.

SESSION OVERVIEW:
- Total Trades: ${totalTrades} | Wins: ${wins} | Losses: ${losses} | Break-Even: ${breakEvens}
- Win Rate: ${winRate.toFixed(1)}%
- Total P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}
- Profit Factor: ${profitFactor.toFixed(2)}
- Best trade: +$${bestTrade.toFixed(2)} | Worst trade: $${worstTrade.toFixed(2)}
- Avg P&L/trade: $${avgPnl.toFixed(2)}
${avgRMultiple !== null ? `- Average R-Multiple: ${avgRMultiple.toFixed(2)}R` : ''}
- Revenge trading signals: ${hasRevengeTrading ? 'YES (3+ consecutive losses detected)' : 'No'}

TRADE-BY-TRADE LOG:
${tradeDetails}

Produce 3-5 behavioral insights for this session. Common insight types to look for:
- "Overtrading" (too many trades vs usual 3-5)
- "Revenge Trading" (trading after consecutive losses)
- "Tilt Session" (many losses, short intervals, emotional pattern)
- "Deep in Drawdown" (majority of session in negative territory)
- "Left Money on the Table" (exits too early based on best vs actual)
- "Giving Away Profits" (was up, then gave back - look at P&L sequence)
- "Discipline Maintained" (positive insights if they kept good risk management)

Return valid JSON with this EXACT structure:
{
  "insights": [
    {
      "icon": "alert" or "info" or "success",
      "title": "Insight Title (3-5 words)",
      "description": "One specific sentence with concrete numbers from the session data."
    }
  ],
  "assessment": "One overall sentence about this trading day.",
  "score": <number 0-100 for this day's discipline quality>
}

Rules:
- 3-5 insights maximum
- Each description under 25 words, referencing actual session metrics
- Brutal honesty: if they lost $489 revenge trading 48 times, say it clearly
- Use "alert" for red-flag behaviors, "success" for positives, "info" for neutral`;

    parsed = await callGemini(prompt, apiKey);

    return NextResponse.json({
      insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [],
      assessment: parsed.assessment || 'Session analysis complete.',
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
    });

  } catch (error: any) {
    console.error('AI Coach technical error:', error);
    return NextResponse.json({
      insights: [
        { icon: "alert", title: "Analysis Failed", description: error.message }
      ],
      assessment: "Diagnostic Error: " + error.message,
      score: null,
      error: error.message,
    }, { status: 500 });
  }
}
