import { createServerSupabaseClient } from '@/lib/supabase-server';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: trades } = await supabase.from('trades').select('*').eq('user_id', user!.id).order('date');
  return <ReportsClient trades={trades || []} />;
}
