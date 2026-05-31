import { Trade, Analytics, DailyStats } from '@/types';

export function calcAnalytics(trades: Trade[]): Analytics {
  if (!trades.length) {
    return {
      totalTrades: 0, totalNetPnl: 0, winRate: 0, wins: 0, losses: 0,
      breakevens: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
      avgRMultiple: 0, avgRR: 0, largestWin: 0, largestLoss: 0,
      longestWinStreak: 0, longestLossStreak: 0, avgTradesPerDay: 0,
      bestDay: 0, worstDay: 0,
    };
  }

  const wins = trades.filter(t => t.net_pnl > 0);
  const losses = trades.filter(t => t.net_pnl < 0);
  const breakevens = trades.filter(t => t.net_pnl === 0);

  const totalNetPnl = trades.reduce((a, t) => a + t.net_pnl, 0);
  const grossWin = wins.reduce((a, t) => a + t.net_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.net_pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const rTrades = trades.filter(t => t.r_multiple != null);
  const avgRMultiple = rTrades.length
    ? rTrades.reduce((a, t) => a + (t.r_multiple ?? 0), 0) / rTrades.length
    : 0;

  const largestWin = wins.length ? Math.max(...wins.map(t => t.net_pnl)) : 0;
  const largestLoss = losses.length ? Math.min(...losses.map(t => t.net_pnl)) : 0;

  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  for (const t of sorted) {
    if (t.net_pnl > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
    else if (t.net_pnl < 0) { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
    else { curWin = 0; curLoss = 0; }
  }

  const dailyMap: Record<string, number> = {};
  trades.forEach(t => { dailyMap[t.date] = (dailyMap[t.date] || 0) + t.net_pnl; });
  const dailyVals = Object.values(dailyMap);
  const bestDay = dailyVals.length ? Math.max(...dailyVals) : 0;
  const worstDay = dailyVals.length ? Math.min(...dailyVals) : 0;
  const tradingDays = Object.keys(dailyMap).length;
  const avgTradesPerDay = tradingDays ? trades.length / tradingDays : 0;

  return {
    totalTrades: trades.length, totalNetPnl, winRate: wins.length / trades.length * 100,
    wins: wins.length, losses: losses.length, breakevens: breakevens.length,
    profitFactor, avgWin, avgLoss, avgRMultiple, avgRR, largestWin, largestLoss,
    longestWinStreak: maxWin, longestLossStreak: maxLoss, avgTradesPerDay, bestDay, worstDay,
  };
}

export function calcDailyStats(trades: Trade[]): DailyStats[] {
  const map: Record<string, DailyStats> = {};
  trades.forEach(t => {
    if (!map[t.date]) map[t.date] = { date: t.date, net_pnl: 0, trade_count: 0, wins: 0, losses: 0 };
    map[t.date].net_pnl += t.net_pnl;
    map[t.date].trade_count++;
    if (t.net_pnl > 0) map[t.date].wins++;
    else if (t.net_pnl < 0) map[t.date].losses++;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export function calcEquityCurve(trades: Trade[]): { date: string; equity: number }[] {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0;
  return sorted.map(t => ({ date: t.date, equity: +(cum += t.net_pnl).toFixed(2) }));
}

export function fmtCurrency(n: number, showSign = false): string {
  const abs = Math.abs(n);
  const str = abs.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  if (n < 0) return `-${str}`;
  if (showSign && n > 0) return `+${str}`;
  return str;
}

export function fmtPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export const FUTURES_CONTRACTS = [
  { value: 'ES', label: 'ES — E-mini S&P 500' },
  { value: 'NQ', label: 'NQ — E-mini Nasdaq 100' },
  { value: 'CL', label: 'CL — Crude Oil' },
  { value: 'GC', label: 'GC — Gold' },
  { value: 'RTY', label: 'RTY — E-mini Russell 2000' },
  { value: 'YM', label: 'YM — E-mini Dow' },
  { value: 'SI', label: 'SI — Silver' },
  { value: 'ZB', label: 'ZB — 30-Year T-Bond' },
  { value: 'ZN', label: 'ZN — 10-Year T-Note' },
  { value: 'ZC', label: 'ZC — Corn' },
  { value: 'NG', label: 'NG — Natural Gas' },
  { value: 'MES', label: 'MES — Micro E-mini S&P' },
  { value: 'MNQ', label: 'MNQ — Micro E-mini Nasdaq' },
  { value: 'MCL', label: 'MCL — Micro Crude Oil' },
  { value: 'MGC', label: 'MGC — Micro Gold' },
  { value: 'M2K', label: 'M2K — Micro Russell 2000' },
  { value: 'MYM', label: 'MYM — Micro Dow' },
  { value: 'Other', label: 'Other' },
];
