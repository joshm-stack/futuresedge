'use client';
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';
import {
  LayoutDashboard, BookOpen, Calendar,
  FileText, LogOut, TrendingUp, Settings,
  Upload, Sun, Moon, Star, Menu, X
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
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

  const initials = email ? email[0].toUpperCase() : '?';

  const NavContent = () => (
    <>
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
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-[14px] transition-all"
                  style={{
                    color: active ? '#4f7ef8' : 'var(--text-2)',
                    background: active ? 'rgba(79,126,248,0.1)' : 'transparent',
                    fontWeight: active ? 700 : 400,
                  }}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} style={{ flexShrink: 0 }} />
                  {label}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={toggle}
          className="flex items-center gap-2.5 px-5 py-3 w-full text-[13px]"
          style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <Link href="/settings" onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 px-5 py-3 text-[13px]"
          style={{ color: 'var(--text-2)', borderTop: '1px solid var(--border)', display: 'flex' }}>
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#4f7ef8' }}>
            <TrendingUp size={13} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[15px]" style={{ color: 'var(--text)' }}>
            Futures<span style={{ color: '#4f7ef8' }}>Edge</span>
          </span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text)' }}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 260, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', paddingTop: 56 }}>
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col h-screen sticky top-0"
        style={{ width: 224, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', flexShrink: 0, boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
  style={{ background: 'linear-gradient(145deg, #1c3a7a, #0e1e45)', boxShadow: '0 4px 12px rgba(61,127,255,0.3)' }}>
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
    <defs>
      <linearGradient id="sideArr" x1="1" y1="17" x2="21" y2="4" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2563eb"/>
        <stop offset="100%" stopColor="#93c5fd"/>
      </linearGradient>
    </defs>
    <polyline points="1,17 6,11 11,14 17,6 21,4" stroke="url(#sideArr)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <polyline points="17,2 21,4 19,8" stroke="url(#sideArr)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
</div>
<span className="font-bold text-[15px]" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em', color: 'var(--text)' }}>
  Futures<span style={{ background: 'linear-gradient(135deg, #3d7fff, #7ab4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Edge</span>
</span>
