import { createServerSupabaseClient } from '@/lib/supabase-server';
import JournalClient from './JournalClient';

export default async function JournalPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: trades } = await supabase
    .from('trades').select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false });

  const { data: accounts } = await supabase
    .from('accounts').select('*')
    .eq('user_id', user!.id);

  return <JournalClient trades={trades || []} accounts={accounts || []} userId={user!.id} />;
}
