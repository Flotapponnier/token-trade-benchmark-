import axios from 'axios';
import { Trade, ProviderResult, TokenConfig } from '../types';

export class BitqueryProvider {
  private apiKey: string;
  private baseUrl = 'https://streaming.bitquery.io/graphql';

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

      console.log(`[Bitquery ${token.chain}] Fetching trades for time window: ${startDate} -> ${endDate}`);
      console.log(`[Bitquery ${token.chain}] Token address: ${token.address}`);

      const isSolana = token.chain === 'solana';
      const networkMap: Record<string, string> = {
        'ethereum': 'eth',
        'bsc': 'bsc',
        'base': 'base'
      };

      let query: string;

      if (isSolana) {
        query = `
          query GetTrades {
            Solana(dataset: realtime) {
              DEXTradeByTokens(
                where: {
                  Block: {
                    Time: {
                      since: "${startDate}"
                      till: "${endDate}"
                    }
                  }
                  Transaction: { Result: { Success: true } }
                  Trade: {
                    Currency: {
                      MintAddress: { is: "${token.address}" }
                    }
                  }
                }
                orderBy: { ascending: Block_Time }
                limit: { count: 10000 }
              ) {
                Block { Time }
                Trade {
                  Account { Owner }
                  Dex { ProtocolName ProtocolFamily }
                  Amount
                  AmountInUSD
                  Side { Type AmountInUSD Currency { MintAddress } }
                }
                Transaction { Signature }
              }
            }
          }
        `;
      } else {
        // EVM chains
        const network = networkMap[token.chain] || 'eth';
        query = `
          query GetTrades {
            EVM(network: ${network}) {
              DEXTradeByTokens(
                where: {
                  Block: {
                    Time: {
                      since: "${startDate}"
                      till: "${endDate}"
                    }
                  }
                  TransactionStatus: { Success: true }
                  Trade: {
                    Currency: {
                      SmartContract: {
                        is: "${token.address}"
                      }
                    }
                  }
                }
                orderBy: { descending: Block_Time }
                limit: { count: 10000 }
              ) {
                Block { Time }
                Trade {
                  Dex { ProtocolName ProtocolFamily }
                  Buyer
                  Seller
                  AmountInUSD
                  Side {
                    Type
                    AmountInUSD
                    Currency {
                      SmartContract
                    }
                  }
                }
                Transaction { Hash }
              }
            }
          }
        `;
      }

      const response = await axios.post(
        this.baseUrl,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey
          }
        }
      );

      console.log(`[Bitquery] Raw API response:`, JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        errors.push(`Bitquery errors: ${JSON.stringify(response.data.errors)}`);
        console.error('Bitquery errors:', response.data.errors);
      }

      const tradeData = isSolana
        ? response.data.data?.Solana?.DEXTradeByTokens
        : response.data.data?.EVM?.DEXTradeByTokens;

      if (tradeData && Array.isArray(tradeData)) {
        trades.push(...tradeData.map((t: any) => {
          if (isSolana) {
            const isBuy = t.Trade.Side?.Type === 'buy';
            return {
              hash: t.Transaction.Signature,
              wallet: t.Trade.Account.Owner,
              type: isBuy ? 'buy' : 'sell',
              timestamp: new Date(t.Block.Time).getTime(),
              dex: t.Trade.Dex?.ProtocolName || t.Trade.Dex?.ProtocolFamily || 'unknown',
              amount: t.Trade.Side?.AmountInUSD || t.Trade.AmountInUSD,
              price: undefined
            };
          } else {
            // EVM chains
            const isBuy = t.Trade.Side?.Type === 'buy';
            const wallet = isBuy ? t.Trade.Buyer : t.Trade.Seller;
            return {
              hash: t.Transaction.Hash,
              wallet: wallet || 'unknown',
              type: isBuy ? 'buy' : 'sell',
              timestamp: new Date(t.Block.Time).getTime(),
              dex: t.Trade.Dex?.ProtocolName || t.Trade.Dex?.ProtocolFamily || 'unknown',
              amount: t.Trade.Side?.AmountInUSD || t.Trade.AmountInUSD,
              price: undefined
            };
          }
        }));
      }
    } catch (error: any) {
      errors.push(`Bitquery API error: ${error.message}`);
      console.error('Bitquery fetch error:', error.response?.data || error.message);
    }

    const uniqueWallets = new Set(trades.map(t => t.wallet)).size;
    const dexList = [...new Set(trades.map(t => t.dex))];

    return {
      provider: 'bitquery',
      totalTrades: trades.length,
      uniqueWallets,
      dexList,
      trades,
      queryTime: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
