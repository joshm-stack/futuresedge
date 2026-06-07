'use client';
import { useState, useRef, useEffect } from 'react';
import { Trade } from '@/types';
import { calcAnalytics, fmtCurrency } from '@/lib/analytics';
import { Send, Sparkles, RotateCcw } from 'lucide-react';

interface JournalEntry { id: string; date: string; time: string; content: string; screenshot_url: string | null; created_at: string; }
interface NotebookEntry { id: string; title: string; content: string; tags: string[]; updated_at: string; }
interface Goal { id: string; title: string; description: string | null; category: string; completed: boolean; }
interface SavedAffirmation { id: string; type: string; content: string; reference: string | null; }

interface Props {
  trades: Trade[];
  journal: JournalEntry[];
  notebook: NotebookEntry[];
  goals: Goal[];
  savedAffirmations: SavedAffirmation[];
}

interface Message { role: 'user' | 'assistant'; content: string; }

const QUICK_QUESTIONS = [
  "Give me an honest assessment of my trading",
  "Based on my journal, what patterns do you notice?",
  "What should I focus on to reach $100K/month?",
  "What's my biggest weakness right now?",
];

export default function EdgeAIClient({ trades, journal, notebook, goals, savedAffirmations }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const a = calcAnalytics(trades);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const appData = {
    summary: { totalTrades: a.totalTrades, netPnl: a.totalNetPnl, winRate: a.winRate, wins: a.wins, losses: a.losses, profitFactor: a.profitFactor, avgWin: a.avgWin, avgLoss: a.avgLoss, bestDay: a.bestDay, worstDay: a.worstDay },
    trades: trades.slice(0, 50).map(t => ({ date: t.date, contract: t.contract, direction: t.direction, session: t.session, pnl: t.net_pnl, setupTags: t.setup_tags, mistakeTags: t.mistake_tags, notes: t.notes })),
    journalEntries: journal.slice(0, 20).map(j => ({ date: j.date, content: j.content })),
    notebookNotes: notebook.slice(0, 10).map(n => ({ title: n.title, content: n.content })),
    visionGoals: goals.map(g => ({ title: g.title, category: g.category, completed: g.completed })),
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
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })), tradeData: appData }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally { setLoading(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,126,248,0.3)' }}>
            <Sparkles size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Edge AI</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0 }}>{trades.length} trades · {journal.length} journal entries · {goals.length} goals</p>
          </div>
        </div>
        <button onClick={() => { setMessages([]); setError(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
          <RotateCcw size={11} /> Clear
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowX: 'auto' }}>
        {[
          { label: 'P&L', value: fmtCurrency(a.totalNetPnl, true), color: a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Win %', value: `${a.winRate.toFixed(0)}%`, color: a.winRate >= 50 ? '#22c55e' : '#ef4444' },
          { label: 'Trades', value: a.totalTrades.toString(), color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 2px 0' }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(79,126,248,0.25)' }}>
                <Sparkles size={28} color="white" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Hey Joshua 👋</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
                I have full access to your trades, journal, and goals. Ask me anything.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, fontSize: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#4f7ef8', fontWeight: 700 }}>→</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 4 }}>
                    <Sparkles size={13} color="white" />
                  </div>
                )}
                <div style={{ maxWidth: '82%', padding: '12px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: msg.role === 'user' ? '#4f7ef8' : 'var(--bg-card)', color: msg.role === 'user' ? '#fff' : 'var(--text)', border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4f7ef8, #7ab4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={13} color="white" />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f7ef8', animation: `bounce 1.2s ease infinite ${i * 0.2}s` }} />
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
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 14px', borderRadius: 16, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Edge AI anything..."
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, resize: 'none', lineHeight: 1.5, maxHeight: 100, fontFamily: 'inherit' }}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
            style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && !loading ? '#4f7ef8' : 'var(--bg-hover)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0, boxShadow: input.trim() && !loading ? '0 2px 8px rgba(79,126,248,0.3)' : 'none' }}>
            <Send size={14} color={input.trim() && !loading ? '#fff' : 'var(--text-3)'} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', marginTop: 6, marginBottom: 0 }}>Enter to send · Shift+Enter for new line</p>
      </div>

      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }`}</style>
    </div>
  );
}
