'use client';
import { Trade } from '@/types';
import { calcAnalytics, fmtCurrency, fmtPercent } from '@/lib/analytics';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { trades: Trade[]; }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-5 mb-4" style={{ background: '#12151f', border: '1px solid #252b40' }}>
    <h2 className="text-[12px] font-medium mb-4" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h2>
    {children}
  </div>
);

const Row = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1e2336' }}>
    <span className="text-[13px]" style={{ color: '#8892b8' }}>{label}</span>
    <div className="text-right">
      <span className="text-[13px] font-medium" style={{ color: color || '#e2e8ff' }}>{value}</span>
      {sub && <span className="text-[11px] ml-2" style={{ color: '#4a5270' }}>{sub}</span>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: '#1e2336', border: '1px solid #313856', color: '#e2e8ff' }}>
      <p style={{ color: '#8892b8' }}>{label}</p>
      {payload.map((p: any) => <p key={p.dataKey}>{p.name}: {fmtCurrency(p.value)}</p>)}
    </div>
  );
};

export default function ReportsClient({ trades }: Props) {
  const a = calcAnalytics(trades);

  if (!trades.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-6" style={{ color: '#e2e8ff' }}>Reports</h1>
        <div className="rounded-xl p-10 text-center" style={{ background: '#12151f', border: '1px solid #252b40' }}>
          <div className="text-4xl mb-3">📊</div>
          <p style={{ color: '#8892b8' }}>Log trades to generate reports</p>
        </div>
      </div>
    );
  }

  const dowMap: Record<string, { pnl: number; count: number }> = { Sun:{pnl:0,count:0},Mon:{pnl:0,count:0},Tue:{pnl:0,count:0},Wed:{pnl:0,count:0},Thu:{pnl:0,count:0},Fri:{pnl:0,count:0},Sat:{pnl:0,count:0} };
  trades.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    dowMap[day].pnl += t.net_pnl; dowMap[day].count++;
  });
  const dowData = Object.entries(dowMap).map(([name, v]) => ({ name, pnl: +v.pnl.toFixed(2), count: v.count }));

  const tagMap: Record<string, { pnl: number; count: number; wins: number }> = {};
  trades.forEach(t => t.setup_tags.forEach(tag => {
    if (!tagMap[tag]) tagMap[tag] = { pnl: 0, count: 0, wins: 0 };
    tagMap[tag].pnl += t.net_pnl; tagMap[tag].count++;
    if (t.net_pnl > 0) tagMap[tag].wins++;
  }));
  const tagData = Object.entries(tagMap).map(([name, v]) => ({ name, pnl: +v.pnl.toFixed(2), count: v.count, wr: +(v.wins/v.count*100).toFixed(1) })).sort((a,b) => b.pnl - a.pnl);

  const mistakeMap: Record<string, { pnl: number; count: number }> = {};
  trades.forEach(t => t.mistake_tags.forEach(tag => {
    if (!mistakeMap[tag]) mistakeMap[tag] = { pnl: 0, count: 0 };
    mistakeMap[tag].pnl += t.net_pnl; mistakeMap[tag].count++;
  }));
  const mistakeData = Object.entries(mistakeMap).sort((a,b) => a[1].pnl - b[1].pnl);

  return (
    <div className="p-6 max-w-[1200px]">
      <h1 className="text-xl font-semibold mb-6" style={{ color: '#e2e8ff' }}>Reports & Analytics</h1>

      <Section title="Performance Overview">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8">
          <div>
            <Row label="Total Trades" value={a.totalTrades.toString()} />
            <Row label="Net P&L" value={fmtCurrency(a.totalNetPnl, true)} color={a.totalNetPnl >= 0 ? '#22c55e' : '#ef4444'} />
            <Row label="Win Rate" value={fmtPercent(a.winRate)} color={a.winRate >= 50 ? '#22c55e' : '#ef4444'} sub={`${a.wins}W / ${a.losses}L`} />
            <Row label="Profit Factor" value={a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2)} color={a.profitFactor >= 1 ? '#22c55e' : '#ef4444'} />
          </div>
          <div>
            <Row label="Avg Win" value={fmtCurrency(a.avgWin)} color="#22c55e" />
            <Row label="Avg Loss" value={fmtCurrency(a.avgLoss)} color="#ef4444" />
            <Row label="Avg R:R" value={a.avgRR.toFixed(2)} color={a.avgRR >= 1 ? '#22c55e' : '#f59e0b'} />
            <Row label="Avg R-Multiple" value={`${a.avgRMultiple.toFixed(2)}R`} color={a.avgRMultiple >= 0 ? '#22c55e' : '#ef4444'} />
          </div>
          <div>
            <Row label="Best Day" value={fmtCurrency(a.bestDay, true)} color="#22c55e" />
            <Row label="Worst Day" value={fmtCurrency(a.worstDay, true)} color="#ef4444" />
            <Row label="Largest Win" value={fmtCurrency(a.largestWin)} color="#22c55e" />
            <Row label="Largest Loss" value={fmtCurrency(Math.abs(a.largestLoss))} color="#ef4444" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 mt-2">
          <Row label="Win Streak" value={`${a.longestWinStreak} trades`} color="#22c55e" />
          <Row label="Loss Streak" value={`${a.longestLossStreak} trades`} color="#ef4444" />
          <Row label="Avg Trades/Day" value={a.avgTradesPerDay.toFixed(1)} />
          <Row label="Breakevens" value={a.breakevens.toString()} />
        </div>
      </Section>

      <Section title="P&L by Day of Week">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dowData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2336" />
            <XAxis dataKey="name" tick={{ fill: '#4a5270', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>
              {dowData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {tagData.length > 0 && (
        <Section title="Performance by Setup">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2336' }}>
                {['Setup','Trades','Win Rate','Total P&L','Avg P&L'].map(h => (
                  <th key={h} className="text-left pb-2 text-[11px]" style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tagData.map(row => (
                <tr key={row.name} style={{ borderBottom: '1px solid #1e2336' }}>
                  <td className="py-2.5"><span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#0f2040', color: '#4f7ef8' }}>{row.name}</span></td>
                  <td className="py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{row.count}</td>
                  <td className="py-2.5 text-[13px]" style={{ color: row.wr >= 50 ? '#22c55e' : '#ef4444' }}>{row.wr}%</td>
                  <td className="py-2.5 text-[13px] font-medium" style={{ color: row.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(row.pnl, true)}</td>
                  <td className="py-2.5 text-[13px]" style={{ color: row.pnl/row.count >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(row.pnl/row.count, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {mistakeData.length > 0 && (
        <Section title="Mistake Analysis">
          <div className="grid grid-cols-2 gap-3">
            {mistakeData.map(([tag, v]) => (
              <div key={tag} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#1e2336' }}>
                <div>
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded" style={{ background: '#2a0f0f', color: '#ef4444' }}>{tag}</span>
                  <span className="text-[11px] ml-2" style={{ color: '#4a5270' }}>{v.count}x</span>
                </div>
                <span className="text-[13px] font-medium" style={{ color: v.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(v.pnl, true)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
