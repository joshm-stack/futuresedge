'use client';
import { Trade, Analytics, DailyStats } from '@/types';
import { fmtCurrency } from '@/lib/analytics';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Props {
  trades: Trade[];
  equity: { date: string; equity: number }[];
  daily: DailyStats[];
  analytics: Analytics;
}

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
    <p className="text-[11px] font-medium mb-4" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: '#1e2336', border: '1px solid #313856', color: '#e2e8ff' }}>
      <p style={{ color: '#8892b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color || '#e2e8ff' }}>
          {p.name}: {typeof p.value === 'number' ? fmtCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardCharts({ trades, equity, daily, analytics }: Props) {
  const isProfit = analytics.totalNetPnl >= 0;

  const sessions = ['Overnight', 'Pre-Market', 'RTH', 'After-Hours'];
  const sessionData = sessions.map(s => ({
    name: s,
    pnl: +trades.filter(t => t.session === s).reduce((a, t) => a + t.net_pnl, 0).toFixed(2),
  }));

  const contractMap: Record<string, number> = {};
  trades.forEach(t => { contractMap[t.contract] = (contractMap[t.contract] || 0) + t.net_pnl; });
  const contractData = Object.entries(contractMap)
    .map(([name, pnl]) => ({ name, pnl: +pnl.toFixed(2) }))
    .sort((a, b) => b.pnl - a.pnl).slice(0, 8);

  const wlData = [
    { name: 'Wins', value: analytics.wins },
    { name: 'Losses', value: analytics.losses },
    { name: 'B/E', value: analytics.breakevens },
  ].filter(d => d.value > 0);
  const WL_COLORS = ['#22c55e', '#ef4444', '#4a5270'];

  const dailyBars = daily.slice(-30).map(d => ({
    date: d.date.slice(5),
    pnl: +d.net_pnl.toFixed(2),
  }));

  if (!trades.length) {
    return (
      <div className="rounded-xl p-10 text-center" style={{ background: '#12151f', border: '1px solid #252b40' }}>
        <div className="text-4xl mb-3">📊</div>
        <p className="font-medium mb-1" style={{ color: '#8892b8' }}>No trades yet</p>
        <p className="text-sm" style={{ color: '#4a5270' }}>Log your first trade to start seeing analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartCard title="Equity Curve">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={equity} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.15} />
                <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2336" />
            <XAxis dataKey="date" tick={{ fill: '#4a5270', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#4a5270', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v.toLocaleString()} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="equity" name="Equity" stroke={isProfit ? '#22c55e' : '#ef4444'} strokeWidth={2} fill="url(#eqGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Daily P&L (last 30 days)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2336" />
              <XAxis dataKey="date" tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[3, 3, 0, 0]}>
                {dailyBars.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Win / Loss Breakdown">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={wlData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value">
                  {wlData.map((_, i) => <Cell key={i} fill={WL_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {[
                { label: 'Wins', val: analytics.wins, color: '#22c55e', pct: analytics.winRate },
                { label: 'Losses', val: analytics.losses, color: '#ef4444', pct: analytics.losses / (analytics.totalTrades || 1) * 100 },
                { label: 'Breakeven', val: analytics.breakevens, color: '#4a5270', pct: analytics.breakevens / (analytics.totalTrades || 1) * 100 },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                  <span className="text-[12px] flex-1" style={{ color: '#8892b8' }}>{row.label}</span>
                  <span className="text-[12px] font-medium" style={{ color: row.color }}>{row.val}</span>
                  <span className="text-[11px]" style={{ color: '#4a5270' }}>({row.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="P&L by Session">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sessionData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2336" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#8892b8', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[0, 3, 3, 0]}>
                {sessionData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="P&L by Contract">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={contractData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2336" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#4a5270', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#8892b8', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" name="P&L" radius={[0, 3, 3, 0]}>
                {contractData.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#4f7ef8' : '#ef4444'} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
