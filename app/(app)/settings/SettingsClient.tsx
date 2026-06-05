'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Account } from '@/types';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

interface Props { profile: any; accounts: Account[]; userId: string; email: string; }

export default function SettingsClient({ profile, accounts: initial, userId, email }: Props) {
  const [accounts, setAccounts] = useState(initial);
  const [riskPerTrade, setRiskPerTrade] = useState(profile?.risk_per_trade || '');
  const [maxDailyLoss, setMaxDailyLoss] = useState(profile?.max_daily_loss || '');
  const [dailyTarget, setDailyTarget] = useState(profile?.daily_profit_target || '');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'Live' | 'Demo' | 'Prop'>('Live');
  const [newAccBroker, setNewAccBroker] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const supabase = createClient();

  async function saveRisk() {
    const { error } = await supabase.from('profiles').update({
      risk_per_trade: riskPerTrade ? +riskPerTrade : null,
      max_daily_loss: maxDailyLoss ? +maxDailyLoss : null,
      daily_profit_target: dailyTarget ? +dailyTarget : null,
    }).eq('id', userId);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Risk settings saved');
  }

  async function addAccount() {
    if (!newAccName.trim()) { toast.error('Account name is required'); return; }
    const { error } = await supabase.from('accounts').insert({
      user_id: userId, name: newAccName.trim(), type: newAccType,
      broker: newAccBroker.trim() || null, starting_balance: +newAccBalance || 0,
    });
    if (error) { toast.error('Failed to add account'); return; }
    const { data } = await supabase.from('accounts').select('*').eq('user_id', userId);
    setAccounts(data || []);
    setNewAccName(''); setNewAccBroker(''); setNewAccBalance('');
    toast.success('Account added');
  }

  async function delAccount(id: string) {
    if (!confirm('Delete this account?')) return;
    await supabase.from('accounts').delete().eq('id', id);
    setAccounts(a => a.filter(x => x.id !== id));
    toast.success('Account deleted');
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-5 mb-5 card">
      <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text)' }}>{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-[22px] font-semibold mb-6" style={{ color: 'var(--text)' }}>Settings</h1>

      <Section title="Account Info">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
            style={{ background: 'rgba(79,126,248,0.1)', border: '2px solid #4f7ef8', color: '#4f7ef8', fontSize: 15 }}>
            {email[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{email}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>Supabase Auth</p>
          </div>
        </div>
      </Section>

      <Section title="Risk Management">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Risk per trade ($)', val: riskPerTrade, set: setRiskPerTrade },
            { label: 'Max daily loss ($)', val: maxDailyLoss, set: setMaxDailyLoss },
            { label: 'Daily profit target ($)', val: dailyTarget, set: setDailyTarget },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder="0.00" />
            </div>
          ))}
        </div>
        <button onClick={saveRisk} style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
          Save Risk Settings
        </button>
      </Section>

      <Section title="Trading Accounts">
        <div className="space-y-2 mb-4">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{acc.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-2)' }}>
                  {acc.type}{acc.broker ? ` · ${acc.broker}` : ''}{acc.starting_balance ? ` · $${acc.starting_balance.toLocaleString()}` : ''}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: acc.type === 'Live' ? 'rgba(79,126,248,0.1)' : acc.type === 'Prop' ? 'rgba(167,139,250,0.1)' : 'var(--bg-hover)', color: acc.type === 'Live' ? '#4f7ef8' : acc.type === 'Prop' ? '#a78bfa' : 'var(--text-2)' }}>
                {acc.type}
              </span>
              <button onClick={() => delAccount(acc.id)} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
          <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text-2)' }}>Add Account</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="Account name" />
            <select value={newAccType} onChange={e => setNewAccType(e.target.value as any)}>
              <option value="Live">Live</option>
              <option value="Demo">Demo</option>
              <option value="Prop">Prop Firm</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input value={newAccBroker} onChange={e => setNewAccBroker(e.target.value)} placeholder="Broker (optional)" />
            <input type="number" value={newAccBalance} onChange={e => setNewAccBalance(e.target.value)} placeholder="Starting balance" />
          </div>
          <button onClick={addAccount} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
            <Plus size={13} /> Add Account
          </button>
        </div>
      </Section>
    </div>
  );
}
