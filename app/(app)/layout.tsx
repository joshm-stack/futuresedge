import Sidebar from '@/components/layout/Sidebar';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth');

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar email={session.user.email} />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  );
}
