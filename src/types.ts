export interface TokenConfig {
  address: string;
  name: string;
  launchTimestamp: number; // Unix timestamp in milliseconds
  chain: string;
}

export interface Trade {
  hash: string;
  wallet: string;
  type: 'buy' | 'sell';
  timestamp: number;
  dex: string;
  amount?: number;
  price?: number;
  isMEV?: boolean;
  labels?: string[];
}

export interface ProviderResult {
  provider: 'mobula' | 'flipside' | 'dune';
  totalTrades: number;
  uniqueWallets: number;
  dexList: string[];
  trades: Trade[];
  queryTime: number; // in ms
  errors?: string[];
}

