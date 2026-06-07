import { createServerSupabaseClient } from '@/lib/supabase-server';
import EdgeAIClient from './EdgeAIClient';

export default async function EdgeAIPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session!.user.id;

  const [
    { data: trades },
    { data: journal },
    { data: notebook },
    { data: goals },
    { data: saved },
  ] = await Promise.all([
    supabase.from('trades').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('notebook_entries').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('vision_goals').select('*').eq('user_id', userId),
    supabase.from('saved_affirmations').select('*').eq('user_id', userId).limit(10),
  ]);

  return (
    <EdgeAIClient
      trades={trades || []}
      journal={journal || []}
      notebook={notebook || []}
      goals={goals || []}
      savedAffirmations={saved || []}
    />
  );
}
