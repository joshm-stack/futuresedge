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

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const data = dayMap[d];
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    const pnl = data?.pnl ?? 0;
    let bg = '#12151f';
    let pnlColor = 'transparent';
    if (data) {
      if (pnl > 0) { bg = '#0c2014'; pnlColor = '#22c55e'; }
      else if (pnl < 0) { bg = '#200c0c'; pnlColor = '#ef4444'; }
      else { bg = '#1e2336'; pnlColor = '#8892b8'; }
    }
    cells.push(
      <div key={d} onClick={() => data && setTooltip(tooltip?.day === d ? null : { day: d, data: data.trades })}
        className="cal-day rounded-lg p-1.5 relative select-none"
        style={{ background: bg, border: `1px solid ${isToday ? '#4f7ef8' : data ? 'rgba(255,255,255,0.06)' : '#1e2336'}`, cursor: data ? 'pointer' : 'default', aspectRatio: '1', minHeight: 60 }}>
        <span className="text-[10px]" style={{ color: '#8892b8' }}>{d}</span>
        {data && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] mb-0.5" style={{ color: '#8892b8' }}>{data.count}T</span>
            <span className="text-[10px] font-medium" style={{ color: pnlColor }}>
              {pnl >= 0 ? '+' : ''}{Math.abs(pnl) >= 1000 ? `$${(pnl/1000).toFixed(1)}k` : `$${pnl.toFixed(0)}`}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-semibold mb-5" style={{ color: '#e2e8ff' }}>P&L Calendar</h1>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Monthly P&L', val: fmtCurrency(monthPnl, true), color: monthPnl >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Trading Days', val: tradeDays.toString(), color: '#e2e8ff' },
          { label: 'Win Days', val: winDays.toString(), color: '#22c55e' },
          { label: 'Loss Days', val: lossDays.toString(), color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#12151f', border: '1px solid #252b40' }}>
            <p className="text-[11px] mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p className="text-[20px] font-semibold" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-[15px] font-semibold" style={{ color: '#e2e8ff' }}>{MONTHS[month]} {year}</span>
          <button onClick={next} style={{ background: '#1e2336', border: '1px solid #252b40', color: '#8892b8', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS.map(d => <div key={d} className="text-center text-[11px] font-medium py-1" style={{ color: '#4a5270' }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">{cells}</div>

        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid #1e2336' }}>
          {[{ bg: '#0c2014', label: 'Profit day' },{ bg: '#200c0c', label: 'Loss day' },{ bg: '#1e2336', label: 'Breakeven' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: l.bg, border: '1px solid rgba(255,255,255,0.08)' }} />
              <span className="text-[11px]" style={{ color: '#4a5270' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="mt-4 rounded-xl p-4" style={{ background: '#12151f', border: '1px solid #313856' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold" style={{ color: '#e2e8ff' }}>{MONTHS[month]} {tooltip.day}, {year}</h3>
            <button onClick={() => setTooltip(null)} style={{ color: '#4a5270', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Close</button>
          </div>
          <div className="space-y-2">
            {tooltip.data.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: '#1e2336' }}>
                <span className="text-[12px] font-medium w-10" style={{ color: '#e2e8ff' }}>{t.contract}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded w-12 text-center"
                  style={{ background: t.direction === 'Long' ? '#0f2040' : '#2a1f0f', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>{t.direction}</span>
                <span className="text-[11px]" style={{ color: '#8892b8' }}>{t.quantity} contract{t.quantity > 1 ? 's' : ''}</span>
                <span className="ml-auto text-[13px] font-medium" style={{ color: t.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(t.net_pnl, true)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #252b40' }}>
              <span className="text-[12px]" style={{ color: '#8892b8' }}>Daily Total</span>
              <span className="text-[13px] font-semibold" style={{ color: tooltip.data.reduce((a, t) => a + t.net_pnl, 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                {fmtCurrency(tooltip.data.reduce((a, t) => a + t.net_pnl, 0), true)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
