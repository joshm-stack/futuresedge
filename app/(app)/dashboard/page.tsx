import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Trade } from '@/types';
import { calcAnalytics, calcDailyStats, calcEquityCurve, fmtCurrency, fmtPercent } from '@/lib/analytics';
import DashboardCharts from '@/components/charts/DashboardCharts';
import StatCard from '@/components/ui/StatCard';
import { TrendingUp, TrendingDown, Target, Activity, Award } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false });

  const t: Trade[] = trades || [];
  const a = calcAnalytics(t);
  const daily = calcDailyStats(t);
  const equity = calcEquityCurve(t);
  const recentTrades = t.slice(0, 5);

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#e2e8ff' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8892b8' }}>{t.length} trades logged</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard label="Net P&L" value={fmtCurrency(a.totalNetPnl, true)} positive={a.totalNetPnl >= 0} icon={<TrendingUp size={14}/>} />
        <StatCard label="Win Rate" value={fmtPercent(a.winRate)} positive={a.winRate >= 50} subtitle={`${a.wins}W / ${a.losses}L`} icon={<Target size={14}/>} />
        <StatCard label="Profit Factor" value={a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2)} positive={a.profitFactor >= 1} icon={<Activity size={14}/>} />
        <StatCard label="Avg R:R" value={a.avgRR.toFixed(2)} positive={a.avgRR >= 1} subtitle="Reward:Risk" icon={<Award size={14}/>} />
        <StatCard label="Avg Win" value={fmtCurrency(a.avgWin)} positive subtitle="per trade" icon={<TrendingUp size={14}/>} />
        <StatCard label="Avg Loss" value={fmtCurrency(Math.abs(a.avgLoss))} negative subtitle="per trade" icon={<TrendingDown size={14}/>} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Trades" value={a.totalTrades.toString()} subtitle="all time" />
        <StatCard label="Best Day" value={fmtCurrency(a.bestDay, true)} positive={a.bestDay >= 0} />
        <StatCard label="Worst Day" value={fmtCurrency(a.worstDay, true)} negative={a.worstDay < 0} />
        <StatCard label="Avg R-Multiple" value={a.avgRMultiple.toFixed(2) + 'R'} positive={a.avgRMultiple >= 0} />
      </div>

      <DashboardCharts trades={t} equity={equity} daily={daily} analytics={a} />

      {recentTrades.length > 0 && (
        <div className="mt-6 rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
          <h2 className="text-sm font-medium mb-4" style={{ color: '#e2e8ff' }}>Recent Trades</h2>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #252b40' }}>
                {['Date','Contract','Direction','Session','Net P&L','Result'].map(h => (
                  <th key={h} className="text-left pb-2 text-[11px] font-medium" style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(trade => (
                <tr key={trade.id} style={{ borderBottom: '1px solid #1e2336' }}>
                  <td className="py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{trade.date}</td>
                  <td className="py-2.5 text-[13px] font-medium" style={{ color: '#e2e8ff' }}>{trade.contract}</td>
                  <td className="py-2.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: trade.direction === 'Long' ? '#0f2040' : '#2a1f0f', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className="py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{trade.session}</td>
                  <td className="py-2.5 text-[13px] font-medium" style={{ color: trade.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {fmtCurrency(trade.net_pnl, true)}
                  </td>
                  <td className="py-2.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: trade.net_pnl > 0 ? '#0f2a1a' : trade.net_pnl < 0 ? '#2a0f0f' : '#1e2336',
                        color: trade.net_pnl > 0 ? '#22c55e' : trade.net_pnl < 0 ? '#ef4444' : '#8892b8'
                      }}>
                      {trade.net_pnl > 0 ? 'Win' : trade.net_pnl < 0 ? 'Loss' : 'B/E'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
