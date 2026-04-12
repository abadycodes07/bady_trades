// src/app/api/ai-coach/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trades, date } = body;

    if (!trades || !Array.isArray(trades)) {
      return NextResponse.json({ error: 'Invalid trades data' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || "AIzaSyBnj8CZ4lKT9fyS9Gd0IiOo9MlKwBYd9H8";
    if (!apiKey) {
      return NextResponse.json({
        assessment: "AI Coach is not configured. Please set GOOGLE_GENAI_API_KEY in your environment.",
        tips: ["Configure your Google AI API key to enable AI coaching feedback."],
        warnings: [],
        score: null,
      });
    }

    // Build a trade summary for the prompt
    const totalTrades = trades.length;
    const wins = trades.filter((t: any) => parseFloat(t.netPnl || '0') > 0).length;
    const losses = trades.filter((t: any) => parseFloat(t.netPnl || '0') < 0).length;
    const totalPnl = trades.reduce((sum: number, t: any) => sum + parseFloat(t.netPnl || '0'), 0);
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const bestTrade = Math.max(...trades.map((t: any) => parseFloat(t.netPnl || '0')));
    const worstTrade = Math.min(...trades.map((t: any) => parseFloat(t.netPnl || '0')));
    const rMultiples = trades.filter((t: any) => t.rMultiple && !isNaN(parseFloat(t.rMultiple))).map((t: any) => parseFloat(t.rMultiple));
    const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a: number, b: number) => a + b, 0) / rMultiples.length : null;

    // Build trade list summary
    const tradeDetails = trades.map((t: any, i: number) => {
      const pnl = parseFloat(t.netPnl || '0');
      const time = t.execTime || `Trade ${i + 1}`;
      return `  ${i + 1}. ${t.symbol || 'N/A'} ${t.side || ''} — P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}${t.rMultiple ? ` | R: ${t.rMultiple}` : ''}${t.strategy ? ` | Strategy: ${t.strategy}` : ''}`;
    }).join('\n');

    const prompt = `You are a professional trading coach reviewing a trader's performance for ${date}.

TRADING SESSION SUMMARY:
- Total Trades: ${totalTrades}
- Wins: ${wins} | Losses: ${losses} | Win Rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnl.toFixed(2)}
- Average P&L per trade: $${avgPnl.toFixed(2)}
- Best trade: +$${bestTrade.toFixed(2)} | Worst trade: $${worstTrade.toFixed(2)}
${avgRMultiple !== null ? `- Average R-Multiple: ${avgRMultiple.toFixed(2)}R` : ''}

TRADE-BY-TRADE BREAKDOWN:
${tradeDetails}

Based on this data, provide a brief trading coach analysis. Your response must be valid JSON with this exact structure:
{
  "assessment": "One sentence overall assessment of this trading day (positive or constructive)",
  "tips": ["Tip 1 (specific, actionable)", "Tip 2", "Tip 3"],
  "warnings": ["Warning 1 if applicable (e.g. overtrading, revenge trading, etc.)"],
  "score": <number between 0-100 representing this day's discipline score>
}

Be direct, specific, and tough-love honest. Reference specific metrics. Keep each tip under 20 words.`;

    // Call Google Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      assessment: parsed.assessment || 'Analysis complete.',
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 3) : [],
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
    });

  } catch (error: any) {
    console.error('AI Coach error:', error);
    return NextResponse.json({
      assessment: "Unable to generate analysis at this time.",
      tips: ["Ensure your winning trades have a positive R-multiple.", "Review your worst trade to identify what went wrong."],
      warnings: [],
      score: null,
      error: error.message,
    }, { status: 500 });
  }
}
