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
  platform?: string; // Front-end/wallet used (Phantom, BullX, etc)
  dex?: string; // Actual DEX protocol
  marketAddress?: string; // Pool/market address
  amount?: number;
  amountUSD?: number;
  price?: number;
  isMEV?: boolean;
  labels?: string[];
  totalFeesUSD?: number;
  gasFeesUSD?: number;
  platformFeesUSD?: number;
  mevFeesUSD?: number;
}

export interface ProviderResult {
  provider: 'mobula' | 'moralis' | 'bitquery' | 'codex';
  totalTrades: number;
  uniqueWallets: number;
  dexList: string[];
  platformList?: string[]; // Trading platforms/front-ends (Mobula only)
  trades: Trade[];
  queryTime: number; // in ms
  errors?: string[];
}

