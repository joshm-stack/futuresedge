import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Trade } from '@/types';
import { calcAnalytics, calcDailyStats, calcEquityCurve, fmtCurrency, fmtPercent } from '@/lib/analytics';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('date', { ascending: false });

  const t: Trade[] = trades || [];
  const analytics = calcAnalytics(t);
  const daily = calcDailyStats(t);
  const equity = calcEquityCurve(t);

  return (
    <DashboardClient
      trades={t}
      analytics={analytics}
      daily={daily}
      equity={equity}
    />
  );
}
