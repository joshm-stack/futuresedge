import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Sidebar from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user.email} />
      <main className="flex-1 overflow-y-auto" style={{ background: '#0c0e14' }}>
        {children}
      </main>
    </div>
  );
}
