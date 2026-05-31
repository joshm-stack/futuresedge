import { createServerSupabaseClient } from '@/lib/supabase-server';
import PlaybookClient from './PlaybookClient';

export default async function PlaybookPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: playbooks } = await supabase.from('playbooks').select('*').eq('user_id', user!.id).order('created_at');
  return <PlaybookClient playbooks={playbooks || []} userId={user!.id} />;
}
