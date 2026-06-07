'use client';
import { useMemo, useState } from 'react';
import { Trade } from '@/types';
import { calcAnalytics, fmtCurrency, fmtPercent } from '@/lib/analytics';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';

interface Props { trades: Trade[]; }

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text)' }}>
      <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.value >= 0 ? '#22c55e' : '#ef4444' }}>
          {fmtCurrency(p.value, true)}
        </p>
      ))}
    </div>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card" style={{ padding: 16, borderRadius: 16, marginBottom: 12 }}>
    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px 0' }}>{title}</p>
    {children}
  </div>
);

const Row = ({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{sub}</span>}
    </div>
  </div>
);

export default function ReportsClient({ trades }: Props) {
  const [filter, setFilter] = useState('all');
  const a = calcAnalytics(trades);
  const contracts = useMemo(() => [...new Set(trades.map(t => t.contract))], [trades]);

  const ft = useMemo(() => filter === 'all' ? trades : trades.filter(t => t.contract === filter), [trades, filter]);

  const dowData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = { Mon: { pnl: 0, count: 0 }, Tue: { pnl: 0, count: 0 }, Wed: { pnl: 0, count: 0 }, Thu: { pnl: 0, count: 0 }, Fri: { pnl: 0, count: 0 } };
    ft.forEach(t => {
      const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(t.date + 'T12:00:00').getDay()];
      if (map[day]) { map[day].pnl += t.net_pnl; map[day].count++; }
    });
    return Object.entries(map).map(([name, v]) => ({ name, pnl: +v.pnl.toFixed(2) }));
  }, [ft]);

  const sessionData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = { Overnight: { pnl: 0, count: 0 }, 'Pre-Market': { pnl: 0, count: 0 }, RTH: { pnl: 0, count: 0 }, 'After-Hours': { pnl: 0, count: 0 } };
    ft.forEach(t => { if (map[t.session]) { map[t.session].pnl += t.net_pnl; map[t.session].count++; } });
    return Object.entries(map).filter(([, v]) => v.count > 0).map(([name, v]) => ({ name, pnl: +v.pnl.toFixed(2) }));
  }, [ft]);

  const contractData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    ft.forEach(t => {
      if (!map[t.contract]) map[t.contract] = { pnl: 0, count: 0, wins: 0 };
      map[t.contract].pnl += t.net_pnl; map[t.contract].count++;
      if (t.net_pnl > 0) map[t.contract].wins++;
    });
    return Object.entries(map).map(([name, v]) => ({ name, pnl: +v.pnl.toFixed(2), wr: +(v.wins / v.count * 100).toFixed(1) })).sort((a, b) => b.pnl - a.pnl);
  }, [ft]);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    ft.forEach(t => { const m = t.date.slice(0, 7); map[m] = (map[m] || 0) + t.net_pnl; });
    return Object.entries(map).sort().map(([name, pnl]) => ({ name: name.slice(5), pnl: +pnl.toFixed(2) }));
  }, [ft]);

  const setupData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    ft.forEach(t => t.setup_tags.forEach(tag => {
      if (!map[tag]) map[tag] = { pnl: 0, count: 0, wins: 0 };
      map[tag].pnl += t.net_pnl; map[tag].count++;
      if (t.net_pnl > 0) map[tag].wins++;
    }));
    return Object.entries(map).map(([name, v]) => ({ name, pnl: +v.pnl.toFixed(2), count: v.count, wr: +(v.wins / v.count * 100).toFixed(1), avg: +(v.pnl / v.count).toFixed(2) })).sort((a, b) => b.pnl - a.pnl);
  }, [ft]);

  const bestTrades = useMemo(() => [...ft].sort((a, b) => b.net_pnl - a.net_pnl).slice(0, 5), [ft]);
  const worstTrades = useMemo(() => [...ft].sort((a, b) => a.net_pnl - b.net_pnl).slice(0, 5), [ft]);

  if (!trades.length) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>Reports</h1>
        <div className="card" style={{ padding: 48, textAlign: 'center', borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No trades to report yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Import your trades to unlock full analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Reports</h1>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{ft.length} trades analyzed</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', ...contracts].map(c => (
            <button key={c} onClick={() => setFilter(c)}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: filter === c ? '#4f7ef8' : 'var(--bg-hover)', color: filter === c ? '#fff' : 'var(--text-2)', border: `1px solid ${filter === c ? '#4f7ef8' : 'var(--border)'}`, cursor: 'pointer' }}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      <Card title="Performance Overview">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <Row label="Total Trades" value={a.totalTrades.toString()} />
            <Row label="Net P&L" value={fmtCurrency(a.totalNetPnl, true)} color={a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444'} />
            <Row label="Win Rate" value={fmtPercent(a.winRate)} color={a.winRate >= 50 ? '#22c55e' : '#ef4444'} sub={`${a.wins}W/${a.losses}L`} />
            <Row label="Profit Factor" value={a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2)} color={a.profitFactor >= 1 ? '#22c55e' : '#ef4444'} />
          </div>
          <div>
            <Row label="Avg Win" value={fmtCurrency(a.avgWin)} color="#22c55e" />
            <Row label="Avg Loss" value={fmtCurrency(Math.abs(a.avgLoss))} color="#ef4444" />
            <Row label="Best Day" value={fmtCurrency(a.bestDay, true)} color="#22c55e" />
            <Row label="Worst Day" value={fmtCurrency(a.worstDay, true)} color="#ef4444" />
          </div>
        </div>
      </Card>

      {/* Charts */}
      <Card title="P&L by Day of Week">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={dowData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {dowData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="P&L by Session">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={sessionData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {sessionData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="P&L by Contract">
        <ResponsiveContainer width="100%" height={Math.max(100, contractData.length * 44)}>
          <BarChart data={contractData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
            <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-2)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
              {contractData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#4f7ef8' : '#ef4444'} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Monthly P&L">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {monthlyData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Setup performance */}
      {setupData.length > 0 && (
        <Card title="Setup Performance">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {setupData.map(row => (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-hover)' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,126,248,0.1)', color: '#4f7ef8' }}>{row.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{row.count} trades · {row.wr}% win</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(row.pnl, true)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Best & Worst */}
      <Card title="Best Trades">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bestTrades.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.contract}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: t.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>{t.direction}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.date}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{fmtCurrency(t.net_pnl, true)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Worst Trades">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {worstTrades.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.contract}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: t.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>{t.direction}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.date}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{fmtCurrency(t.net_pnl, true)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
