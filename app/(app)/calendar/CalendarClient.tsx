'use client';
import { useState } from 'react';
import { fmtCurrency } from '@/lib/analytics';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface DayTrade { date: string; net_pnl: number; quantity: number; contract: string; direction: string; }
interface Props { trades: DayTrade[]; }

export default function CalendarClient({ trades }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<{ day: number; data: DayTrade[] } | null>(null);

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

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>P&L Calendar</h1>

      {/* Stats - 2x3 grid that fits on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Monthly P&L', val: fmtCurrency(monthPnl, true), color: monthPnl >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Trade Days', val: tradeDays.toString(), color: 'var(--text)' },
          { label: 'Win %', val: `${winPct}%`, color: winPct >= 50 ? '#22c55e' : '#ef4444' },
          { label: 'Win Days', val: winDays.toString(), color: '#22c55e' },
          { label: 'Loss Days', val: lossDays.toString(), color: '#ef4444' },
          { label: 'Best Day', val: fmtCurrency(Math.max(...Object.values(dayMap).map(d => d.pnl), 0), true), color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '10px 12px', borderRadius: 12 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px 0' }}>{s.label}</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card" style={{ padding: 16, borderRadius: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prev} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
          <button onClick={next} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', paddingBottom: 4 }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const data = dayMap[d];
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const pnl = data?.pnl ?? 0;
            let bg = 'transparent', pnlColor = 'var(--text-3)', borderColor = 'var(--border)';
            if (data) {
              if (pnl > 0) { bg = 'rgba(34,197,94,0.1)'; pnlColor = '#22c55e'; borderColor = 'rgba(34,197,94,0.25)'; }
              else if (pnl < 0) { bg = 'rgba(239,68,68,0.1)'; pnlColor = '#ef4444'; borderColor = 'rgba(239,68,68,0.25)'; }
              else { bg = 'var(--bg-hover)'; }
            }
            return (
              <div key={d}
                onClick={() => data && setSelected(selected?.day === d ? null : { day: d, data: data.trades })}
                style={{ background: bg, border: `1px solid ${isToday ? '#4f7ef8' : borderColor}`, borderRadius: 10, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: data ? 'pointer' : 'default', padding: 2 }}>
                <span style={{ fontSize: 9, color: 'var(--text-3)', lineHeight: 1 }}>{d}</span>
                {data && (
                  <>
                    <span style={{ fontSize: 8, color: 'var(--text-3)', lineHeight: 1.2 }}>{data.count}T</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: pnlColor, lineHeight: 1, textAlign: 'center' }}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl) >= 1000 ? `${(Math.abs(pnl) / 1000).toFixed(1)}k` : Math.abs(pnl).toFixed(0)}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {[{ bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: 'Profit' }, { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Loss' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: l.bg, border: `1px solid ${l.border}` }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail */}
      {selected && (
        <div className="card" style={{ padding: 16, borderRadius: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{MONTHS[month]} {selected.day}</h3>
            <button onClick={() => setSelected(null)} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Close</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.data.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-hover)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t.contract}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.direction === 'Long' ? 'rgba(79,126,248,0.1)' : 'rgba(245,158,11,0.1)', color: t.direction === 'Long' ? '#4f7ef8' : '#f59e0b' }}>{t.direction}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.quantity}x</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.net_pnl >= 0 ? '#22c55e' : '#ef4444' }}>{fmtCurrency(t.net_pnl, true)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Daily Total</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: selected.data.reduce((a, t) => a + t.net_pnl, 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                {fmtCurrency(selected.data.reduce((a, t) => a + t.net_pnl, 0), true)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
