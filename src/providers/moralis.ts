import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class MoralisProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getBaseUrl(chain: string): string {
    if (chain === 'solana') {
      return 'https://solana-gateway.moralis.io';
    }
    // EVM chains use the unified endpoint
    return 'https://deep-index.moralis.io/api/v2.2';
  }

  private getChainParam(chain: string): string | undefined {
    const chainMap: Record<string, string> = {
      'ethereum': '0x1',
      'bsc': '0x38',
      'base': '0x2105'
    };
    return chainMap[chain];
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

      console.log(`[Moralis ${token.chain}] Fetching trades for time window: ${new Date(startTimestamp).toISOString()} -> ${new Date(endTimestamp).toISOString()}`);

      let pageCount = 0;
      const baseUrl = this.getBaseUrl(token.chain);
      const isSolana = token.chain === 'solana';

      while (hasMore) {
        pageCount++;
        const params: any = {
          limit: 100,
          fromDate: new Date(startTimestamp).toISOString().split('.')[0],
          toDate: new Date(endTimestamp).toISOString().split('.')[0],
          order: 'ASC'
        };

        if (isSolana) {
          params.transactionTypes = 'buy,sell';
        }

        // Add chain param for EVM
        const chainParam = this.getChainParam(token.chain);
        if (chainParam) {
          params.chain = chainParam;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const endpoint = isSolana
          ? `${baseUrl}/token/mainnet/${token.address}/swaps`
          : `${baseUrl}/erc20/${token.address}/swaps`;

        const response = await axios.get(endpoint, {
          params,
          headers: {
            'X-API-Key': this.apiKey,
            'accept': 'application/json'
          }
        });

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
          console.log(`[Moralis] Page ${pageCount}: ${filteredTrades.length} trades. Total: ${trades.length}. ${hasMore ? 'More pages' : 'Done'}`);
        } else {
          hasMore = false;
        }
      }

      console.log(`[Moralis] Completed: ${pageCount} pages, ${trades.length} total trades`);
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
