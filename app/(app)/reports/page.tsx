import { createServerSupabaseClient } from '@/lib/supabase-server';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { data: trades } = await supabase
    .from('trades').select('*')
    .eq('user_id', session!.user.id)
    .order('date');
  return <ReportsClient trades={trades || []} />;
}
