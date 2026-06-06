import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Write one powerful, personal daily affirmation for a futures trader named Joshua who has these dreams: make $100K+ a month trading, buy his dream home, marry Rachel, have more kids, start a company to pass down to his children, travel the world, get his dream body, retire his mom and dad, retire his girlfriend Rachel, give back to people in need, love everyone including himself, and put God first every day.

The affirmation should be:
- Written in first person (I am / I have / I create etc.)
- Deeply personal and specific to HIS goals
- Faith-based and grounded in God
- Powerful, motivating, and real — not generic
- 2-3 sentences max
- Different and unique every single time

Return ONLY the affirmation text, nothing else. No quotes, no labels.`,
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();

    if (!text) throw new Error('No response from Claude');

    return NextResponse.json({ affirmation: text });
  } catch (err: any) {
    return NextResponse.json({
      affirmation: "God has already written my victory — today I walk in discipline, faith, and purpose to claim everything He promised me.",
    });
  }
}
