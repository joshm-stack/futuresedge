'use client';
import { useState, useRef, useEffect } from 'react';
import { Trade } from '@/types';
import { calcAnalytics, fmtCurrency } from '@/lib/analytics';
import { Send, Sparkles, RotateCcw } from 'lucide-react';

interface Props { trades: Trade[]; }

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  "What's my strongest trading setup?",
  "What time of day am I most profitable?",
  "What mistakes are costing me the most?",
  "How can I improve my win rate?",
  "What's my best trading day of the week?",
  "Analyze my risk management",
  "What patterns do you see in my losses?",
  "How does my profit factor compare to professional traders?",
  "What should I focus on to reach $100K/month?",
  "Give me an honest assessment of my trading",
];

export default function EdgeAIClient({ trades }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const a = calcAnalytics(trades);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const tradeData = {
    summary: {
      totalTrades: a.totalTrades,
      netPnl: a.totalNetPnl,
      winRate: a.winRate,
      wins: a.wins,
      losses: a.losses,
      profitFactor: a.profitFactor,
      avgWin: a.avgWin,
      avgLoss: a.avgLoss,
      avgRR: a.avgRR,
      largestWin: a.largestWin,
      largestLoss: a.largestLoss,
      bestDay: a.bestDay,
      worstDay: a.worstDay,
      longestWinStreak: a.longestWinStreak,
      longestLossStreak: a.longestLossStreak,
    },
    trades: trades.slice(0, 100).map(t => ({
      date: t.date,
      contract: t.contract,
      direction: t.direction,
      session: t.session,
      quantity: t.quantity,
      entry: t.entry_price,
      exit: t.exit_price,
      pnl: t.net_pnl,
      fees: t.fees,
      setupTags: t.setup_tags,
      mistakeTags: t.mistake_tags,
      rating: t.rating,
    })),
  };

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;
    setError('');

    const userMsg: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/edge-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          tradeData,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      const errMsg = err.message || 'Something went wrong';
      setError(errMsg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I ran into an issue: ${errMsg}`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)', boxShadow: '0 4px 12px rgba(79,126,248,0.3)' }}>
            <Sparkles size={17} color="white" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Edge AI</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
              Powered by Claude · Analyzing {trades.length} trades
            </p>
          </div>
        </div>
        <button onClick={() => { setMessages([]); setError(''); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
          <RotateCcw size={12} /> Clear chat
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {[
          { label: 'Net P&L', value: fmtCurrency(a.totalNetPnl, true), color: a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Win Rate', value: `${a.winRate.toFixed(1)}%`, color: a.winRate >= 50 ? '#22c55e' : '#ef4444' },
          { label: 'Trades', value: a.totalTrades.toString(), color: 'var(--text)' },
          { label: 'Profit Factor', value: a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2), color: '#22c55e' },
          { label: 'Avg Win', value: fmtCurrency(a.avgWin), color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="flex flex-col flex-shrink-0">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            <span className="text-[14px] font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-[12px]" style={{ color: '#ef4444' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)', boxShadow: '0 8px 24px rgba(79,126,248,0.25)' }}>
                <Sparkles size={28} color="white" />
              </div>
              <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--text)' }}>
                Hey Joshua, I'm Edge AI 👋
              </h2>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                I've analyzed your {trades.length} trades and I'm ready to give you
                personalized insights. Ask me anything about your trading performance.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold mb-3" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Quick Questions
              </p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 rounded-xl text-[13px] transition-all"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#4f7ef8';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
                    }}>
                    <span style={{ color: '#4f7ef8', marginRight: 8 }}>→</span>{q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-3 mt-1"
                    style={{ background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)' }}>
                    <Sparkles size={14} color="white" />
                  </div>
                )}
                <div className="max-w-[85%] px-4 py-3 text-[14px] leading-relaxed"
                  style={{
                    background: msg.role === 'user' ? '#4f7ef8' : 'var(--bg-card)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    whiteSpace: 'pre-wrap',
                  }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-3"
                  style={{ background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)' }}>
                  <Sparkles size={14} color="white" />
                </div>
                <div className="px-4 py-3 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full"
                        style={{ background: '#4f7ef8', animation: `bounce 1.2s ease infinite ${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Edge AI about your trading..."
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 14, resize: 'none', lineHeight: 1.5,
                maxHeight: 120, fontFamily: 'inherit',
              }}
            />
            <button onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: input.trim() && !loading ? '#4f7ef8' : 'var(--bg-hover)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                boxShadow: input.trim() && !loading ? '0 2px 8px rgba(79,126,248,0.3)' : 'none',
              }}>
              <Send size={15} color={input.trim() && !loading ? '#fff' : 'var(--text-3)'} />
            </button>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: 'var(--text-3)' }}>
            Press Enter to send · Shift+Enter for new line · Powered by Claude AI
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
