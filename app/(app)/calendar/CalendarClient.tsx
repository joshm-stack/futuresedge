'use client';
import { useState } from 'react';
import { fmtCurrency } from '@/lib/analytics';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface DayTrade { date: string; net_pnl: number; quantity: number; contract: string; direction: string; }
interface Props { trades: DayTrade[]; }

export default function CalendarClient({ trades }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tooltip, setTooltip] = useState<{ day: number; data: DayTrade[] } | null>(null);

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const dayMap: Record<number, { pnl: number; count: number; trades: DayTrade[] }> = {};
  trades.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = { pnl: 0, count: 0, trades: [] };
      dayMap[day].pnl += t.net_pnl;
      dayMap[day].count++;
      dayMap[day].trades.push(t);
    }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthPnl = Object.values(dayMap).reduce((a, d) => a + d.pnl, 0);
  const tradeDays = Object.keys(dayMap).length;
  const winDays = Object.values(dayMap).filter(d => d.pnl > 0).length;
  const lossDays = Object.values(dayMap).filter(d => d.pnl < 0).length;
  const winPct = tradeDays > 0 ? Math.round(winDays / tradeDays * 100) : 0;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const data = dayMap[d];
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const pnl = data?.pnl ?? 0;
    let bg = 'var(--bg)';
    let pnlColor = 'var(--text-3)';
    let borderColor = 'var(--border)';
    if (data) {
      if (pnl > 0) { bg = 'rgba(34,197,94,0.08)'; pnlColor = '#22c55e'; borderColor = 'rgba(34,197,94,0.2)'; }
      else if (pnl < 0) { bg = 'rgba(239,68,68,0.08)'; pnlColor = '#ef4444'; borderColor = 'rgba(239,68,68,0.2)'; }
      else { bg = 'var(--bg-hover)'; }
    }
    cells.push(
      <div key={d}
        onClick={() => data && setTooltip(tooltip?.day === d ? null : { day: d, data: data.trades })}
        className="rounded-xl relative flex flex-col"
        style={{
          background: bg,
          border: `1px solid ${isToday ? '#4f7ef8' : borderColor}`,
          cursor: data ? 'pointer' : 'default',
          aspectRatio: '1',
          minHeight: 48,
          padding: '4px',
        }}>
        <span className="text-[9px] font-medium" style={{ color: 'var(--text-3)' }}>{d}</span>
        {data && (
          <div className="flex flex-col items-center justify-center flex-1 gap-0.5">
            <span className="text-[8px] leading-none" style={{ color: 'var(--text-3)' }}>
              {data.count} {data.count === 1 ? 'Trade' : 'Trades'}
            </span>
            <span className="text-[9px] font-bold leading-none text-center" style={{ color: pnlColor }}>
              {fmtCurrency(pnl, true)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-[20px] font-bold mb-4" style={{ color: 'var(--text)' }}>P&L Calendar</h1>

      {/* Stats — 2 rows on mobile */}
      <div className="grid grid-cols-3 gap-2 mb-4 md:grid-cols-5">
        {[
          { label: 'Monthly P&L', val: fmtCurrency(monthPnl, true), color: monthPnl >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Trade Days', val: tradeDays.toString(), color: 'var(--text)' },
          { label: 'Win Days', val: winDays.toString(), color: '#22c55e' },
          { label: 'Loss Days', val: lossDays.toString(), color: '#ef4444' },
          { label: 'Win %', val: `${winPct}%`, color: winPct >= 50 ? '#22c55e' : '#ef4444' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-2.5 card">
            <p className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p className="text-[15px] font-bold" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl p-4 card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
          <button onClick={next} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: 'var(--text-3)' }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>

        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', label: 'Profit' },
            { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Loss' },
            { bg: 'var(--bg-hover)', border: 'var(--border)', label: 'Breakeven' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: l.bg, border: `1px solid ${l.border}` }} />
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail */}
      {tooltip && (
        <div className="mt-4 rounded-2xl p-4 card animate-fadeUp">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
              {MONTHS[month]} {tooltip.day}, {year}
            </h3>
            <button onClick={() => setTooltip(null)} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Close</button>
          </div>
          <div className="space-y-2">
            {tooltip.data.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{t.contract}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: t.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>
                  {t.direction}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>{t.quantity} contract{t.quantity > 1 ? 's' : ''}</span>
                <span className="ml-auto text-[13px] font-bold" style={{ color: t.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                  {fmtCurrency(t.net_pnl, true)}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>Daily Total</span>
              <span className="text-[14px] font-bold" style={{ color: tooltip.data.reduce((a, t) => a + t.net_pnl, 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                {fmtCurrency(tooltip.data.reduce((a, t) => a + t.net_pnl, 0), true)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
