'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  LayoutDashboard, BookOpen, Calendar, BarChart2,
  BookMarked, FileText, LogOut, TrendingUp, Settings, Upload
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Trade Journal' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/reports', icon: BarChart2, label: 'Reports' },
  { href: '/playbook', icon: BookMarked, label: 'Playbook' },
  { href: '/notebook', icon: FileText, label: 'Notebook' },
  { href: '/import', icon: Upload, label: 'Import Trades' },
];

interface Props { email?: string; }

export default function Sidebar({ email }: Props) {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

  const initials = email ? email[0].toUpperCase() : '?';

  return (
    <aside className="flex flex-col h-screen sticky top-0" style={{ width: 224, background: '#12151f', borderRight: '1px solid #252b40', flexShrink: 0 }}>
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid #252b40' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#4f7ef8' }}>
          <TrendingUp size={15} color="white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-[15px]" style={{ color: '#e2e8ff' }}>Futures<span style={{ color: '#4f7ef8' }}>Edge</span></span>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-3 mb-1">
          <p className="text-[10px] font-medium px-2 mb-1.5" style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Menu</p>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = path === href || path.startsWith(href + '/');
            const showDivider = href === '/import';
            return (
              <div key={href}>
                {showDivider && <div className="mx-2 my-2" style={{ borderTop: '1px solid #1e2336' }} />}
                <Link href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-[13.5px] transition-all"
                  style={{
                    color: active ? '#e2e8ff' : '#8892b8',
                    background: active ? '#1e2336' : 'transparent',
                    borderLeft: active ? '2px solid #4f7ef8' : '2px solid transparent',
                    fontWeight: active ? 500 : 400,
                  }}>
                  <Icon size={15} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                  {label}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <div style={{ borderTop: '1px solid #252b40' }}>
        <Link href="/settings" className="flex items-center gap-2.5 px-5 py-3 text-[13px] transition-colors"
          style={{ color: '#8892b8' }}>
          <Settings size={14} />
          Settings
        </Link>
        <div className="flex items-center gap-2.5 px-5 py-3" style={{ borderTop: '1px solid #252b40' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
            style={{ background: '#0f2040', border: '1px solid #4f7ef8', color: '#4f7ef8' }}>
            {initials}
          </div>
          <span className="text-[12px] flex-1 truncate" style={{ color: '#8892b8' }}>{email}</span>
          <button onClick={signOut} title="Sign out" style={{ color: '#4a5270', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
