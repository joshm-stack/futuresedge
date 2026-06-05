import { createServerSupabaseClient } from '@/lib/supabase-server';
import VisionClient from './VisionClient';

export default async function VisionPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const [{ data: goals }, { data: photos }, { data: saved }] = await Promise.all([
    supabase.from('vision_goals').select('*').eq('user_id', session!.user.id).order('sort_order'),
    supabase.from('vision_photos').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false }),
    supabase.from('saved_affirmations').select('*').eq('user_id', session!.user.id).order('saved_at', { ascending: false }).limit(20),
  ]);

  return (
    <VisionClient
      userId={session!.user.id}
      initialGoals={goals || []}
      initialPhotos={photos || []}
      savedAffirmations={saved || []}
    />
  );
}
