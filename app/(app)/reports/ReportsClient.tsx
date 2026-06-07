'use client';
import { useMemo, useState } from 'react';
import { Trade } from '@/types';
import { calcAnalytics, fmtCurrency, fmtPercent } from '@/lib/analytics';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts';

interface Props { trades: Trade[]; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)' }}>
      <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.value >= 0 ? '#22c55e' : '#ef4444' }}>
          {p.name}: {typeof p.value === 'number' && p.name?.includes('%') ? fmtPercent(p.value) : fmtCurrency(p.value, true)}
        </p>
      ))}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl p-5 card mb-4">
    <h2 className="text-[13px] font-bold mb-5" style={{ color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h2>
    {children}
  </div>
);

const StatRow = ({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
    <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{label}</span>
    <div className="text-right">
      <span className="text-[13px] font-semibold" style={{ color: color || 'var(--text)' }}>{value}</span>
      {sub && <span className="text-[11px] ml-2" style={{ color: 'var(--text-3)' }}>{sub}</span>}
    </div>
  </div>
);

export default function ReportsClient({ trades }: Props) {
  const [activeFilter, setActiveFilter] = useState('all');
  const a = calcAnalytics(trades);

  const filteredTrades = useMemo(() => {
    if (activeFilter === 'all') return trades;
    return trades.filter(t => t.contract === activeFilter);
  }, [trades, activeFilter]);

  const contracts = useMemo(() => [...new Set(trades.map(t => t.contract))], [trades]);

  // P&L by day of week
  const dowData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {
      Mon: { pnl: 0, count: 0, wins: 0 }, Tue: { pnl: 0, count: 0, wins: 0 },
      Wed: { pnl: 0, count: 0, wins: 0 }, Thu: { pnl: 0, count: 0, wins: 0 },
      Fri: { pnl: 0, count: 0, wins: 0 },
    };
    filteredTrades.forEach(t => {
      const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(t.date + 'T12:00:00').getDay()];
      if (map[day]) { map[day].pnl += t.net_pnl; map[day].count++; if (t.net_pnl > 0) map[day].wins++; }
    });
    return Object.entries(map).map(([name, v]) => ({
      name, pnl: +v.pnl.toFixed(2), count: v.count,
      winRate: v.count ? +(v.wins / v.count * 100).toFixed(1) : 0,
    }));
  }, [filteredTrades]);

  // P&L by hour
  const hourData = useMemo(() => {
    const map: Record<number, { pnl: number; count: number; wins: number }> = {};
    filteredTrades.forEach(t => {
      // Use session to infer hour bucket
      const session = t.session;
      const hour = session === 'Pre-Market' ? 8 : session === 'RTH' ? 9 : session === 'After-Hours' ? 16 : 18;
      if (!map[hour]) map[hour] = { pnl: 0, count: 0, wins: 0 };
      map[hour].pnl += t.net_pnl; map[hour].count++;
      if (t.net_pnl > 0) map[hour].wins++;
    });
    return Object.entries(map).sort((a, b) => +a[0] - +b[0]).map(([h, v]) => ({
      name: `${h}:00`, pnl: +v.pnl.toFixed(2), count: v.count,
      winRate: v.count ? +(v.wins / v.count * 100).toFixed(1) : 0,
    }));
  }, [filteredTrades]);

  // P&L by session
  const sessionData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {
      'Overnight': { pnl: 0, count: 0, wins: 0 },
      'Pre-Market': { pnl: 0, count: 0, wins: 0 },
      'RTH': { pnl: 0, count: 0, wins: 0 },
      'After-Hours': { pnl: 0, count: 0, wins: 0 },
    };
    filteredTrades.forEach(t => {
      if (map[t.session]) {
        map[t.session].pnl += t.net_pnl; map[t.session].count++;
        if (t.net_pnl > 0) map[t.session].wins++;
      }
    });
    return Object.entries(map).filter(([, v]) => v.count > 0).map(([name, v]) => ({
      name, pnl: +v.pnl.toFixed(2), count: v.count,
      winRate: v.count ? +(v.wins / v.count * 100).toFixed(1) : 0,
    }));
  }, [filteredTrades]);

  // P&L by contract
  const contractData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    filteredTrades.forEach(t => {
      if (!map[t.contract]) map[t.contract] = { pnl: 0, count: 0, wins: 0 };
      map[t.contract].pnl += t.net_pnl; map[t.contract].count++;
      if (t.net_pnl > 0) map[t.contract].wins++;
    });
    return Object.entries(map).map(([name, v]) => ({
      name, pnl: +v.pnl.toFixed(2), count: v.count,
      winRate: v.count ? +(v.wins / v.count * 100).toFixed(1) : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Monthly P&L
  const monthlyData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    filteredTrades.forEach(t => {
      const month = t.date.slice(0, 7);
      if (!map[month]) map[month] = { pnl: 0, count: 0, wins: 0 };
      map[month].pnl += t.net_pnl; map[month].count++;
      if (t.net_pnl > 0) map[month].wins++;
    });
    return Object.entries(map).sort().map(([month, v]) => ({
      name: month, pnl: +v.pnl.toFixed(2), count: v.count,
      winRate: v.count ? +(v.wins / v.count * 100).toFixed(1) : 0,
    }));
  }, [filteredTrades]);

  // Setup tag performance
  const setupData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    filteredTrades.forEach(t => t.setup_tags.forEach(tag => {
      if (!map[tag]) map[tag] = { pnl: 0, count: 0, wins: 0 };
      map[tag].pnl += t.net_pnl; map[tag].count++;
      if (t.net_pnl > 0) map[tag].wins++;
    }));
    return Object.entries(map).map(([name, v]) => ({
      name, pnl: +v.pnl.toFixed(2), count: v.count,
      winRate: v.count ? +(v.wins / v.count * 100).toFixed(1) : 0,
      avgPnl: +(v.pnl / v.count).toFixed(2),
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Mistake tag analysis
  const mistakeData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    filteredTrades.forEach(t => t.mistake_tags.forEach(tag => {
      if (!map[tag]) map[tag] = { pnl: 0, count: 0 };
      map[tag].pnl += t.net_pnl; map[tag].count++;
    }));
    return Object.entries(map).map(([name, v]) => ({
      name, pnl: +v.pnl.toFixed(2), count: v.count, avgPnl: +(v.pnl / v.count).toFixed(2),
    })).sort((a, b) => a.pnl - b.pnl);
  }, [filteredTrades]);

  // Best & worst trades
  const bestTrades = useMemo(() => [...filteredTrades].sort((a, b) => b.net_pnl - a.net_pnl).slice(0, 5), [filteredTrades]);
  const worstTrades = useMemo(() => [...filteredTrades].sort((a, b) => a.net_pnl - b.net_pnl).slice(0, 5), [filteredTrades]);

  // Win rate over time
  const winRateOverTime = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((_, i) => {
      const slice = sorted.slice(0, i + 1);
      const wins = slice.filter(t => t.net_pnl > 0).length;
      return { trade: i + 1, winRate: +(wins / slice.length * 100).toFixed(1) };
    });
  }, [filteredTrades]);

  if (!trades.length) {
    return (
      <div className="p-6">
        <h1 className="text-[22px] font-bold mb-6" style={{ color: 'var(--text)' }}>Reports</h1>
        <div className="rounded-2xl p-12 text-center card">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-[16px] font-medium mb-2" style={{ color: 'var(--text)' }}>No trades to report yet</p>
          <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>Import your trades to unlock full analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text)' }}>Reports</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-2)' }}>{filteredTrades.length} trades analyzed</p>
        </div>
        {/* Contract filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {['all', ...contracts].map(c => (
            <button key={c} onClick={() => setActiveFilter(c)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: activeFilter === c ? '#4f7ef8' : 'var(--bg-hover)',
                color: activeFilter === c ? '#fff' : 'var(--text-2)',
                border: `1px solid ${activeFilter === c ? '#4f7ef8' : 'var(--border)'}`,
                cursor: 'pointer',
              }}>
              {c === 'all' ? 'All Contracts' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Overview */}
      <Section title="Performance Overview">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8">
          <div>
            <StatRow label="Total Trades" value={a.totalTrades.toString()} />
            <StatRow label="Net P&L" value={fmtCurrency(a.totalNetPnl, true)} color={a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444'} />
            <StatRow label="Win Rate" value={fmtPercent(a.winRate)} color={a.winRate >= 50 ? '#22c55e' : '#ef4444'} sub={`${a.wins}W / ${a.losses}L`} />
            <StatRow label="Profit Factor" value={a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2)} color={a.profitFactor >= 1 ? '#22c55e' : '#ef4444'} />
          </div>
          <div>
            <StatRow label="Avg Win" value={fmtCurrency(a.avgWin)} color="#22c55e" />
            <StatRow label="Avg Loss" value={fmtCurrency(Math.abs(a.avgLoss))} color="#ef4444" />
            <StatRow label="Avg R:R" value={a.avgRR.toFixed(2)} color={a.avgRR >= 1 ? '#22c55e' : '#f59e0b'} />
            <StatRow label="Avg R-Multiple" value={`${a.avgRMultiple.toFixed(2)}R`} color={a.avgRMultiple >= 0 ? '#22c55e' : '#ef4444'} />
          </div>
          <div>
            <StatRow label="Best Day" value={fmtCurrency(a.bestDay, true)} color="#22c55e" />
            <StatRow label="Worst Day" value={fmtCurrency(a.worstDay, true)} color="#ef4444" />
            <StatRow label="Largest Win" value={fmtCurrency(a.largestWin)} color="#22c55e" />
            <StatRow label="Largest Loss" value={fmtCurrency(Math.abs(a.largestLoss))} color="#ef4444" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 mt-1">
          <StatRow label="Win Streak" value={`${a.longestWinStreak} trades`} color="#22c55e" />
          <StatRow label="Loss Streak" value={`${a.longestLossStreak} trades`} color="#ef4444" />
          <StatRow label="Avg Trades/Day" value={a.avgTradesPerDay.toFixed(1)} />
          <StatRow label="Breakevens" value={a.breakevens.toString()} />
        </div>
      </Section>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Section title="P&L by Day of Week">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
                {dowData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="P&L by Session">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sessionData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
                {sessionData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Section title="P&L by Contract">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={contractData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-2)', fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[0,4,4,0]}>
                {contractData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#4f7ef8' : '#ef4444'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Monthly P&L">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
                {monthlyData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Win Rate Over Time */}
      <Section title="Win Rate Over Time">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={winRateOverTime} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="wrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f7ef8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4f7ef8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="trade" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Trade #', position: 'insideBottom', fill: 'var(--text-3)', fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="winRate" name="Win Rate %" stroke="#4f7ef8" strokeWidth={2} fill="url(#wrGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Section>

      {/* Setup Performance */}
      {setupData.length > 0 && (
        <Section title="Performance by Setup">
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Setup', 'Trades', 'Win Rate', 'Total P&L', 'Avg P&L'].map(h => (
                    <th key={h} className="text-left pb-2.5 text-[11px] font-bold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {setupData.map(row => (
                  <tr key={row.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(79,126,248,0.1)', color: '#4f7ef8' }}>{row.name}</span>
                    </td>
                    <td className="py-2.5 text-[13px]" style={{ color: 'var(--text-2)' }}>{row.count}</td>
                    <td className="py-2.5 text-[13px] font-semibold" style={{ color: row.winRate >= 50 ? '#22c55e' : '#ef4444' }}>{row.winRate}%</td>
                    <td className="py-2.5 text-[13px] font-semibold" style={{ color: row.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(row.pnl, true)}</td>
                    <td className="py-2.5 text-[13px]" style={{ color: row.avgPnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(row.avgPnl, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Mistake Analysis */}
      {mistakeData.length > 0 && (
        <Section title="Mistake Analysis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mistakeData.map(row => (
              <div key={row.name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{row.name}</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{row.count}x</span>
                </div>
                <span className="text-[13px] font-semibold" style={{ color: row.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(row.pnl, true)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Best & Worst Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Best Trades">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Contract', 'Direction', 'Net P&L'].map(h => (
                  <th key={h} className="text-left pb-2 text-[11px] font-bold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bestTrades.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 text-[12px]" style={{ color: 'var(--text-2)' }}>{t.date}</td>
                  <td className="py-2 text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{t.contract}</td>
                  <td className="py-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: t.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>{t.direction}</span>
                  </td>
                  <td className="py-2 text-[13px] font-bold" style={{ color: '#22c55e' }}>{fmtCurrency(t.net_pnl, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Worst Trades">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Contract', 'Direction', 'Net P&L'].map(h => (
                  <th key={h} className="text-left pb-2 text-[11px] font-bold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {worstTrades.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 text-[12px]" style={{ color: 'var(--text-2)' }}>{t.date}</td>
                  <td className="py-2 text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{t.contract}</td>
                  <td className="py-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: t.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>{t.direction}</span>
                  </td>
                  <td className="py-2 text-[13px] font-bold" style={{ color: '#ef4444' }}>{fmtCurrency(t.net_pnl, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
