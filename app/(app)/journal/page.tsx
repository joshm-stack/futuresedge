import { createServerSupabaseClient } from '@/lib/supabase-server';
import JournalClient from './JournalClient';

export default async function JournalPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false });

  return <JournalClient entries={entries || []} userId={session!.user.id} />;
}
