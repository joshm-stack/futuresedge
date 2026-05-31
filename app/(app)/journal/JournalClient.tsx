'use client';
import { useState } from 'react';
import { Trade, Account } from '@/types';
import { createClient } from '@/lib/supabase';
import { fmtCurrency } from '@/lib/analytics';
import TradeModal from '@/components/modals/TradeModal';
import toast from 'react-hot-toast';
import { Plus, Search, Download } from 'lucide-react';
import Papa from 'papaparse';

interface Props { trades: Trade[]; accounts: Account[]; userId: string; }

export default function JournalClient({ trades: initial, accounts, userId }: Props) {
  const [trades, setTrades] = useState<Trade[]>(initial);
  const [showModal, setShowModal] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const supabase = createClient();

  const filtered = trades.filter(t => {
    if (filterDir && t.direction !== filterDir) return false;
    if (filterSession && t.session !== filterSession) return false;
    if (filterResult) {
      if (filterResult === 'Win' && t.net_pnl <= 0) return false;
      if (filterResult === 'Loss' && t.net_pnl >= 0) return false;
      if (filterResult === 'BE' && t.net_pnl !== 0) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return t.contract.toLowerCase().includes(q) ||
        (t.notes?.toLowerCase().includes(q) ?? false) ||
        t.setup_tags.join(' ').toLowerCase().includes(q);
    }
    return true;
  });

  async function reload() {
    const { data } = await supabase.from('trades').select('*').eq('user_id', userId).order('date', { ascending: false });
    setTrades(data || []);
  }

  function openNew() { setEditTrade(null); setShowModal(true); }
  function openEdit(t: Trade) { setEditTrade(t); setShowModal(true); }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) { toast.error('Failed to delete trade'); return; }
    toast.success('Trade deleted');
    reload();
    setShowModal(false);
  }

  function exportCSV() {
    const rows = trades.map(t => ({
      date: t.date, contract: t.contract, direction: t.direction,
      session: t.session, quantity: t.quantity, entry: t.entry_price,
      exit: t.exit_price, fees: t.fees, gross_pnl: t.gross_pnl, net_pnl: t.net_pnl,
      setup_tags: t.setup_tags.join(','), notes: t.notes || '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'trades.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Trades exported');
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#e2e8ff' }}>Trade Journal</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8892b8' }}>{filtered.length} of {trades.length} trades</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px]"
            style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', cursor: 'pointer' }}>
            <Download size={13} /> Export
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
            style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> Log Trade
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[180px]" style={{ background: '#12151f', border: '1px solid #252b40' }}>
          <Search size={13} style={{ color: '#4a5270' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trades…"
            className="bg-transparent border-none outline-none text-[13px] w-full p-0" style={{ color: '#e2e8ff' }} />
        </div>
        {[
          { label: 'Direction', val: filterDir, set: setFilterDir, opts: ['Long', 'Short'] },
          { label: 'Session', val: filterSession, set: setFilterSession, opts: ['Overnight', 'Pre-Market', 'RTH', 'After-Hours'] },
          { label: 'Result', val: filterResult, set: setFilterResult, opts: ['Win', 'Loss', 'BE'] },
        ].map(f => (
          <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
            style={{ background: '#12151f', border: '1px solid #252b40', color: f.val ? '#e2e8ff' : '#4a5270', width: 'auto' }}>
            <option value="">All {f.label}s</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #252b40' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ background: '#12151f' }}>
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium mb-1" style={{ color: '#8892b8' }}>No trades found</p>
            <p className="text-sm mb-4" style={{ color: '#4a5270' }}>{trades.length === 0 ? 'Log your first trade to get started.' : 'Try adjusting your filters.'}</p>
            {trades.length === 0 && (
              <button onClick={openNew} className="px-4 py-2 rounded-lg text-[13px] font-medium text-white"
                style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer' }}>
                Log First Trade
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ background: '#12151f', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2336' }}>
                  {['Date','Contract','Direction','Session','Qty','Entry','Exit','Fees','Net P&L','R-Mult','Setup','Rating','Result'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-[11px] font-medium whitespace-nowrap"
                      style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(trade => {
                  const result = trade.net_pnl > 0 ? 'Win' : trade.net_pnl < 0 ? 'Loss' : 'B/E';
                  const rc = trade.net_pnl > 0 ? { bg: '#0f2a1a', color: '#22c55e' } : trade.net_pnl < 0 ? { bg: '#2a0f0f', color: '#ef4444' } : { bg: '#1e2336', color: '#8892b8' };
                  return (
                    <tr key={trade.id} onClick={() => openEdit(trade)} className="cursor-pointer"
                      style={{ borderBottom: '1px solid #1e2336' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1e2e')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-3 py-2.5 text-[13px] whitespace-nowrap" style={{ color: '#8892b8' }}>{trade.date}</td>
                      <td className="px-3 py-2.5 text-[13px] font-medium" style={{ color: '#e2e8ff' }}>{trade.contract}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: trade.direction === 'Long' ? '#0f2040' : '#2a1f0f', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{trade.session}</td>
                      <td className="px-3 py-2.5 text-[13px]" style={{ color: '#8892b8' }}>{trade.quantity}</td>
                      <td className="px-3 py-2.5 text-[13px] font-mono" style={{ color: '#8892b8' }}>{trade.entry_price}</td>
                      <td className="px-3 py-2.5 text-[13px] font-mono" style={{ color: '#8892b8' }}>{trade.exit_price}</td>
                      <td className="px-3 py-2.5 text-[13px]" style={{ color: '#4a5270' }}>${trade.fees.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-[13px] font-medium" style={{ color: trade.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                        {fmtCurrency(trade.net_pnl, true)}
                      </td>
                      <td className="px-3 py-2.5 text-[13px]" style={{ color: trade.r_multiple != null ? (trade.r_multiple >= 0 ? '#22c55e' : '#ef4444') : '#4a5270' }}>
                        {trade.r_multiple != null ? `${trade.r_multiple.toFixed(2)}R` : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {trade.setup_tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#0f2040', color: '#4f7ef8' }}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {trade.rating ? (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} style={{ color: i < trade.rating! ? '#f59e0b' : '#1e2336', fontSize: 10 }}>★</span>
                            ))}
                          </div>
                        ) : <span style={{ color: '#4a5270' }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: rc.bg, color: rc.color }}>{result}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TradeModal
          trade={editTrade}
          userId={userId}
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSaved={() => { reload(); setShowModal(false); }}
          onDeleted={editTrade ? () => handleDelete(editTrade.id) : undefined}
        />
      )}
    </div>
  );
}
