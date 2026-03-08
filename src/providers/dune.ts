import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class DuneProvider {
  private apiKey: string;
  private baseUrl = 'https://api.dune.com/api/v1';

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
      const startDate = new Date(startTimestamp).toISOString().split('T')[0];
      const endDate = new Date(endTimestamp).toISOString().split('T')[0];

      const query = `
        SELECT
          tx_hash as hash,
          trader as wallet,
          CASE
            WHEN token_bought_address = '${token.address}' THEN 'buy'
            ELSE 'sell'
          END as type,
          block_time as timestamp,
          project as dex,
          amount_usd as amount
        FROM solana.trades
        WHERE
          (token_bought_address = '${token.address}' OR token_sold_address = '${token.address}')
          AND block_time >= TIMESTAMP '${startDate}'
          AND block_time <= TIMESTAMP '${endDate}'
        ORDER BY block_time ASC
      `;

      // Execute query
      const executeResponse = await axios.post(
        `${this.baseUrl}/query/execute`,
        {
          query_sql: query
        },
        {
          headers: {
            'X-Dune-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const executionId = executeResponse.data.execution_id;

      // Poll for results
      let results = null;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await axios.get(
          `${this.baseUrl}/execution/${executionId}/results`,
          {
            headers: {
              'X-Dune-API-Key': this.apiKey
            }
          }
        );

        if (statusResponse.data.state === 'QUERY_STATE_COMPLETED') {
          results = statusResponse.data.result.rows;
          break;
        } else if (statusResponse.data.state === 'QUERY_STATE_FAILED') {
          errors.push('Dune query failed');
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
          dex: r.dex || 'unknown',
          amount: r.amount
        })));
      } else if (attempts >= maxAttempts) {
        errors.push('Dune query timeout');
      }
    } catch (error: any) {
      errors.push(`Dune API error: ${error.message}`);
      console.error('Dune fetch error:', error.response?.data || error.message);
    }

    const uniqueWallets = new Set(trades.map(t => t.wallet)).size;
    const dexList = [...new Set(trades.map(t => t.dex))];

    return {
      provider: 'dune',
      totalTrades: trades.length,
      uniqueWallets,
      dexList,
      trades,
      queryTime: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
