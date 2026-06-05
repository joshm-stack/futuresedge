'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';
import {
  LayoutDashboard, BookOpen, Calendar,
  FileText, LogOut, TrendingUp, Settings,
  Upload, Sun, Moon, Star
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/notebook', icon: FileText, label: 'Notebook' },
  { href: '/vision', icon: Star, label: 'Vision Board' },
  { href: '/import', icon: Upload, label: 'Import Trades' },
];

interface Props { email?: string; }

export default function Sidebar({ email }: Props) {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { dark, toggle } = useTheme();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

  const initials = email ? email[0].toUpperCase() : '?';

  return (
    <aside className="flex flex-col h-screen sticky top-0"
      style={{ width: 224, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', flexShrink: 0, boxShadow: 'var(--shadow)' }}>
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#4f7ef8' }}>
          <TrendingUp size={15} color="white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[15px]" style={{ color: 'var(--text)' }}>
          Futures<span style={{ color: '#4f7ef8' }}>Edge</span>
        </span>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-3">
          <p className="text-[10px] font-bold px-2 mb-2" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Menu</p>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = path === href || path.startsWith(href + '/');
            const showDivider = href === '/import';
            return (
              <div key={href}>
                {showDivider && <div className="mx-2 my-2" style={{ borderTop: '1px solid var(--border)' }} />}
                <Link href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-[13.5px] transition-all"
                  style={{
                    color: active ? '#4f7ef8' : 'var(--text-2)',
                    background: active ? 'rgba(79,126,248,0.1)' : 'transparent',
                    fontWeight: active ? 700 : 400,
                  }}>
                  <Icon size={15} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                  {label}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={toggle}
          className="flex items-center gap-2.5 px-5 py-3 w-full text-[13px] transition-colors"
          style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <Link href="/settings" className="flex items-center gap-2.5 px-5 py-3 text-[13px] transition-colors"
          style={{ color: 'var(--text-2)', borderTop: '1px solid var(--border)' }}>
          <Settings size={14} />
          Settings
        </Link>

        <div className="flex items-center gap-2.5 px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
            style={{ background: 'rgba(79,126,248,0.15)', border: '1px solid #4f7ef8', color: '#4f7ef8' }}>
            {initials}
          </div>
          <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-2)' }}>{email}</span>
          <button onClick={signOut} title="Sign out"
            style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
