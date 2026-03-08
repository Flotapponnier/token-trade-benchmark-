import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class CodexProvider {
  private apiKey: string;
  private baseUrl = 'https://graph.defined.fi/graphql';

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
      // Convert milliseconds to seconds for Codex API
      const fromTimestamp = Math.floor(startTimestamp / 1000);
      const toTimestamp = Math.floor(endTimestamp / 1000);

      console.log(`[Codex] Fetching trades for time window: ${new Date(startTimestamp).toISOString()} -> ${new Date(endTimestamp).toISOString()}`);

      let cursor: string | null = null;
      let hasMore = true;
      let pageCount = 0;
      const maxPages = 150; // Prevent infinite loops

      while (hasMore && pageCount < maxPages) {
        pageCount++;
        console.log(`[Codex] Fetching page ${pageCount}${cursor ? ' with cursor' : ' (first page)'}...`);
        const query = `
          query {
            getTokenEvents(
              query: {
                address: "${token.address}"
                networkId: 1399811149
                eventType: Swap
                timestamp: { from: ${fromTimestamp}, to: ${toTimestamp} }
                symbolType: TOKEN
              }
              ${cursor ? `cursor: "${cursor}"` : ''}
            ) {
              items {
                timestamp
                maker
                transactionHash
                eventDisplayType
                data {
                  ... on SwapEventData {
                    priceUsdTotal
                    amountNonLiquidityToken
                  }
                }
              }
              cursor
            }
          }
        `;

        const response = await axios.post(
          this.baseUrl,
          { query },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': this.apiKey
            }
          }
        );

        if (response.data.errors) {
          errors.push(`Codex errors: ${JSON.stringify(response.data.errors)}`);
          console.error('Codex errors:', response.data.errors);
          break;
        }

        const result = response.data.data?.getTokenEvents;

        if (result?.items && Array.isArray(result.items)) {
          trades.push(...result.items.map((item: any) => {
            const isBuy = item.eventDisplayType === 'Buy';

            return {
              hash: item.transactionHash,
              wallet: item.maker,
              type: isBuy ? 'buy' : 'sell',
              timestamp: item.timestamp * 1000, // Convert back to milliseconds
              platform: undefined,
              dex: undefined,
              amountUSD: parseFloat(item.data?.priceUsdTotal || '0'),
              amount: parseFloat(item.data?.amountNonLiquidityToken || '0'),
              price: undefined
            };
          }));

          cursor = result.cursor;
          hasMore = !!cursor;
          console.log(`[Codex] Page ${pageCount} fetched: ${result.items.length} trades. Total so far: ${trades.length}. ${cursor ? 'More pages available' : 'Last page'}`);
        } else {
          hasMore = false;
        }
      }

      if (pageCount >= maxPages) {
        console.log(`[Codex] Warning: Reached max page limit (${maxPages}). Results may be incomplete.`);
      }
    } catch (error: any) {
      errors.push(`Codex API error: ${error.message}`);
      console.error('Codex fetch error:', error.response?.data || error.message);
    }

    const uniqueWallets = new Set(trades.map(t => t.wallet)).size;
    const dexList: string[] = [];

    return {
      provider: 'codex',
      totalTrades: trades.length,
      uniqueWallets,
      dexList,
      trades,
      queryTime: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
