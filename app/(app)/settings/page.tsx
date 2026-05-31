import { createServerSupabaseClient } from '@/lib/supabase-server';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user!.id);
  return <SettingsClient profile={profile} accounts={accounts || []} userId={user!.id} email={user!.email || ''} />;
}
