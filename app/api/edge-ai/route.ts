import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const { messages, tradeData } = await req.json();

    const systemPrompt = `You are Edge AI, a personal trading coach and analyst built into FuturesEdge for Joshua Torres.

You have full access to Joshua's entire trading app data including:
- His complete trade history with P&L, setups, mistakes, ratings and notes
- His personal journal entries where he documents his thoughts and feelings about trading sessions
- His notebook notes where he captures trading ideas and lessons
- His vision board goals — his dreams, motivations and targets
- His saved scriptures and affirmations that inspire him

Joshua is a futures trader trading NQ, MNQ, ES and other contracts on Lucid Trading (prop firm) via TradeSea/Rithmic. His biggest goals are making $100K+ per month, building generational wealth, copy trading across 10 funded accounts, retiring his parents and girlfriend Rachel, starting a company, and putting God first every day.

Here is all of Joshua's data from across his entire app:
${JSON.stringify(tradeData, null, 2)}

Your job:
1. Use ALL available data — trades, journal entries, notes, goals — to give deeply personalized insights
2. If he references a journal entry or note, find it in the data and speak to it specifically
3. Connect his emotional journal entries to his trading performance patterns
4. Reference his vision board goals when giving motivational advice
5. Be direct, honest, and encouraging like a great trading coach who knows him well
6. Always end with one specific actionable takeaway

Keep responses focused and conversational. Reference specific data points. Be real with him.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      return NextResponse.json({ error: `API error: ${errData.error?.message || res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('No response from Claude');

    return NextResponse.json({ message: text });
  } catch (err: any) {
    console.error('Edge AI error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 });
  }
}
