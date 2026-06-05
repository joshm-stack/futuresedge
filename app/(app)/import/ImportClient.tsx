'use client';
import { useState, useRef, useCallback } from 'react';
import { parseRithmicCSV, ParseResult } from '@/lib/rithmic-parser';
import { createClient } from '@/lib/supabase';
import { Account } from '@/types';
import { fmtCurrency } from '@/lib/analytics';
import toast from 'react-hot-toast';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ChevronRight, RotateCcw, Download } from 'lucide-react';

interface Props { accounts: Account[]; userId: string; }
type Step = 'upload' | 'preview' | 'done';
const STEP_LABELS = ['Upload file', 'Review trades', 'Import complete'];

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function downloadSample() {
  const sample = [
    'Account,Status,Remarks,Buy/Sell,Qty To Fill,Symbol,Qty Filled,Avg Fill Price,Limit price,Order Number,Create Time,Update Time,Commission',
    'DEMO123,Complete,,Buy,1,ESM5,1,5250.25,,1001,05/28/2025 09:31:00,05/28/2025 09:31:02,2.25',
    'DEMO123,Complete,,Sell,1,ESM5,1,5258.50,,1002,05/28/2025 10:15:00,05/28/2025 10:15:01,2.25',
  ].join('\n');
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rithmic_sample.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function ImportClient({ accounts, userId }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a CSV file.'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseRithmicCSV(e.target?.result as string);
      setResult(parsed);
      setSelected(parsed.trades.map((_, i) => i));
      if (parsed.errors.length && !parsed.trades.length) toast.error(parsed.errors[0]);
      else setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const allSelected = result ? selected.length === result.trades.length : false;
  const toggleAll = () => { if (allSelected) setSelected([]); else setSelected(result ? result.trades.map((_, i) => i) : []); };
  const toggleRow = (i: number) => { if (selected.includes(i)) setSelected(selected.filter(x => x !== i)); else setSelected([...selected, i]); };

  async function runImport() {
    if (!result || selected.length === 0) return;
    setImporting(true);
    const rows = selected.map(i => {
      const t = result.trades[i];
      return { user_id: userId, account_id: accountId || null, date: t.date, contract: t.contract, direction: t.direction, session: t.session, quantity: t.quantity, entry_price: t.entry_price, exit_price: t.exit_price, fees: t.fees, gross_pnl: t.gross_pnl, net_pnl: t.net_pnl, setup_tags: [], mistake_tags: [], updated_at: new Date().toISOString() };
    });
    try {
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from('trades').insert(rows.slice(i, i + 100));
        if (error) throw error;
        inserted += Math.min(100, rows.length - i);
      }
      setImportedCount(inserted); setStep('done');
    } catch (err: any) { toast.error(err.message || 'Import failed.'); }
    finally { setImporting(false); }
  }

  const reset = () => { setStep('upload'); setResult(null); setFileName(''); setSelected([]); setImportedCount(0); if (fileRef.current) fileRef.current.value = ''; };

  const previewStats = result ? (() => {
    const sel = selected.map(i => result.trades[i]);
    return { count: sel.length, pnl: sel.reduce((a, t) => a + t.net_pnl, 0), wins: sel.filter(t => t.net_pnl > 0).length, losses: sel.filter(t => t.net_pnl < 0).length };
  })() : null;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text)' }}>Import Trades</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>Upload your Rithmic R|Trader Pro CSV export</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEP_LABELS.map((label, idx) => {
          const steps: Step[] = ['upload', 'preview', 'done'];
          const isActive = step === steps[idx];
          const isDone = steps.indexOf(step) > idx;
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: isDone ? '#22c55e' : isActive ? '#4f7ef8' : 'var(--bg-hover)', color: isDone || isActive ? '#fff' : 'var(--text-3)', border: `2px solid ${isDone ? '#22c55e' : isActive ? '#4f7ef8' : 'var(--border)'}` }}>
                  {isDone ? <CheckCircle2 size={13} /> : idx + 1}
                </div>
                <span className="text-[12px] font-semibold hidden sm:block"
                  style={{ color: isActive ? 'var(--text)' : isDone ? '#22c55e' : 'var(--text-3)' }}>{label}</span>
              </div>
              {idx < 2 && <div className="w-10 h-px mx-3" style={{ background: isDone ? '#22c55e' : 'var(--border)' }} />}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 card">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} style={{ color: '#4f7ef8' }} />
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>How to export from R|Trader Pro</span>
            </div>
            <ol className="space-y-2">
              {['Open R|Trader Pro → File → Order History','Choose your account and date','Right-click column headers → Add/Remove Columns → enable all','Export icon → Save as CSV','Drag and drop below'].map((text, n) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: 'rgba(79,126,248,0.1)', color: '#4f7ef8' }}>{n + 1}</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{text}</span>
                </li>
              ))}
            </ol>
            <button onClick={downloadSample} style={{ color: '#4f7ef8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={12} /> Download sample CSV
            </button>
          </div>

          {accounts.length > 0 && (
            <div className="rounded-xl p-4 card">
              <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Import into account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ maxWidth: 320 }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
          )}

          <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-4 py-16"
            style={{ background: dragging ? 'rgba(79,126,248,0.05)' : 'var(--bg-hover)', border: `2px dashed ${dragging ? '#4f7ef8' : 'var(--border)'}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: dragging ? 'rgba(79,126,248,0.1)' : 'var(--bg-card)', border: `1px solid ${dragging ? '#4f7ef8' : 'var(--border)'}`, boxShadow: 'var(--shadow)' }}>
              <UploadCloud size={26} style={{ color: dragging ? '#4f7ef8' : 'var(--text-3)' }} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text)' }}>{dragging ? 'Drop your CSV here' : 'Drag & drop your Rithmic CSV'}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>or click to browse · .csv files only</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
          </div>
        </div>
      )}

      {step === 'preview' && result && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex flex-wrap items-center gap-4 card">
            <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>{fileName}</span>
            <div className="flex flex-wrap gap-2 ml-auto">
              <Badge color="#4f7ef8">{result.rawRows} rows</Badge>
              <Badge color="#22c55e">{result.trades.length} trades</Badge>
              {result.skipped > 0 && <Badge color="#f59e0b">{result.skipped} skipped</Badge>}
            </div>
          </div>

          {previewStats && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Selected', val: previewStats.count.toString(), color: 'var(--text)' },
                { label: 'Net P&L', val: fmtCurrency(previewStats.pnl, true), color: previewStats.pnl >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Wins', val: previewStats.wins.toString(), color: '#22c55e' },
                { label: 'Losses', val: previewStats.losses.toString(), color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 card">
                  <p className="text-[10px] mb-1 font-semibold" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  <p className="text-[18px] font-bold" style={{ color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl overflow-hidden card">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 cursor-pointer" />
                <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>{selected.length} / {result.trades.length} selected</span>
              </div>
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
                <RotateCcw size={11} /> Change file
              </button>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
              <table className="w-full" style={{ minWidth: 700 }}>
                <thead className="sticky top-0" style={{ background: 'var(--bg-card)', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="w-10 px-4 py-2.5" />
                    {['Date','Contract','Direction','Qty','Entry','Exit','Fees','Net P&L'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold"
                        style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((trade, i) => {
                    const isSel = selected.includes(i);
                    return (
                      <tr key={i} onClick={() => toggleRow(i)} style={{ borderBottom: '1px solid var(--border)', opacity: isSel ? 1 : 0.4, cursor: 'pointer', background: isSel ? 'rgba(79,126,248,0.03)' : 'transparent' }}>
                        <td className="px-4 py-2.5">
                          <input type="checkbox" checked={isSel} onChange={() => toggleRow(i)} onClick={e => e.stopPropagation()} className="w-4 h-4 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--text-2)' }}>{trade.date}</td>
                        <td className="px-3 py-2.5 text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{trade.contract}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: trade.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--text-2)' }}>{trade.quantity}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color: 'var(--text-2)' }}>{trade.entry_price}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color: 'var(--text-2)' }}>{trade.exit_price}</td>
                        <td className="px-3 py-2.5 text-[12px]" style={{ color: 'var(--text-3)' }}>${trade.fees.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-[12px] font-bold" style={{ color: trade.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                          {trade.net_pnl >= 0 ? '+' : ''}{fmtCurrency(trade.net_pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
              <RotateCcw size={13} /> Start over
            </button>
            <button onClick={runImport} disabled={importing || selected.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: '#4f7ef8', border: 'none', opacity: importing || selected.length === 0 ? 0.6 : 1, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
              {importing ? 'Importing…' : <>Import {selected.length} trades <ChevronRight size={15} /></>}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-2xl p-12 flex flex-col items-center text-center card">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e' }}>
            <CheckCircle2 size={30} style={{ color: '#22c55e' }} />
          </div>
          <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--text)' }}>Import complete!</h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-2)' }}>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{importedCount} trades</span> added to your journal.
          </p>
          <div className="flex gap-3">
            <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
              Import more
            </button>
            <a href="/dashboard" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: '#4f7ef8', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
              View dashboard <ChevronRight size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
