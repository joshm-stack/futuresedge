export interface RithmicFill {
  account: string;
  symbol: string;
  date: string;
  time: string;
  side: 'Buy' | 'Sell';
  qty: number;
  price: number;
  commission: number;
  orderNumber: string;
}

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
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (mdy) {
    const [, m, d, y, t] = mdy;
    return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, time: t };
  }
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (iso) return { date: iso[1], time: iso[2] };
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

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s|/]+/g, '_');
}

const HEADER_MAP: Record<string, string> = {
  'account': 'account',
  'status': 'status',
  'buy/sell': 'side',
  'buysell': 'side',
  'buy_sell': 'side',
  'qty_to_fill': 'qty_to_fill',
  'qty_filled': 'qty_filled',
  'qtyfilled': 'qty_filled',
  'symbol': 'symbol',
  'avg_fill_price': 'avg_fill_price',
  'avg_fill': 'avg_fill_price',
  'avgfillprice': 'avg_fill_price',
  'limit_price': 'limit_price',
  'order_number': 'order_number',
  'ordernumber': 'order_number',
  'create_time': 'create_time',
  'createtime': 'create_time',
  'update_time': 'update_time',
  'updatetime': 'update_time',
  'commission': 'commission',
  'commission_fill_rate': 'commission',
};

export function parseRithmicCSV(csvText: string): ParseResult {
  const errors: string[] = [];
  let skipped = 0;

  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { trades: [], skipped: 0, errors: ['File is empty or has no data rows.'], rawRows: 0 };
  }

  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('symbol') || lower.includes('buy/sell') || lower.includes('buy_sell')) {
      headerIdx = i;
      break;
    }
  }

  const rawHeaders = lines[headerIdx].split(',').map(h => h.replace(/"/g, '').trim());
  const colMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    const norm = normalizeHeader(h);
    const canonical = HEADER_MAP[norm];
    if (canonical) colMap[canonical] = i;
  });

  const required = ['side', 'symbol', 'qty_filled', 'avg_fill_price'];
  const missing = required.filter(k => colMap[k] === undefined);
  if (missing.length) {
    return {
      trades: [], skipped: 0,
      errors: [`Missing required columns: ${missing.join(', ')}. Make sure to add all columns before exporting from R|Trader.`],
      rawRows: 0,
    };
  }

  const fills: RithmicFill[] = [];
  const dataRows = lines.slice(headerIdx + 1);

  for (let i = 0; i < dataRows.length; i++) {
    const line = dataRows[i];
    if (!line.trim()) continue;
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const get = (key: string) => (colMap[key] !== undefined ? (cols[colMap[key]] ?? '') : '');

    const status = get('status').toLowerCase();
    if (status && !status.includes('complete') && !status.includes('fill') && !status.includes('traded')) { skipped++; continue; }

    const sideRaw = get('side').toLowerCase();
    if (!sideRaw.includes('buy') && !sideRaw.includes('sell')) { skipped++; continue; }
    const side = sideRaw.includes('buy') ? 'Buy' : 'Sell';

    const qty = parseFloat(get('qty_filled') || get('qty_to_fill'));
    if (!qty || qty <= 0) { skipped++; continue; }

    const price = parseFloat((get('avg_fill_price') || '').replace(/[^0-9.-]/g, ''));
    if (!price || price <= 0) { skipped++; continue; }

    const symbolRaw = get('symbol');
    if (!symbolRaw) { skipped++; continue; }

    const timeRaw = get('update_time') || get('create_time');
    const dt = parseDateTime(timeRaw);
    if (!dt) { skipped++; continue; }

    const commRaw = get('commission');
    const commission = commRaw ? Math.abs(parseFloat(commRaw.replace(/[^0-9.-]/g, '')) || 0) : 0;

    fills.push({ account: get('account'), symbol: symbolRaw, date: dt.date, time: dt.time, side, qty, price, commission, orderNumber: get('order_number') });
  }

  if (!fills.length) {
    return { trades: [], skipped, errors: ['No filled orders found. Make sure you are exporting from the Completed Orders section.'], rawRows: dataRows.length };
  }

  const grouped: Record<string, RithmicFill[]> = {};
  for (const fill of fills) {
    const key = `${cleanSymbol(fill.symbol)}|${fill.date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(fill);
  }

  const trades: ParsedTrade[] = [];

  for (const [key, dayFills] of Object.entries(grouped)) {
    const [symbol, date] = key.split('|');
    dayFills.sort((a, b) => a.time.localeCompare(b.time));

    const buys = dayFills.filter(f => f.side === 'Buy');
    const sells = dayFills.filter(f => f.side === 'Sell');
    const isLong = dayFills[0].side === 'Buy';
    const entries = isLong ? buys : sells;
    const exits = isLong ? sells : buys;

    const totalEntryQty = entries.reduce((a, f) => a + f.qty, 0);
    const totalExitQty = exits.reduce((a, f) => a + f.qty, 0);
    const matchedQty = Math.min(totalEntryQty, totalExitQty);
    if (matchedQty <= 0) { skipped++; continue; }

    const avgEntry = entries.reduce((a, f) => a + f.price * f.qty, 0) / totalEntryQty;
    const avgExit = exits.reduce((a, f) => a + f.price * f.qty, 0) / totalExitQty;
    const totalFees = [...entries, ...exits].reduce((a, f) => a + f.commission, 0);
    const grossPnl = isLong ? (avgExit - avgEntry) * matchedQty : (avgEntry - avgExit) * matchedQty;
    const netPnl = grossPnl - totalFees;

    trades.push({
      date, contract: symbol, direction: isLong ? 'Long' : 'Short',
      session: inferSession(entries[0]?.time || '09:30:00'),
      quantity: matchedQty,
      entry_price: +avgEntry.toFixed(4), exit_price: +avgExit.toFixed(4),
      fees: +totalFees.toFixed(2), gross_pnl: +grossPnl.toFixed(2), net_pnl: +netPnl.toFixed(2),
    });
  }

  trades.sort((a, b) => b.date.localeCompare(a.date));
  return { trades, skipped, errors, rawRows: dataRows.length };
}
