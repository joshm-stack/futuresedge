export interface ParsedTrade {
  date: string;
  contract: string;
  direction: 'Long' | 'Short';
  session: 'Overnight' | 'Pre-Market' | 'RTH' | 'After-Hours';
  quantity: number;
  entry_price: number;
  exit_price: number;
  fees: number;
  gross_pnl: number;
  net_pnl: number;
}

export interface ParseResult {
  trades: ParsedTrade[];
  skipped: number;
  errors: string[];
  rawRows: number;
}

const POINT_VALUES: Record<string, number> = {
  ES: 50, NQ: 20, RTY: 50, YM: 5, CL: 1000, GC: 100,
  SI: 5000, ZB: 1000, ZN: 1000, ZC: 50, NG: 10000,
  MES: 5, MNQ: 2, MCL: 100, MGC: 10, M2K: 5, MYM: 0.5,
};

function getPointValue(symbol: string): number {
  return POINT_VALUES[symbol] || 1;
}

function cleanSymbol(raw: string): string {
  return raw.trim().replace(/[FGHJKMNQUVXZ]\d{1,2}$/, '').toUpperCase();
}

function parseDateTime(raw: string): { date: string; time: string } | null {
  if (!raw) return null;
  const s = raw.trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (iso) return { date: iso[1], time: iso[2] };
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (mdy) {
    const [, m, d, y, t] = mdy;
    return { date: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`, time: t };
  }
  return null;
}

function inferSession(time: string): 'Overnight' | 'Pre-Market' | 'RTH' | 'After-Hours' {
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  if (mins >= 570 && mins < 960) return 'RTH';
  if (mins >= 480 && mins < 570) return 'Pre-Market';
  if (mins >= 960 && mins < 1200) return 'After-Hours';
  return 'Overnight';
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += line[i]; }
  }
  result.push(current.trim());
  return result;
}

interface Fill {
  side: 'B' | 'S';
  qty: number;
  price: number;
  symbol: string;
  cleanSymbol: string;
  time: string;
  date: string;
  commission: number;
}

export function parseRithmicCSV(csvText: string): ParseResult {
  const errors: string[] = [];
  let skipped = 0;

  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { trades: [], skipped: 0, errors: ['File is empty.'], rawRows: 0 };
  }

  // Find Completed Orders header
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].replace(/"/g, '').trim();
    if (clean === 'Completed Orders') { headerIdx = i + 1; break; }
  }
  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('symbol') && (lower.includes('buy') || lower.includes('sell'))) {
        headerIdx = i; break;
      }
    }
  }
  if (headerIdx === -1) {
    return { trades: [], skipped: 0, errors: ['Could not find Completed Orders section.'], rawRows: 0 };
  }

  const rawHeaders = parseCSVLine(lines[headerIdx]);
  const colMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    const norm = h.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').trim();
    colMap[norm] = i;
    if (norm.includes('buy') && norm.includes('sell')) colMap['side'] = i;
    if (norm.includes('avg') && norm.includes('fill') && norm.includes('price')) colMap['avg_fill_price'] = i;
    if (norm.includes('qty') && norm.includes('filled')) colMap['qty_filled'] = i;
    if (norm.includes('update') && norm.includes('time')) colMap['update_time'] = i;
    if (norm.includes('create') && norm.includes('time')) colMap['create_time'] = i;
  });

  const get = (cols: string[], key: string) => {
    const idx = colMap[key];
    return idx !== undefined ? (cols[idx] ?? '') : '';
  };

  const dataRows = lines.slice(headerIdx + 1).filter(l => l.trim() && l.includes(','));
  const fills: Fill[] = [];

  for (const line of dataRows) {
    const cols = parseCSVLine(line);
    const status = (get(cols, 'status') || '').toLowerCase();
    if (!status.includes('fill')) { skipped++; continue; }

    const sideRaw = get(cols, 'side') || get(cols, 'buy/sell') || '';
    const side: 'B' | 'S' = (sideRaw.toUpperCase() === 'B' || sideRaw.toLowerCase() === 'buy') ? 'B' : 'S';

    const qty = parseFloat(get(cols, 'qty_filled') || get(cols, 'qty_to_fill') || '0');
    if (!qty || qty <= 0) { skipped++; continue; }

    const price = parseFloat((get(cols, 'avg_fill_price') || '').replace(/[^0-9.-]/g, ''));
    if (!price || price <= 0) { skipped++; continue; }

    const symbol = get(cols, 'symbol') || '';
    if (!symbol) { skipped++; continue; }

    const timeRaw = get(cols, 'update_time') || get(cols, 'update_time_edt') ||
                    get(cols, 'create_time') || get(cols, 'create_time_edt') || '';
    const dt = parseDateTime(timeRaw);
    if (!dt) { skipped++; continue; }

    const commRaw = get(cols, 'commission') || '';
    const commission = commRaw ? Math.abs(parseFloat(commRaw.replace(/[^0-9.-]/g, '')) || 0) : 0;

    fills.push({ side, qty, price, symbol, cleanSymbol: cleanSymbol(symbol), time: dt.time, date: dt.date, commission });
  }

  if (!fills.length) {
    return { trades: [], skipped, errors: ['No filled orders found.'], rawRows: dataRows.length };
  }

  // Sort by date+time
  fills.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  // Group by cleanSymbol + date
  const groups: Record<string, Fill[]> = {};
  for (const fill of fills) {
    const key = `${fill.cleanSymbol}|${fill.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(fill);
  }

  const trades: ParsedTrade[] = [];

  for (const [key, dayFills] of Object.entries(groups)) {
    const [symbol, date] = key.split('|');
    const pointValue = getPointValue(symbol);

    let position = 0;
    let entryFills: Fill[] = [];

    for (const fill of dayFills) {
      const signedQty = fill.side === 'B' ? fill.qty : -fill.qty;

      if (position === 0) {
        // New position
        position = signedQty;
        entryFills = [fill];
      } else if (Math.sign(position) === Math.sign(signedQty)) {
        // Adding to position
        position += signedQty;
        entryFills.push(fill);
      } else {
        // Closing position
        const closingQty = Math.abs(signedQty);
        const openQty = Math.abs(position);
        const matchedQty = Math.min(closingQty, openQty);
        const isLong = position > 0;

        const totalEntryQty = entryFills.reduce((a, f) => a + f.qty, 0);
        const avgEntry = entryFills.reduce((a, f) => a + f.price * f.qty, 0) / totalEntryQty;
        const avgExit = fill.price;
        const fees = entryFills.reduce((a, f) => a + f.commission, 0) + fill.commission;

        const grossPnl = isLong
          ? (avgExit - avgEntry) * matchedQty * pointValue
          : (avgEntry - avgExit) * matchedQty * pointValue;

        trades.push({
          date,
          contract: symbol,
          direction: isLong ? 'Long' : 'Short',
          session: inferSession(entryFills[0].time),
          quantity: matchedQty,
          entry_price: +avgEntry.toFixed(4),
          exit_price: +avgExit.toFixed(4),
          fees: +fees.toFixed(2),
          gross_pnl: +grossPnl.toFixed(2),
          net_pnl: +(grossPnl - fees).toFixed(2),
        });

        position += signedQty;
        if (position === 0) {
          entryFills = [];
        } else if (Math.abs(signedQty) > openQty) {
          entryFills = [{ ...fill, qty: Math.abs(position), side: fill.side }];
        } else {
          const remainingQty = openQty - matchedQty;
          entryFills = remainingQty > 0
            ? [{ ...entryFills[0], qty: remainingQty }]
            : [];
        }
      }
    }
  }

  trades.sort((a, b) => b.date.localeCompare(a.date));
  return { trades, skipped, errors, rawRows: dataRows.length };
}
