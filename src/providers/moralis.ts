import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class MoralisProvider {
  private apiKey: string;
  private baseUrl = 'https://solana-gateway.moralis.io';

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
    const errors: string[] = [];

    try {
      let cursor: string | undefined;
      let hasMore = true;

      console.log(`[Moralis] Fetching trades for time window: ${new Date(startTimestamp).toISOString()} -> ${new Date(endTimestamp).toISOString()}`);

      while (hasMore) {
        const params: any = {
          limit: 100,
          fromDate: new Date(startTimestamp).toISOString().split('.')[0],
          toDate: new Date(endTimestamp).toISOString().split('.')[0],
          order: 'ASC',
          transactionTypes: 'buy,sell'
        };

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await axios.get(
          `${this.baseUrl}/token/mainnet/${token.address}/swaps`,
          {
            params,
            headers: {
              'X-API-Key': this.apiKey,
              'accept': 'application/json'
            }
          }
        );

        const data = response.data;

        if (data.result && Array.isArray(data.result)) {
          const filteredTrades = data.result;

          trades.push(...filteredTrades.map((swap: any) => {
            const isBuy = swap.transactionType === 'buy';

            return {
              hash: swap.transactionHash,
              wallet: swap.walletAddress,
              type: isBuy ? 'buy' : 'sell',
              timestamp: new Date(swap.blockTimestamp).getTime(),
              dex: swap.exchangeName || 'unknown',
              amount: swap.totalValueUsd,
              price: undefined
            };
          }));

          hasMore = !!data.cursor;
          cursor = data.cursor;
        } else {
          hasMore = false;
        }
      }
    } catch (error: any) {
      errors.push(`Moralis API error: ${error.message}`);
      console.error('Moralis fetch error:', error.response?.data || error.message);
    }

    const uniqueWallets = new Set(trades.map(t => t.wallet)).size;
    const dexList = [...new Set(trades.map(t => t.dex))];

    return {
      provider: 'moralis',
      totalTrades: trades.length,
      uniqueWallets,
      dexList,
      trades,
      queryTime: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
