import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, tradeData } = await req.json();

    const systemPrompt = `You are Edge AI, a professional trading coach and analyst built into FuturesEdge — a personal futures trading journal app used by Joshua Torres.

Joshua is a futures trader trading NQ, MNQ, ES and other futures contracts. He trades on Lucid Trading (prop firm) using TradeSea/Rithmic. His goals are to make $100K+ per month trading, build generational wealth, and eventually copy trade across 5 Lucid and 5 Topstep funded accounts.

Here is Joshua's complete trade history and performance data:
${JSON.stringify(tradeData, null, 2)}

Your job is to:
1. Analyze his actual trade data to give specific, personalized insights
2. Identify patterns, strengths, and weaknesses in his trading
3. Give actionable advice based on his real numbers
4. Be direct, honest, and encouraging — like a great trading coach
5. Reference specific trades and numbers when relevant
6. Help him improve his edge, consistency, and profitability

Keep responses concise but powerful. Use specific numbers from his data. Be conversational but professional. Always end with one actionable takeaway.

If he asks something not related to trading, politely redirect to trading topics.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text;

    if (!text) throw new Error('No response from Claude');

    return NextResponse.json({ message: text });
  } catch (err: any) {
    console.error('Edge AI error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 });
  }
}
