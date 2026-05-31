export type Direction = 'Long' | 'Short';
export type Session = 'Overnight' | 'Pre-Market' | 'RTH' | 'After-Hours';

export interface Trade {
  id: string;
  user_id: string;
  date: string;
  contract: string;
  direction: Direction;
  session: Session;
  quantity: number;
  entry_price: number;
  exit_price: number;
  stop_loss?: number;
  take_profit?: number;
  fees: number;
  gross_pnl: number;
  net_pnl: number;
  r_multiple?: number;
  setup_tags: string[];
  mistake_tags: string[];
  rating?: number;
  notes?: string;
  account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TradeFormData {
  date: string;
  contract: string;
  direction: Direction;
  session: Session;
  quantity: number;
  entry_price: number;
  exit_price: number;
  stop_loss?: number;
  take_profit?: number;
  fees: number;
  setup_tags: string[];
  mistake_tags: string[];
  rating?: number;
  notes?: string;
}

export interface DailyStats {
  date: string;
  net_pnl: number;
  trade_count: number;
  wins: number;
  losses: number;
}

export interface Analytics {
  totalTrades: number;
  totalNetPnl: number;
  winRate: number;
  wins: number;
  losses: number;
  breakevens: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgRMultiple: number;
  avgRR: number;
  largestWin: number;
  largestLoss: number;
  longestWinStreak: number;
  longestLossStreak: number;
  avgTradesPerDay: number;
  bestDay: number;
  worstDay: number;
}

export interface PlaybookEntry {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  rules: string[];
  tags: string[];
  created_at: string;
}

export interface NotebookEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  broker?: string;
  type: 'Live' | 'Demo' | 'Prop';
  starting_balance: number;
  created_at: string;
}
