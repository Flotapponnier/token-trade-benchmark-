import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class MobulaProvider {
  private apiKey: string;
  private baseUrl = 'https://api.mobula.io/api/2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchTrades(
    token: TokenConfig,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<ProviderResult> {
    const startTime = Date.now();
    const trades: Trade[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    const errors: string[] = [];

    try {
      while (hasMore) {
        const params: any = {
          tokenAddress: token.address,
          blockchain: token.chain,
          from: startTimestamp,
          to: endTimestamp,
          limit: 5000,
          sortOrder: 'asc'
        };

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await axios.get(`${this.baseUrl}/trades/filters`, {
          params,
          headers: {
            Authorization: this.apiKey
          }
        });

        const data = response.data;

        if (data.data && Array.isArray(data.data)) {
          trades.push(...data.data.map((t: any) => ({
            hash: t.hash || t.transactionHash,
            wallet: t.swapSenderAddress || t.wallet,
            type: t.type,
            timestamp: t.timestamp || t.blockTimestamp,
            dex: t.platform?.name || 'unknown',
            amount: t.amountUSD,
            price: t.baseTokenPriceUSD,
            isMEV: t.operation === 'mev',
            labels: t.labels || []
          })));
        }

        hasMore = data.pagination?.hasMore || false;
        cursor = data.pagination?.nextCursor;
      }
    } catch (error: any) {
      errors.push(`Mobula API error: ${error.message}`);
      console.error('Mobula fetch error:', error.response?.data || error.message);
    }

    const uniqueWallets = new Set(trades.map(t => t.wallet)).size;
    const dexList = [...new Set(trades.map(t => t.dex))];

    return {
      provider: 'mobula',
      totalTrades: trades.length,
      uniqueWallets,
      dexList,
      trades,
      queryTime: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
