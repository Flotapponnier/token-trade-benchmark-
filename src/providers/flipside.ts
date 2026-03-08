import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class FlipsideProvider {
  private apiKey: string;
  private baseUrl = 'https://api-v2.flipsidecrypto.xyz';

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
      const startDate = new Date(startTimestamp).toISOString();
      const endDate = new Date(endTimestamp).toISOString();

      const query = `
        SELECT
          tx_id as hash,
          swapper as wallet,
          CASE
            WHEN swap_to_mint = '${token.address}' THEN 'buy'
            ELSE 'sell'
          END as type,
          block_timestamp as timestamp,
          program_id as dex,
          swap_to_amount as amount
        FROM solana.defi.fact_swaps
        WHERE
          (swap_from_mint = '${token.address}' OR swap_to_mint = '${token.address}')
          AND block_timestamp BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY block_timestamp ASC
      `;

      // Create query
      const createResponse = await axios.post(
        `${this.baseUrl}/queries`,
        {
          sql: query,
          ttlMinutes: 15
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const queryId = createResponse.data.query_id;

      // Poll for results
      let results = null;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between polls

        const statusResponse = await axios.get(
          `${this.baseUrl}/queries/${queryId}`,
          {
            headers: {
              'x-api-key': this.apiKey
            }
          }
        );

        if (statusResponse.data.state === 'SUCCESS') {
          results = statusResponse.data.results;
          break;
        } else if (statusResponse.data.state === 'FAILED') {
          errors.push('Flipside query failed');
          break;
        }

        attempts++;
      }

      if (results && Array.isArray(results)) {
        trades.push(...results.map((r: any) => ({
          hash: r.hash,
          wallet: r.wallet,
          type: r.type,
          timestamp: new Date(r.timestamp).getTime(),
          dex: this.mapProgramIdToDex(r.dex),
          amount: r.amount
        })));
      } else if (attempts >= maxAttempts) {
        errors.push('Flipside query timeout');
      }
    } catch (error: any) {
      errors.push(`Flipside API error: ${error.message}`);
      console.error('Flipside fetch error:', error.response?.data || error.message);
    }

    const uniqueWallets = new Set(trades.map(t => t.wallet)).size;
    const dexList = [...new Set(trades.map(t => t.dex))];

    return {
      provider: 'flipside',
      totalTrades: trades.length,
      uniqueWallets,
      dexList,
      trades,
      queryTime: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private mapProgramIdToDex(programId: string): string {
    const mapping: Record<string, string> = {
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium',
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca',
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
      'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix',
      '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c': 'Lifinity'
    };

    return mapping[programId] || programId;
  }
}
