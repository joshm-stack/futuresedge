import { createServerSupabaseClient } from '@/lib/supabase-server';
import EdgeAIClient from './EdgeAIClient';

export default async function EdgeAIPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { data: trades } = await supabase
    .from('trades').select('*')
    .eq('user_id', session!.user.id)
    .order('date', { ascending: false });

  return <EdgeAIClient trades={trades || []} />;
}
