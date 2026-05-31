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

function Pill({ v }: { v: number }) {
  return (
    <span className="text-[13px] font-semibold" style={{ color: v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#8892b8' }}>
      {v > 0 ? '+' : ''}{fmtCurrency(v)}
    </span>
  );
}

function downloadSample() {
  const sample = [
    'Account,Status,Remarks,Buy/Sell,Qty To Fill,Symbol,Qty Filled,Avg Fill Price,Limit price,Order Number,Create Time,Update Time,Commission',
    'DEMO123,Complete,,Buy,1,ESM5,1,5250.25,,1001,05/28/2025 09:31:00,05/28/2025 09:31:02,2.25',
    'DEMO123,Complete,,Sell,1,ESM5,1,5258.50,,1002,05/28/2025 10:15:00,05/28/2025 10:15:01,2.25',
    'DEMO123,Complete,,Sell,2,NQM5,2,18450.00,,1003,05/28/2025 09:45:00,05/28/2025 09:45:02,4.50',
    'DEMO123,Complete,,Buy,2,NQM5,2,18410.00,,1004,05/28/2025 11:30:00,05/28/2025 11:30:01,4.50',
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
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') { toast.error('Please upload a CSV file.'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseRithmicCSV(text);
      setResult(parsed);
      setSelected(parsed.trades.map((_, i) => i));
      if (parsed.errors.length && !parsed.trades.length) { toast.error(parsed.errors[0]); }
      else { setStep('preview'); }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const allSelected = result ? selected.length === result.trades.length : false;
  const toggleAll = () => { if (allSelected) setSelected([]); else setSelected(result ? result.trades.map((_, i) => i) : []); };
  const toggleRow = (i: number) => { if (selected.includes(i)) setSelected(selected.filter(x => x !== i)); else setSelected([...selected, i]); };

  async function runImport() {
    if (!result || selected.length === 0) return;
    setImporting(true);
    const tradesToInsert = selected.map(i => {
      const t = result.trades[i];
      return {
        user_id: userId, account_id: accountId || null,
        date: t.date, contract: t.contract, direction: t.direction,
        session: t.session, quantity: t.quantity,
        entry_price: t.entry_price, exit_price: t.exit_price,
        fees: t.fees, gross_pnl: t.gross_pnl, net_pnl: t.net_pnl,
        setup_tags: [], mistake_tags: [],
        updated_at: new Date().toISOString(),
      };
    });
    try {
      let inserted = 0;
      for (let i = 0; i < tradesToInsert.length; i += 100) {
        const { error } = await supabase.from('trades').insert(tradesToInsert.slice(i, i + 100));
        if (error) throw error;
        inserted += Math.min(100, tradesToInsert.length - i);
      }
      setImportedCount(inserted);
      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Import failed.');
    } finally { setImporting(false); }
  }

  const reset = () => {
    setStep('upload'); setResult(null); setFileName('');
    setSelected([]); setImportedCount(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const previewStats = result ? (() => {
    const sel = selected.map(i => result.trades[i]);
    return { count: sel.length, pnl: sel.reduce((a, t) => a + t.net_pnl, 0), wins: sel.filter(t => t.net_pnl > 0).length, losses: sel.filter(t => t.net_pnl < 0).length };
  })() : null;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-7">
        <h1 className="text-xl font-semibold" style={{ color: '#e2e8ff' }}>Import Trades</h1>
        <p className="text-[13px] mt-1" style={{ color: '#8892b8' }}>Upload your Rithmic R|Trader Pro CSV export — trades are parsed and added instantly.</p>
      </div>

      <div className="flex items-center gap-0 mb-8">
        {STEP_LABELS.map((label, idx) => {
          const steps: Step[] = ['upload', 'preview', 'done'];
          const isActive = step === steps[idx];
          const isDone = steps.indexOf(step) > idx;
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: isDone ? '#22c55e' : isActive ? '#4f7ef8' : '#1e2336', color: isDone || isActive ? '#fff' : '#4a5270', border: `1px solid ${isDone ? '#16a34a' : isActive ? '#4f7ef8' : '#252b40'}` }}>
                  {isDone ? <CheckCircle2 size={13} /> : idx + 1}
                </div>
                <span className="text-[12px] font-medium whitespace-nowrap hidden sm:block"
                  style={{ color: isActive ? '#e2e8ff' : isDone ? '#22c55e' : '#4a5270' }}>{label}</span>
              </div>
              {idx < 2 && <div className="w-8 sm:w-12 h-px mx-2" style={{ background: isDone ? '#16a34a' : '#252b40' }} />}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="space-y-5">
          <div className="rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#0f2040', border: '1px solid #4f7ef8' }}>
                <FileText size={12} style={{ color: '#4f7ef8' }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#e2e8ff' }}>How to export from R|Trader Pro</span>
            </div>
            <ol className="space-y-2.5">
              {[
                'Open R|Trader Pro → click File in the top menu → select Order History',
                'Choose your account and select the date you want to export',
                'In the Completed Orders section, right-click any column header → Add/Remove Columns',
                'Enable all columns especially: Qty Filled, Avg Fill Price, Commission, Update Time',
                'Click the export icon in the top ribbon → Save as CSV',
                'Drag and drop the CSV file below (repeat for each trading day)',
              ].map((text, n) => (
                <li key={n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: '#0f2040', color: '#4f7ef8', border: '1px solid #4f7ef852' }}>{n + 1}</span>
                  <span className="text-[12.5px] leading-relaxed" style={{ color: '#8892b8' }}>{text}</span>
                </li>
              ))}
            </ol>
            <button onClick={downloadSample} style={{ color: '#4f7ef8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={12} /> Download sample CSV to test the importer
            </button>
          </div>

          {accounts.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: '#12151f', border: '1px solid #252b40' }}>
              <label className="block text-[11px] font-medium mb-2" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Import into account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ maxWidth: 320 }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
          )}

          <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)} onClick={() => fileRef.current?.click()}
            className="rounded-xl cursor-pointer flex flex-col items-center justify-center gap-4 py-14"
            style={{ background: dragging ? '#0f1e3a' : '#0c0e14', border: `2px dashed ${dragging ? '#4f7ef8' : '#252b40'}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: dragging ? '#0f2040' : '#12151f', border: `1px solid ${dragging ? '#4f7ef8' : '#252b40'}` }}>
              <UploadCloud size={26} style={{ color: dragging ? '#4f7ef8' : '#4a5270' }} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold mb-1" style={{ color: '#e2e8ff' }}>{dragging ? 'Drop your CSV here' : 'Drag & drop your Rithmic CSV'}</p>
              <p className="text-[12px]" style={{ color: '#4a5270' }}>or click to browse · .csv files only</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden" />
          </div>
        </div>
      )}

      {step === 'preview' && result && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex flex-wrap items-center gap-4" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <div className="flex items-center gap-2 text-[13px]">
              <FileText size={14} style={{ color: '#8892b8' }} />
              <span style={{ color: '#8892b8' }}>{fileName}</span>
            </div>
            <div className="flex flex-wrap gap-2 ml-auto">
              <Badge color="#4f7ef8">{result.rawRows} rows read</Badge>
              <Badge color="#22c55e">{result.trades.length} trades parsed</Badge>
              {result.skipped > 0 && <Badge color="#f59e0b">{result.skipped} rows skipped</Badge>}
              {result.errors.length > 0 && <Badge color="#ef4444">{result.errors.length} warnings</Badge>}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl p-4 space-y-1.5" style={{ background: '#1e1008', border: '1px solid #f59e0b30' }}>
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#f59e0b' }}>
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />{e}
                </div>
              ))}
            </div>
          )}

          {previewStats && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Selected', val: previewStats.count.toString(), color: '#e2e8ff' },
                { label: 'Net P&L', val: fmtCurrency(previewStats.pnl, true), color: previewStats.pnl >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Wins', val: previewStats.wins.toString(), color: '#22c55e' },
                { label: 'Losses', val: previewStats.losses.toString(), color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: '#12151f', border: '1px solid #252b40' }}>
                  <p className="text-[10px] mb-1" style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  <p className="text-[18px] font-semibold" style={{ color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #252b40' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: '#12151f', borderBottom: '1px solid #252b40' }}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 cursor-pointer" />
                <span className="text-[12px]" style={{ color: '#8892b8' }}>{selected.length} / {result.trades.length} selected</span>
              </div>
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', cursor: 'pointer' }}>
                <RotateCcw size={11} /> Change file
              </button>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table className="w-full" style={{ background: '#0c0e14', minWidth: 740 }}>
                <thead className="sticky top-0" style={{ background: '#12151f', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid #1e2336' }}>
                    <th className="w-10 px-4 py-2.5" />
                    {['Date','Contract','Direction','Session','Qty','Entry','Exit','Fees','Net P&L','Result'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold whitespace-nowrap"
                        style={{ color: '#4a5270', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((trade, i) => {
                    const isSelected = selected.includes(i);
                    const tradeResult = trade.net_pnl > 0 ? 'Win' : trade.net_pnl < 0 ? 'Loss' : 'B/E';
                    const rc = trade.net_pnl > 0 ? { bg: '#0f2a1a', color: '#22c55e' } : trade.net_pnl < 0 ? { bg: '#2a0f0f', color: '#ef4444' } : { bg: '#1e2336', color: '#8892b8' };
                    return (
                      <tr key={i} onClick={() => toggleRow(i)}
                        style={{ borderBottom: '1px solid #1a1e2e', background: isSelected ? '#0f1825' : 'transparent', opacity: isSelected ? 1 : 0.45, cursor: 'pointer' }}>
                        <td className="px-4 py-2.5">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleRow(i)}
                            onClick={e => e.stopPropagation()} className="w-4 h-4 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2.5 text-[12px] whitespace-nowrap" style={{ color: '#8892b8' }}>{trade.date}</td>
                        <td className="px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap" style={{ color: '#e2e8ff' }}>{trade.contract}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: trade.direction === 'Long' ? '#0f2040' : '#2a1f0f', color: trade.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                            {trade.direction === 'Long' ? '↑ Long' : '↓ Short'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px]" style={{ color: '#8892b8' }}>{trade.session}</td>
                        <td className="px-3 py-2.5 text-[12px]" style={{ color: '#8892b8' }}>{trade.quantity}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color: '#8892b8' }}>{trade.entry_price}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color: '#8892b8' }}>{trade.exit_price}</td>
                        <td className="px-3 py-2.5 text-[12px]" style={{ color: '#4a5270' }}>${trade.fees.toFixed(2)}</td>
                        <td className="px-3 py-2.5"><Pill v={trade.net_pnl} /></td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: rc.bg, color: rc.color }}>{tradeResult}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px]"
              style={{ background: 'transparent', border: '1px solid #252b40', color: '#8892b8', cursor: 'pointer' }}>
              <RotateCcw size={13} /> Start over
            </button>
            <button onClick={runImport} disabled={importing || selected.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#4f7ef8', border: 'none', opacity: importing || selected.length === 0 ? 0.6 : 1, cursor: 'pointer' }}>
              {importing ? <span>Importing…</span> : <>{`Import ${selected.length} trade${selected.length !== 1 ? 's' : ''}`}<ChevronRight size={15} /></>}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="rounded-xl p-10 flex flex-col items-center text-center" style={{ background: '#12151f', border: '1px solid #16a34a40' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#0f2a1a', border: '2px solid #22c55e' }}>
              <CheckCircle2 size={30} style={{ color: '#22c55e' }} />
            </div>
            <h2 className="text-[18px] font-semibold mb-2" style={{ color: '#e2e8ff' }}>Import complete!</h2>
            <p className="text-[13px] mb-1" style={{ color: '#8892b8' }}>
              <span className="font-semibold" style={{ color: '#e2e8ff' }}>{importedCount} trade{importedCount !== 1 ? 's' : ''}</span> successfully added.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px]"
                style={{ background: 'transparent', border: '1px solid #252b40', color: '#8892b8', cursor: 'pointer' }}>
                <UploadCloud size={13} /> Import another file
              </button>
              <a href="/dashboard" className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: '#4f7ef8' }}>
                View dashboard <ChevronRight size={14} />
              </a>
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <p className="text-[12px] font-semibold mb-3" style={{ color: '#e2e8ff' }}>Next steps</p>
            <div className="space-y-2">
              {[
                '📝 Open each trade in the journal to add setup tags, mistake tags, and notes',
                '⭐ Rate your trades 1–5 stars to track execution quality over time',
                '📚 Create playbooks for your best setups in the Playbook section',
                '📅 R|Trader exports one day at a time — repeat the import for each trading day',
              ].map(tip => <p key={tip} className="text-[12px]" style={{ color: '#8892b8' }}>{tip}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
