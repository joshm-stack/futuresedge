import { createServerSupabaseClient } from '@/lib/supabase-server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: trades } = await supabase
    .from('trades').select('date, net_pnl, quantity, contract, direction')
    .eq('user_id', user!.id);
  return <CalendarClient trades={trades || []} />;
}
