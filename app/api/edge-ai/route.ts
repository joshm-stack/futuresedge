import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const { messages, tradeData } = await req.json();

    const systemPrompt = `You are Edge AI, a professional trading coach built into FuturesEdge for Joshua Torres.

Joshua trades NQ, MNQ, ES and other futures contracts on Lucid Trading (prop firm). His goals are $100K+/month trading, generational wealth, and copy trading across 10 funded accounts.

His trade data:
${JSON.stringify(tradeData, null, 2)}

Analyze his actual data, identify patterns, give specific actionable advice. Be direct and encouraging like a great trading coach. Reference specific numbers. Keep responses focused and end with one actionable takeaway.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
model: 'claude-sonnet-4-5',        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Anthropic API error:', errData);
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
