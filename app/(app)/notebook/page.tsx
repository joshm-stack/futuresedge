import { createServerSupabaseClient } from '@/lib/supabase-server';
import NotebookClient from './NotebookClient';

export default async function NotebookPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: entries } = await supabase.from('notebook_entries').select('*').eq('user_id', user!.id).order('updated_at', { ascending: false });
  return <NotebookClient entries={entries || []} userId={user!.id} />;
}
