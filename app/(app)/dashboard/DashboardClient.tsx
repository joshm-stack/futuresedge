'use client';
import { useState, useMemo } from 'react';
import { Trade, Analytics, DailyStats } from '@/types';
import { fmtCurrency, fmtPercent } from '@/lib/analytics';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, TrendingDown, Trophy, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const finalRecovery = Math.min(recoveryScore, 100) * 0.15;
  return Math.round(winScore + pfScore + rrScore + consistencyScore + finalRecovery);
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

  // Current streak
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

  // Radar data for Edge Score
  const radarData = [
    { subject: 'Win %', value: Math.min(a.winRate, 100), fullMark: 100 },
    { subject: 'Consistency', value: Math.min((1 - a.longestLossStreak / Math.max(a.totalTrades, 1)) * 100, 100), fullMark: 100 },
    { subject: 'Profit Factor', value: Math.min(a.profitFactor * 20, 100), fullMark: 100 },
    { subject: 'Avg Win/Loss', value: Math.min(a.avgRR * 25, 100), fullMark: 100 },
    { subject: 'Max Drawdown', value: Math.max(0, 100 - Math.abs(a.worstDay) / Math.max(a.totalNetPnl + 1, 1) * 10), fullMark: 100 },
    { subject: 'Recovery', value: a.totalNetPnl >= 0 ? 80 : 30, fullMark: 100 },
  ];

  // Calendar
  const dayMap = useMemo(() => {
    const map: Record<number, { pnl: number; count: number; winRate: number }> = {};
    trades.forEach(t => {
      const d = new Date(t.date + 'T12:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = { pnl: 0, count: 0, winRate: 0 };
        map[day].pnl += t.net_pnl;
        map[day].count++;
        if (t.net_pnl > 0) map[day].winRate++;
      }
    });
    Object.keys(map).forEach(k => {
      const d = map[+k];
      d.winRate = d.count ? Math.round(d.winRate / d.count * 100) : 0;
    });
    return map;
  }, [trades, calYear, calMonth]);

  // Weekly totals
  const weeklyTotals = useMemo(() => {
    const weeks: { pnl: number; days: number }[] = [];
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    let weekIdx = 0;
    let current: { pnl: number; days: number } = { pnl: 0, days: 0 };
    for (let col = 0; col < firstDay; col++) {
      if (col === 6) { weeks.push(current); current = { pnl: 0, days: 0 }; }
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(calYear, calMonth, d).getDay();
      if (dayMap[d]) { current.pnl += dayMap[d].pnl; current.days++; }
      if (dayOfWeek === 6 || d === daysInMonth) { weeks.push(current); current = { pnl: 0, days: 0 }; }
    }
    return weeks;
  }, [dayMap, calYear, calMonth]);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();

  const monthPnl = Object.values(dayMap).reduce((a, d) => a + d.pnl, 0);
  const tradingDays = Object.keys(dayMap).length;

  const isProfit = a.totalNetPnl >= 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1e2336', border: '1px solid #313856', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e2e8ff' }}>
        <p style={{ color: '#8892b8', marginBottom: 4 }}>{label}</p>
        <p style={{ color: isProfit ? '#22c55e' : '#ef4444' }}>Equity: {fmtCurrency(payload[0]?.value)}</p>
      </div>
    );
  };

  return (
    <div className="p-5 max-w-[1600px]" style={{ background: '#0c0e14', minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-primary">Dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#8892b8' }}>{trades.length} total trades</p>
        </div>
        <Link href="/import" className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
          style={{ background: '#4f7ef8', border: 'none' }}>
          + Import Trades
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Net P&L', value: fmtCurrency(a.totalNetPnl, true), color: a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444', sub: `${a.totalTrades} trades` },
          { label: 'Trade Win %', value: fmtPercent(a.winRate), color: a.winRate >= 50 ? '#22c55e' : '#ef4444', sub: `${a.wins}W · ${a.losses}L` },
          { label: 'Avg Win/Loss', value: a.avgRR.toFixed(2), color: a.avgRR >= 1 ? '#22c55e' : '#f59e0b', sub: `${fmtCurrency(a.avgWin)} / ${fmtCurrency(a.avgLoss)}` },
          { label: 'Profit Factor', value: a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2), color: a.profitFactor >= 1 ? '#22c55e' : '#ef4444', sub: 'Gross W/L ratio' },
          { label: 'Current Streak', value: streak.type ? `${streak.count} ${streak.type}` : '—', color: streak.type === 'W' ? '#22c55e' : streak.type === 'L' ? '#ef4444' : '#8892b8', sub: 'in a row' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <p className="text-[11px] font-medium mb-2" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p className="text-[22px] font-semibold leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px]" style={{ color: '#4a5270' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Left: Equity curve + Edge Score */}
        <div className="xl:col-span-1 space-y-4">
          {/* Equity Curve */}
          <div className="rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <p className="text-[11px] font-medium mb-4" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Net Cumulative P&L</p>
            {equity.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={equity} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2336" />
                  <XAxis dataKey="date" tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="equity" stroke={isProfit ? '#22c55e' : '#ef4444'} strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px]" style={{ color: '#4a5270' }}>No trades yet</div>
            )}
          </div>

          {/* Edge Score */}
          <div className="rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edge Score</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[20px] font-bold" style={{ color: scoreColor }}>{edgeScore}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${scoreColor}20`, color: scoreColor }}>{scoreLabel}</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#252b40" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8892b8', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Edge" dataKey="value" stroke={scoreColor} fill={scoreColor} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Score bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-1" style={{ color: '#4a5270' }}>
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2336' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${edgeScore}%`, background: `linear-gradient(to right, #ef4444, #f59e0b, #22c55e)` }} />
              </div>
              <p className="text-[10px] mt-1.5 text-center" style={{ color: '#4a5270' }}>
                Based on win rate, consistency, profit factor, R:R, drawdown & recovery
              </p>
            </div>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="xl:col-span-2">
          <div className="rounded-xl p-5 h-full" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                  style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[14px] font-semibold" style={{ color: '#e2e8ff' }}>{MONTHS[calMonth]} {calYear}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                  style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-4 text-[12px]">
                <span style={{ color: monthPnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(monthPnl, true)}</span>
                <span style={{ color: '#4a5270' }}>{tradingDays} days</span>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Calendar grid */}
              <div className="flex-1">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAYS.map(d => <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: '#4a5270' }}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const data = dayMap[d];
                    const isToday = today.getDate() === d && today.getMonth() === calMonth && today.getFullYear() === calYear;
                    const pnl = data?.pnl ?? 0;
                    let bg = '#0c0e14';
                    let pnlColor = '#4a5270';
                    if (data) {
                      if (pnl > 0) { bg = '#0c2014'; pnlColor = '#22c55e'; }
                      else if (pnl < 0) { bg = '#200c0c'; pnlColor = '#ef4444'; }
                      else { bg = '#1e2336'; pnlColor = '#8892b8'; }
                    }
                    return (
                      <div key={d} className="rounded-lg p-1 relative"
                        style={{ background: bg, border: `1px solid ${isToday ? '#4f7ef8' : data ? 'rgba(255,255,255,0.05)' : '#1a1e2e'}`, minHeight: 52, cursor: data ? 'pointer' : 'default' }}>
                        <span className="text-[9px]" style={{ color: '#4a5270' }}>{d}</span>
                        {data && (
                          <div className="flex flex-col items-center justify-center" style={{ marginTop: 2 }}>
                            <span className="text-[9px] font-semibold leading-none" style={{ color: pnlColor }}>
                              {Math.abs(pnl) >= 1000 ? `${pnl >= 0 ? '+' : '-'}$${(Math.abs(pnl)/1000).toFixed(1)}k` : `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`}
                            </span>
                            <span className="text-[8px]" style={{ color: '#4a5270' }}>{data.count}T · {data.winRate}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly totals */}
              <div className="flex flex-col gap-1" style={{ width: 70 }}>
                <div className="text-[10px] font-medium py-1 text-center" style={{ color: '#4a5270' }}>Weekly</div>
                {weeklyTotals.map((w, i) => (
                  <div key={i} className="rounded-lg flex flex-col items-center justify-center" style={{ minHeight: 52, background: w.pnl > 0 ? '#0c2014' : w.pnl < 0 ? '#200c0c' : '#0c0e14', border: '1px solid #1a1e2e' }}>
                    <span className="text-[9px] font-semibold" style={{ color: w.pnl > 0 ? '#22c55e' : w.pnl < 0 ? '#ef4444' : '#4a5270' }}>
                      {w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${Math.abs(w.pnl).toFixed(0)}` : '—'}
                    </span>
                    {w.days > 0 && <span className="text-[8px]" style={{ color: '#4a5270' }}>{w.days}d</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="rounded-xl" style={{ background: '#12151f', border: '1px solid #252b40' }}>
        <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid #252b40' }}>
          {(['recent', 'open'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="text-[13px] font-medium pb-1 transition-colors"
              style={{ color: activeTab === tab ? '#e2e8ff' : '#4a5270', borderBottom: activeTab === tab ? '2px solid #4f7ef8' : '2px solid transparent', background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 4 }}>
              {tab === 'recent' ? 'Recent Trades' : 'Open Positions'}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'recent' && (
            trades.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#4a5270' }}>
                <p className="mb-2">No trades yet</p>
                <Link href="/import" style={{ color: '#4f7ef8', fontSize: 13 }}>Import your first trades →</Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2336' }}>
                    {['Date','Contract','Direction','Session','Entry','Exit','Net P&L','Result'].map(h => (
                      <th key={h} className="text-left pb-2 text-[11px] font-medium" style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 8).map(trade => (
                    <tr key={trade.id} style={{ borderBottom: '1px solid #1a1e2e' }}>
                      <td className="py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{trade.date}</td>
                      <td className="py-2.5 text-[13px] font-medium" style={{ color: '#e2e8ff' }}>{trade.contract}</td>
                      <td className="py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: trade.direction === 'Long' ? '#0f2040' : '#2a1f0f', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{trade.session}</td>
                      <td className="py-2.5 text-[13px] font-mono" style={{ color: '#8892b8' }}>{trade.entry_price}</td>
                      <td className="py-2.5 text-[13px] font-mono" style={{ color: '#8892b8' }}>{trade.exit_price}</td>
                      <td className="py-2.5 text-[13px] font-semibold" style={{ color: trade.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                        {fmtCurrency(trade.net_pnl, true)}
                      </td>
                      <td className="py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: trade.net_pnl > 0 ? '#0f2a1a' : trade.net_pnl < 0 ? '#2a0f0f' : '#1e2336', color: trade.net_pnl > 0 ? '#22c55e' : trade.net_pnl < 0 ? '#ef4444' : '#8892b8' }}>
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
            <div className="text-center py-8" style={{ color: '#4a5270' }}>
              <p>No open positions</p>
              <p className="text-[12px] mt-1">Open positions tracking coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
