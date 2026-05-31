import { createServerSupabaseClient } from '@/lib/supabase-server';
import ImportClient from './ImportClient';

export default async function ImportPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user!.id);
  return <ImportClient accounts={accounts || []} userId={user!.id} />;
}
