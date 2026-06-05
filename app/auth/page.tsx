'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'signup' && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created! You can now log in.');
        setMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
<div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#4f7ef8' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" width="18" height="18">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-xl font-semibold" style={{ color: '#e2e8ff' }}>Futures<span style={{ color: '#4f7ef8' }}>Edge</span></span>
          </div>
          <p className="text-sm" style={{ color: '#8892b8' }}>{mode === 'login' ? 'Sign in to your trading journal' : 'Create your free account'}</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: '#12151f', border: '1px solid #252b40' }}>
          <div className="flex rounded-lg p-1 mb-6" style={{ background: '#0c0e14' }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                style={{ background: mode === m ? '#1e2336' : 'transparent', color: mode === m ? '#e2e8ff' : '#4a5270', border: mode === m ? '1px solid #252b40' : '1px solid transparent' }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="trader@email.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity mt-2"
              style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#4a5270' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ color: '#4f7ef8', background: 'none', border: 'none', cursor: 'pointer' }}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
