import Sidebar from '@/components/layout/Sidebar';
import LoadingScreen from '@/components/layout/LoadingScreen';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/auth');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <LoadingScreen />
      <Sidebar email={session.user.email} />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {/* Safe area top padding for mobile */}
        <div className="md:hidden" style={{ height: 'calc(60px + env(safe-area-inset-top))' }} />
        {children}
      </main>
    </div>
  );
}
