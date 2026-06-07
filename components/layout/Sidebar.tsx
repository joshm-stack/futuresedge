'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';
import {
  LayoutDashboard, BookOpen, Calendar,
  FileText, LogOut, Settings,
  Upload, Sun, Moon, Star, Menu, X,
  BarChart2, Sparkles
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/reports', icon: BarChart2, label: 'Reports' },
  { href: '/edge-ai', icon: Sparkles, label: 'Edge AI' },
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

  const LogoMark = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(145deg, #1c3a7a, #0e1e45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(61,127,255,0.3)' }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <polyline points="1,17 6,11 11,14 17,6 21,4" stroke="#7ab4ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <polyline points="17,2 21,4 19,8" stroke="#7ab4ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        Futures<span style={{ background: 'linear-gradient(135deg, #3d7fff, #7ab4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Edge</span>
      </span>
    </div>
  );

  const NavLinks = () => (
    <>
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = path === href || path.startsWith(href + '/');
        const showDivider = href === '/import';
        return (
          <div key={href}>
            {showDivider && <div style={{ margin: '6px 8px', borderTop: '1px solid var(--border)' }} />}
            <Link href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                fontSize: 14, textDecoration: 'none',
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
    </>
  );

  const BottomSection = () => (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', width: '100%', fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
        {dark ? <Sun size={14} /> : <Moon size={14} />}
        {dark ? 'Light Mode' : 'Dark Mode'}
      </button>
      <Link href="/settings" onClick={() => setMobileOpen(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', borderTop: '1px solid var(--border)' }}>
        <Settings size={14} />
        Settings
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, background: 'rgba(79,126,248,0.15)', border: '1px solid #4f7ef8', color: '#4f7ef8' }}>
          {initials}
        </div>
        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{email}</span>
        <button onClick={signOut} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar — safe area aware */}
      <div className="md:hidden" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: 16, paddingRight: 16,
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 12,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}>
        <LogoMark />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 40,
          width: 270,
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          paddingTop: 'calc(64px + env(safe-area-inset-top))',
          display: 'flex', flexDirection: 'column',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        }}>
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 8px', margin: 0 }}>Menu</p>
          <NavLinks />
        </nav>
        <BottomSection />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex" style={{
        flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
        width: 224, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        flexShrink: 0, boxShadow: 'var(--shadow)',
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <LogoMark />
        </div>
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 8px', margin: 0 }}>Menu</p>
          <NavLinks />
        </nav>
        <BottomSection />
      </aside>
    </>
  );
}
