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
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function calcEdgeScore(a: Analytics): number {
  if (!a.totalTrades) return 0;
  const winScore = Math.min(a.winRate, 100) * 0.25;
  const pfScore = Math.min(a.profitFactor >= 999 ? 100 : a.profitFactor * 20, 100) * 0.20;
  const rrScore = Math.min(a.avgRR * 25, 100) * 0.20;
  const consistencyScore = Math.min((1 - a.longestLossStreak / Math.max(a.totalTrades, 1)) * 100, 100) * 0.20;
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

  const dayStreak = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    trades.forEach(t => { dailyMap[t.date] = (dailyMap[t.date] || 0) + t.net_pnl; });
    const sortedDays = Object.entries(dailyMap).sort((a, b) => b[0].localeCompare(a[0]));
    let count = 0;
    let type: 'W' | 'L' | null = null;
    for (const [, pnl] of sortedDays) {
      const isWin = pnl > 0;
      if (type === null) { type = isWin ? 'W' : 'L'; count = 1; }
      else if ((type === 'W' && isWin) || (type === 'L' && !isWin)) count++;
      else break;
    }
    return { count, type };
  }, [trades]);

  const radarData = [
    { subject: 'Win %', value: Math.min(a.winRate, 100) },
    { subject: 'Consistency', value: Math.min((1 - a.longestLossStreak / Math.max(a.totalTrades, 1)) * 100, 100) },
    { subject: 'Prof. Factor', value: Math.min(a.profitFactor >= 999 ? 100 : a.profitFactor * 20, 100) },
    { subject: 'Avg W/L', value: Math.min(a.avgRR * 25, 100) },
    { subject: 'Drawdown', value: Math.max(0, 100 - Math.abs(a.worstDay) / Math.max(a.totalNetPnl + 1, 1) * 10) },
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

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const monthPnl = Object.values(dayMap).reduce((a, d) => a + d.pnl, 0);
  const tradingDays = Object.keys(dayMap).length;

  const weeks = useMemo(() => {
    const result: { pnl: number; label: string }[] = [];
    let current = { pnl: 0 };
    let col = firstDay;
    let weekIdx = 0;
    const getRange = (wIdx: number) => {
      const startOffset = wIdx * 7 - firstDay;
      const s = new Date(calYear, calMonth, Math.max(1, startOffset + 1));
      const e = new Date(calYear, calMonth, Math.min(daysInMonth, startOffset + 7));
      const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${fmt(s)}-${fmt(e)}`;
    };
    for (let d = 1; d <= daysInMonth; d++) {
      if (dayMap[d]) current.pnl += dayMap[d].pnl;
      col++;
      if (col === 7 || d === daysInMonth) {
        result.push({ ...current, label: getRange(weekIdx) });
        current = { pnl: 0 };
        col = 0;
        weekIdx++;
      }
    }
    return result;
  }, [dayMap, calYear, calMonth, firstDay, daysInMonth]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)' }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: isProfit ? '#22c55e' : '#ef4444' }}>Equity: {fmtCurrency(payload[0]?.value)}</p>
      </div>
    );
  };

  const avgWinLossDisplay = a.losses === 0 ? (a.avgWin > 0 ? fmtCurrency(a.avgWin) : '—') : a.avgRR.toFixed(2);
  const profitFactorDisplay = a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2);
  const profitFactorColor = a.losses === 0 ? '#22c55e' : a.profitFactor >= 1 ? '#22c55e' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{trades.length} total trades</p>
        </div>
        <Link href="/import" style={{ background: '#4f7ef8', color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
          + Import
        </Link>
      </div>

      {/* Stats grid - 2 cols on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Net P&L', value: fmtCurrency(a.totalNetPnl, true), color: a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444', sub: `${a.totalTrades} trades` },
          { label: 'Win %', value: fmtPercent(a.winRate), color: a.winRate >= 50 ? '#22c55e' : '#ef4444', sub: `${a.wins}W · ${a.losses}L` },
          { label: a.losses === 0 ? 'Avg Win' : 'Avg W/L', value: avgWinLossDisplay, color: '#22c55e', sub: a.losses === 0 ? 'No losses yet' : 'ratio' },
          { label: 'Profit Factor', value: profitFactorDisplay, color: profitFactorColor, sub: a.losses === 0 ? 'No losses yet' : 'W/L ratio' },
          { label: 'Day Streak', value: dayStreak.type ? `${dayStreak.count} ${dayStreak.type}` : '—', color: dayStreak.type === 'W' ? '#22c55e' : dayStreak.type === 'L' ? '#ef4444' : 'var(--text-2)', sub: 'consecutive days' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px', borderRadius: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: '0 0 4px 0', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Equity Chart */}
      <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>Cumulative P&L</p>
        {equity.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equity} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="equity" stroke={isProfit ? '#22c55e' : '#ef4444'} strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>No trades yet</div>
        )}
      </div>

      {/* Edge Score */}
      <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Edge Score</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor }}>{edgeScore}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${scoreColor}20`, color: scoreColor }}>{scoreLabel}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-2)', fontSize: 9 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Edge" dataKey="value" stroke={scoreColor} fill={scoreColor} fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden', marginTop: 4 }}>
          <div style={{ height: '100%', width: `${edgeScore}%`, background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)', borderRadius: 3 }} />
        </div>
      </div>

      {/* Calendar */}
      <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ color: monthPnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{fmtCurrency(monthPnl, true)}</span>
            <span style={{ color: 'var(--text-3)' }}>{tradingDays}d</span>
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-3)', padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells - mobile optimized, no weekly column */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const data = dayMap[d];
            const isToday = today.getDate() === d && today.getMonth() === calMonth && today.getFullYear() === calYear;
            const pnl = data?.pnl ?? 0;
            let bg = 'transparent', pnlColor = 'var(--text-3)', border = '1px solid var(--border)';
            if (data) {
              if (pnl > 0) { bg = 'rgba(34,197,94,0.1)'; pnlColor = '#22c55e'; border = '1px solid rgba(34,197,94,0.25)'; }
              else if (pnl < 0) { bg = 'rgba(239,68,68,0.1)'; pnlColor = '#ef4444'; border = '1px solid rgba(239,68,68,0.25)'; }
              else { bg = 'var(--bg-hover)'; }
            }
            if (isToday) border = '1px solid #4f7ef8';
            return (
              <div key={d} style={{ background: bg, border, borderRadius: 8, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 2, minHeight: 40 }}>
                <span style={{ fontSize: 8, color: 'var(--text-3)', lineHeight: 1 }}>{d}</span>
                {data && (
                  <>
                    <span style={{ fontSize: 7, color: 'var(--text-3)', lineHeight: 1 }}>{data.count}T</span>
                    <span style={{ fontSize: 7, fontWeight: 700, color: pnlColor, lineHeight: 1, textAlign: 'center' }}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl) >= 1000 ? `${(Math.abs(pnl) / 1000).toFixed(1)}k` : Math.abs(pnl).toFixed(0)}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Weekly totals - shown below on mobile */}
        {weeks.some(w => w.pnl !== 0) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Weekly Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {weeks.filter(w => w.pnl !== 0).map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: w.pnl > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{w.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: w.pnl > 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(w.pnl, true)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 20, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {(['recent', 'open'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ fontSize: 13, fontWeight: 700, color: activeTab === tab ? 'var(--text)' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 4, borderBottom: activeTab === tab ? '2px solid #4f7ef8' : '2px solid transparent' }}>
              {tab === 'recent' ? 'Recent Trades' : 'Open Positions'}
            </button>
          ))}
        </div>
        <div style={{ padding: 16 }}>
          {activeTab === 'recent' && (
            trades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>No trades yet</p>
                <Link href="/import" style={{ color: '#4f7ef8', fontSize: 13 }}>Import your first trades →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trades.slice(0, 6).map(trade => (
                  <div key={trade.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{trade.contract}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: trade.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                          {trade.direction}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{trade.date} · {trade.session} · {trade.entry_price} → {trade.exit_price}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: trade.net_pnl >= 0 ? '#22c55e' : '#ef4444', margin: '0 0 4px 0' }}>{fmtCurrency(trade.net_pnl, true)}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: trade.net_pnl > 0 ? 'rgba(34,197,94,0.1)' : trade.net_pnl < 0 ? 'rgba(239,68,68,0.1)' : 'var(--bg-card)', color: trade.net_pnl > 0 ? '#22c55e' : trade.net_pnl < 0 ? '#ef4444' : 'var(--text-2)' }}>
                        {trade.net_pnl > 0 ? 'Win' : trade.net_pnl < 0 ? 'Loss' : 'B/E'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {activeTab === 'open' && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-2)' }}>No open positions</div>
          )}
        </div>
      </div>
    </div>
  );
}
