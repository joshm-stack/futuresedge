'use client';
import { useState } from 'react';
import { Trade, TradeFormData, Account, Direction, Session } from '@/types';
import { createClient } from '@/lib/supabase';
import { FUTURES_CONTRACTS, fmtCurrency } from '@/lib/analytics';
import toast from 'react-hot-toast';
import { X, Trash2 } from 'lucide-react';

interface Props {
  trade?: Trade | null;
  userId: string;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

const SETUP_TAGS = ['Breakout','Pullback','VWAP','Trend','Reversal','Gap Fill','News','Opening Range','Support/Resistance','Order Flow','Scalp','Swing'];
const MISTAKE_TAGS = ['FOMO','Overtrading','No Stop','Moved Stop','Sized Up','Early Exit','Late Entry','Revenge Trade','News Trade','Broke Rules'];

export default function TradeModal({ trade, userId, accounts, onClose, onSaved, onDeleted }: Props) {
  const [loading, setSaving] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<TradeFormData>({
    date: trade?.date || today,
    contract: trade?.contract || 'ES',
    direction: trade?.direction || 'Long',
    session: trade?.session || 'RTH',
    quantity: trade?.quantity || 1,
    entry_price: trade?.entry_price || 0,
    exit_price: trade?.exit_price || 0,
    stop_loss: trade?.stop_loss,
    take_profit: trade?.take_profit,
    fees: trade?.fees || 0,
    setup_tags: trade?.setup_tags || [],
    mistake_tags: trade?.mistake_tags || [],
    rating: trade?.rating,
    notes: trade?.notes || '',
  });

  const gross = form.direction === 'Long'
    ? (form.exit_price - form.entry_price) * form.quantity
    : (form.entry_price - form.exit_price) * form.quantity;
  const net = gross - form.fees;

  const rMultiple = form.stop_loss && form.entry_price
    ? form.direction === 'Long'
      ? (form.exit_price - form.entry_price) / Math.abs(form.entry_price - form.stop_loss)
      : (form.entry_price - form.exit_price) / Math.abs(form.stop_loss - form.entry_price)
    : undefined;

  function upd(key: keyof TradeFormData, val: any) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function toggleTag(type: 'setup' | 'mistake', tag: string) {
    const key = type === 'setup' ? 'setup_tags' : 'mistake_tags';
    setForm(f => ({
      ...f,
      [key]: f[key].includes(tag) ? f[key].filter((t: string) => t !== tag) : [...f[key], tag],
    }));
  }

  async function save() {
    if (!form.entry_price || !form.exit_price) { toast.error('Entry and exit prices are required'); return; }
    setSaving(true);
    const payload = {
      user_id: userId,
      date: form.date, contract: form.contract, direction: form.direction,
      session: form.session, quantity: form.quantity,
      entry_price: form.entry_price, exit_price: form.exit_price,
      stop_loss: form.stop_loss || null, take_profit: form.take_profit || null,
      fees: form.fees, gross_pnl: +gross.toFixed(2), net_pnl: +net.toFixed(2),
      r_multiple: rMultiple != null ? +rMultiple.toFixed(2) : null,
      setup_tags: form.setup_tags, mistake_tags: form.mistake_tags,
      rating: form.rating || null, notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };
    try {
      if (trade) {
        const { error } = await supabase.from('trades').update(payload).eq('id', trade.id);
        if (error) throw error;
        toast.success('Trade updated');
      } else {
        const { error } = await supabase.from('trades').insert(payload);
        if (error) throw error;
        toast.success('Trade saved');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save trade');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl" style={{ background: '#12151f', border: '1px solid #313856' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #252b40' }}>
          <h2 className="text-[15px] font-semibold" style={{ color: '#e2e8ff' }}>{trade ? 'Edit Trade' : 'Log New Trade'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b8' }}><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {(form.entry_price > 0 && form.exit_price > 0) && (
            <div className="rounded-lg p-3 flex gap-4" style={{ background: net >= 0 ? '#0f2a1a' : '#2a0f0f', border: `1px solid ${net >= 0 ? '#16a34a' : '#b91c1c'}` }}>
              <div><p className="text-[10px]" style={{ color: '#8892b8' }}>GROSS P&L</p><p className="text-[15px] font-semibold" style={{ color: gross >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(gross, true)}</p></div>
              <div><p className="text-[10px]" style={{ color: '#8892b8' }}>FEES</p><p className="text-[15px] font-semibold" style={{ color: '#f59e0b' }}>-${form.fees.toFixed(2)}</p></div>
              <div><p className="text-[10px]" style={{ color: '#8892b8' }}>NET P&L</p><p className="text-[15px] font-semibold" style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(net, true)}</p></div>
              {rMultiple != null && <div><p className="text-[10px]" style={{ color: '#8892b8' }}>R-MULTIPLE</p><p className="text-[15px] font-semibold" style={{ color: rMultiple >= 0 ? '#22c55e' : '#ef4444' }}>{rMultiple.toFixed(2)}R</p></div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
              <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract</label>
              <select value={form.contract} onChange={e => upd('contract', e.target.value)}>
                {FUTURES_CONTRACTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direction</label>
              <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: '#0c0e14', border: '1px solid #252b40' }}>
                {(['Long', 'Short'] as Direction[]).map(d => (
                  <button key={d} onClick={() => upd('direction', d)}
                    className="flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all"
                    style={{
                      background: form.direction === d ? (d === 'Long' ? '#0f2040' : '#2a1f0f') : 'transparent',
                      color: form.direction === d ? (d === 'Long' ? '#4f7ef8' : '#f59e0b') : '#4a5270',
                      border: form.direction === d ? `1px solid ${d === 'Long' ? '#4f7ef8' : '#f59e0b'}` : '1px solid transparent',
                      cursor: 'pointer',
                    }}>
                    {d === 'Long' ? '↑ Long' : '↓ Short'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session</label>
              <select value={form.session} onChange={e => upd('session', e.target.value as Session)}>
                {(['Overnight','Pre-Market','RTH','After-Hours'] as Session[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contracts</label>
              <input type="number" min="1" step="1" value={form.quantity} onChange={e => upd('quantity', +e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entry Price</label>
              <input type="number" step="0.01" value={form.entry_price || ''} onChange={e => upd('entry_price', +e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exit Price</label>
              <input type="number" step="0.01" value={form.exit_price || ''} onChange={e => upd('exit_price', +e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stop Loss</label>
              <input type="number" step="0.01" value={form.stop_loss || ''} onChange={e => upd('stop_loss', e.target.value ? +e.target.value : undefined)} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Take Profit</label>
              <input type="number" step="0.01" value={form.take_profit || ''} onChange={e => upd('take_profit', e.target.value ? +e.target.value : undefined)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fees ($)</label>
              <input type="number" step="0.01" value={form.fees} onChange={e => upd('fees', +e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trade Rating</label>
              <div className="flex gap-1 pt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => upd('rating', form.rating === n ? undefined : n)}
                    style={{ color: (form.rating || 0) >= n ? '#f59e0b' : '#252b40', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '0 2px' }}>★</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-2" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setup Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {SETUP_TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag('setup', tag)}
                  className={`tag-pill ${form.setup_tags.includes(tag) ? 'active-setup' : ''}`}>{tag}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="Custom tag…"
                onKeyDown={e => { if (e.key === 'Enter' && customTag.trim()) { toggleTag('setup', customTag.trim()); setCustomTag(''); } }} />
              <button onClick={() => { if (customTag.trim()) { toggleTag('setup', customTag.trim()); setCustomTag(''); } }}
                style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12 }}>Add</button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-2" style={{ color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mistake Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {MISTAKE_TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag('mistake', tag)}
                  className={`tag-pill ${form.mistake_tags.includes(tag) ? 'active-mistake' : ''}`}>{tag}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
            <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="What went well? What to improve?" rows={4} />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #252b40' }}>
          <div>
            {trade && onDeleted && (
              <button onClick={onDeleted} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px]"
                style={{ background: '#2a0f0f', border: '1px solid #b91c1c', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #252b40', color: '#8892b8', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={loading} style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving…' : trade ? 'Update Trade' : 'Save Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
