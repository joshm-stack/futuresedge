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

export function parseRithmicCSV(csvText: string): ParseResult {
  const errors: string[] = [];
  let skipped = 0;

  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { trades: [], skipped: 0, errors: ['File is empty or has no data rows.'], rawRows: 0 };
  }

  // Find "Completed Orders" section
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].replace(/"/g, '').trim();
    if (clean === 'Completed Orders') {
      headerIdx = i + 1;
      break;
    }
  }

  // If no "Completed Orders" section found, try to find header row directly
  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('symbol') && (lower.includes('buy') || lower.includes('sell') || lower.includes('side'))) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    return { trades: [], skipped: 0, errors: ['Could not find trade data in this file. Make sure you are exporting from the Completed Orders section.'], rawRows: 0 };
  }

  // Parse headers
  const rawHeaders = parseCSVLine(lines[headerIdx]);
  const colMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    const norm = h.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '').trim();
    colMap[norm] = i;
    // Also map common variations
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
  const fills: { side: string; qty: number; price: number; symbol: string; time: string; date: string; commission: number }[] = [];

  for (const line of dataRows) {
    const cols = parseCSVLine(line);

    const status = (get(cols, 'status') || '').toLowerCase();
    if (!status.includes('fill')) { skipped++; continue; }

    const sideRaw = get(cols, 'side') || get(cols, 'buy/sell') || '';
    const side = sideRaw.toUpperCase() === 'B' || sideRaw.toLowerCase() === 'buy' ? 'B' : 'S';

    const qtyStr = get(cols, 'qty_filled') || get(cols, 'qty_to_fill') || '';
    const qty = parseFloat(qtyStr);
    if (!qty || qty <= 0) { skipped++; continue; }

    const priceStr = get(cols, 'avg_fill_price') || '';
    const price = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
    if (!price || price <= 0) { skipped++; continue; }

    const symbol = get(cols, 'symbol') || '';
    if (!symbol) { skipped++; continue; }

    const timeRaw = get(cols, 'update_time') || get(cols, 'update_time_edt') || get(cols, 'create_time') || get(cols, 'create_time_edt') || '';
    const dt = parseDateTime(timeRaw);
    if (!dt) { skipped++; continue; }

    const commRaw = get(cols, 'commission') || '';
    const commission = commRaw ? Math.abs(parseFloat(commRaw.replace(/[^0-9.-]/g, '')) || 0) : 0;

    fills.push({ side, qty, price, symbol, time: dt.time, date: dt.date, commission });
  }

  if (!fills.length) {
    return {
      trades: [],
      skipped,
      errors: ['No filled orders found. Make sure your export includes filled orders with Avg Fill Price and Qty Filled columns.'],
      rawRows: dataRows.length,
    };
  }

  // Group by clean symbol + date
  const grouped: Record<string, typeof fills> = {};
  for (const fill of fills) {
    const key = `${cleanSymbol(fill.symbol)}|${fill.date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(fill);
  }

  const trades: ParsedTrade[] = [];

  for (const [key, dayFills] of Object.entries(grouped)) {
    const [symbol, date] = key.split('|');
    dayFills.sort((a, b) => a.time.localeCompare(b.time));

    const buys = dayFills.filter(f => f.side === 'B');
    const sells = dayFills.filter(f => f.side === 'S');
    const isLong = dayFills[0].side === 'B';
    const entries = isLong ? buys : sells;
    const exits = isLong ? sells : buys;

    const totalEntryQty = entries.reduce((a, f) => a + f.qty, 0);
    const totalExitQty = exits.reduce((a, f) => a + f.qty, 0);
    const matchedQty = Math.min(totalEntryQty, totalExitQty);

    if (matchedQty <= 0) { skipped++; continue; }

    const avgEntry = entries.reduce((a, f) => a + f.price * f.qty, 0) / totalEntryQty;
    const avgExit = exits.reduce((a, f) => a + f.price * f.qty, 0) / totalExitQty;
    const totalFees = dayFills.reduce((a, f) => a + f.commission, 0);
    const grossPnl = isLong ? (avgExit - avgEntry) * matchedQty : (avgEntry - avgExit) * matchedQty;
    const netPnl = grossPnl - totalFees;
    const session = inferSession(entries[0]?.time || '09:30:00');

    trades.push({
      date,
      contract: symbol,
      direction: isLong ? 'Long' : 'Short',
      session,
      quantity: matchedQty,
      entry_price: +avgEntry.toFixed(4),
      exit_price: +avgExit.toFixed(4),
      fees: +totalFees.toFixed(2),
      gross_pnl: +grossPnl.toFixed(2),
      net_pnl: +netPnl.toFixed(2),
    });
  }

  trades.sort((a, b) => b.date.localeCompare(a.date));
  return { trades, skipped, errors, rawRows: dataRows.length };
}
