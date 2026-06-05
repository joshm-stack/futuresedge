'use client';
import { useState, useMemo } from 'react';
import { Trade, Analytics, DailyStats } from '@/types';
import { fmtCurrency, fmtPercent } from '@/lib/analytics';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Props {
  trades: Trade[];
  analytics: Analytics;
  daily: DailyStats[];
  equity: { date: string; equity: number }[];
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function calcEdgeScore(a: Analytics): number {
  if (!a.totalTrades) return 0;
  const winScore = Math.min(a.winRate, 100) * 0.25;
  const pfScore = Math.min(a.profitFactor * 20, 100) * 0.20;
  const rrScore = Math.min(a.avgRR * 25, 100) * 0.20;
  const consistencyScore = Math.min((1 - (a.longestLossStreak / Math.max(a.totalTrades, 1))) * 100, 100) * 0.20;
  const recoveryScore = a.totalNetPnl >= 0 ? 100 : Math.max(0, 100 + (a.totalNetPnl / Math.max(Math.abs(a.worstDay), 1)) * 10);
  return Math.round(winScore + pfScore + rrScore + consistencyScore + Math.min(recoveryScore, 100) * 0.15);
}

function getScoreColor(score: number) {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Elite';
  if (score >= 65) return 'Advanced';
  if (score >= 50) return 'Developing';
  if (score >= 35) return 'Beginner';
  return 'Building';
}

export default function DashboardClient({ trades, analytics: a, daily, equity }: Props) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState<'recent' | 'open'>('recent');

  const edgeScore = calcEdgeScore(a);
  const scoreColor = getScoreColor(edgeScore);
  const scoreLabel = getScoreLabel(edgeScore);
  const isProfit = a.totalNetPnl >= 0;

  const streak = useMemo(() => {
    const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
    let count = 0;
    let type: 'W' | 'L' | null = null;
    for (const t of sorted) {
      const isWin = t.net_pnl > 0;
      if (type === null) { type = isWin ? 'W' : 'L'; count = 1; }
      else if ((type === 'W' && isWin) || (type === 'L' && !isWin)) count++;
      else break;
    }
    return { count, type };
  }, [trades]);

  const radarData = [
    { subject: 'Win %', value: Math.min(a.winRate, 100) },
    { subject: 'Consistency', value: Math.min((1 - a.longestLossStreak / Math.max(a.totalTrades, 1)) * 100, 100) },
    { subject: 'Profit Factor', value: Math.min(a.profitFactor * 20, 100) },
    { subject: 'Avg Win/Loss', value: Math.min(a.avgRR * 25, 100) },
    { subject: 'Max Drawdown', value: Math.max(0, 100 - Math.abs(a.worstDay) / Math.max(a.totalNetPnl + 1, 1) * 10) },
    { subject: 'Recovery', value: a.totalNetPnl >= 0 ? 80 : 30 },
  ];

  const dayMap = useMemo(() => {
    const map: Record<number, { pnl: number; count: number }> = {};
    trades.forEach(t => {
      const d = new Date(t.date + 'T12:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = { pnl: 0, count: 0 };
        map[day].pnl += t.net_pnl;
        map[day].count++;
      }
    });
    return map;
  }, [trades, calYear, calMonth]);

  const weeklyTotals = useMemo(() => {
    const weeks: { pnl: number; days: number }[] = [];
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    let current = { pnl: 0, days: 0 };
    let col = 0;
    for (let i = 0; i < firstDay; i++) { col++; if (col === 7) { weeks.push(current); current = { pnl: 0, days: 0 }; col = 0; } }
    for (let d = 1; d <= daysInMonth; d++) {
      if (dayMap[d]) { current.pnl += dayMap[d].pnl; current.days++; }
      col++;
      if (col === 7 || d === daysInMonth) { weeks.push(current); current = { pnl: 0, days: 0 }; col = 0; }
    }
    return weeks;
  }, [dayMap, calYear, calMonth]);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const monthPnl = Object.values(dayMap).reduce((a, d) => a + d.pnl, 0);
  const tradingDays = Object.keys(dayMap).length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)', boxShadow: 'var(--shadow)' }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: isProfit ? '#22c55e' : '#ef4444' }}>Equity: {fmtCurrency(payload[0]?.value)}</p>
      </div>
    );
  };

  return (
    <div className="p-5 max-w-[1600px]" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>{trades.length} total trades</p>
        </div>
        <Link href="/import" className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: '#4f7ef8', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
          + Import Trades
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Net P&L', value: fmtCurrency(a.totalNetPnl, true), color: a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444', sub: `${a.totalTrades} trades` },
          { label: 'Trade Win %', value: fmtPercent(a.winRate), color: a.winRate >= 50 ? '#22c55e' : '#ef4444', sub: `${a.wins}W · ${a.losses}L` },
          { label: 'Avg Win/Loss', value: a.avgRR.toFixed(2), color: a.avgRR >= 1 ? '#22c55e' : '#f59e0b', sub: `${fmtCurrency(a.avgWin)} / ${fmtCurrency(a.avgLoss)}` },
          { label: 'Profit Factor', value: a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2), color: a.profitFactor >= 1 ? '#22c55e' : '#ef4444', sub: 'Gross W/L ratio' },
          { label: 'Current Streak', value: streak.type ? `${streak.count} ${streak.type}` : '—', color: streak.type === 'W' ? '#22c55e' : streak.type === 'L' ? '#ef4444' : 'var(--text-2)', sub: 'in a row' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 card">
            <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p className="text-[22px] font-bold leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-1 space-y-4">
          {/* Equity */}
          <div className="rounded-xl p-5 card">
            <p className="text-[11px] font-semibold mb-4" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Net Cumulative P&L</p>
            {equity.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={equity} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="equity" stroke={isProfit ? '#22c55e' : '#ef4444'} strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px]" style={{ color: 'var(--text-3)' }}>No trades yet</div>
            )}
          </div>

          {/* Edge Score */}
          <div className="rounded-xl p-5 card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edge Score</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[22px] font-bold" style={{ color: scoreColor }}>{edgeScore}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${scoreColor}20`, color: scoreColor }}>{scoreLabel}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-2)', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Edge" dataKey="value" stroke={scoreColor} fill={scoreColor} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-3)' }}>
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div className="h-full rounded-full" style={{ width: `${edgeScore}%`, background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }} />
              </div>
              <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-3)' }}>
                Based on win rate, consistency, profit factor, R:R, drawdown & recovery
              </p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="xl:col-span-2">
          <div className="rounded-xl p-5 card h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{MONTHS[calMonth]} {calYear}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-4 text-[12px]">
                <span style={{ color: monthPnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(monthPnl, true)}</span>
                <span style={{ color: 'var(--text-3)' }}>{tradingDays} days</span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'var(--text-3)' }}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const data = dayMap[d];
                    const isToday = today.getDate() === d && today.getMonth() === calMonth && today.getFullYear() === calYear;
                    const pnl = data?.pnl ?? 0;
                    let bg = 'transparent';
                    let pnlColor = 'var(--text-3)';
                    let border = 'var(--border)';
                    if (data) {
                      if (pnl > 0) { bg = 'rgba(34,197,94,0.08)'; pnlColor = '#22c55e'; border = 'rgba(34,197,94,0.2)'; }
                      else if (pnl < 0) { bg = 'rgba(239,68,68,0.08)'; pnlColor = '#ef4444'; border = 'rgba(239,68,68,0.2)'; }
                      else { bg = 'var(--bg-hover)'; }
                    }
                    return (
                      <div key={d} className="rounded-lg p-1 relative"
                        style={{ background: bg, border: `1px solid ${isToday ? '#4f7ef8' : border}`, minHeight: 48, cursor: data ? 'pointer' : 'default' }}>
                        <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{d}</span>
                        {data && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[9px] font-bold" style={{ color: pnlColor }}>
                              {Math.abs(pnl) >= 1000 ? `${pnl >= 0 ? '+' : '-'}$${(Math.abs(pnl)/1000).toFixed(1)}k` : `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`}
                            </span>
                            <span className="text-[8px]" style={{ color: 'var(--text-3)' }}>{data.count}T</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1" style={{ width: 64 }}>
                <div className="text-[9px] font-semibold py-1 text-center" style={{ color: 'var(--text-3)' }}>Weekly</div>
                {weeklyTotals.map((w, i) => (
                  <div key={i} className="rounded-lg flex flex-col items-center justify-center" style={{ minHeight: 48, background: w.pnl > 0 ? 'rgba(34,197,94,0.08)' : w.pnl < 0 ? 'rgba(239,68,68,0.08)' : 'transparent', border: '1px solid var(--border)' }}>
                    <span className="text-[9px] font-bold" style={{ color: w.pnl > 0 ? '#22c55e' : w.pnl < 0 ? '#ef4444' : 'var(--text-3)' }}>
                      {w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${Math.abs(w.pnl).toFixed(0)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="rounded-xl card">
        <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['recent', 'open'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="text-[13px] font-semibold pb-1 transition-colors"
              style={{ color: activeTab === tab ? 'var(--text)' : 'var(--text-3)', borderBottom: activeTab === tab ? '2px solid #4f7ef8' : '2px solid transparent', background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 4, borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: activeTab === tab ? '#4f7ef8' : 'transparent' }}>
              {tab === 'recent' ? 'Recent Trades' : 'Open Positions'}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'recent' && (
            trades.length === 0 ? (
              <div className="text-center py-8">
                <p className="mb-2" style={{ color: 'var(--text-2)' }}>No trades yet</p>
                <Link href="/import" style={{ color: '#4f7ef8', fontSize: 13 }}>Import your first trades →</Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date','Contract','Direction','Session','Entry','Exit','Net P&L','Result'].map(h => (
                      <th key={h} className="text-left pb-2 text-[11px] font-semibold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 8).map(trade => (
                    <tr key={trade.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2.5 text-[13px]" style={{ color: 'var(--text-2)' }}>{trade.date}</td>
                      <td className="py-2.5 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{trade.contract}</td>
                      <td className="py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: trade.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-2.5 text-[13px]" style={{ color: 'var(--text-2)' }}>{trade.session}</td>
                      <td className="py-2.5 text-[13px] font-mono" style={{ color: 'var(--text-2)' }}>{trade.entry_price}</td>
                      <td className="py-2.5 text-[13px] font-mono" style={{ color: 'var(--text-2)' }}>{trade.exit_price}</td>
                      <td className="py-2.5 text-[13px] font-bold" style={{ color: trade.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                        {fmtCurrency(trade.net_pnl, true)}
                      </td>
                      <td className="py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: trade.net_pnl > 0 ? 'rgba(34,197,94,0.1)' : trade.net_pnl < 0 ? 'rgba(239,68,68,0.1)' : 'var(--bg-hover)', color: trade.net_pnl > 0 ? '#22c55e' : trade.net_pnl < 0 ? '#ef4444' : 'var(--text-2)' }}>
                          {trade.net_pnl > 0 ? 'Win' : trade.net_pnl < 0 ? 'Loss' : 'B/E'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {activeTab === 'open' && (
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-2)' }}>No open positions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
