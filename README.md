# Solana Token Trade Data Benchmark

Neutral benchmark comparing trade data coverage across Solana data providers (Mobula, Moralis, Bitquery).

## Purpose

This tool benchmarks trade data completeness for newly launched tokens on Solana, focusing on the critical first hour after launch. It measures:

- Total trades captured
- Unique wallets (early buyers) identified
- DEX coverage (which DEXs are indexed)
- Query performance (response time)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Add your API keys to `.env`:
```
MOBULA_API_KEY=your_mobula_api_key
MORALIS_API_KEY=your_moralis_api_key
BITQUERY_API_KEY=your_bitquery_api_key
```

## Configuration

Edit `src/benchmark.ts` to configure the token you want to test:

```typescript
const TOKENS: TokenConfig[] = [
  {
    address: 'TOKEN_ADDRESS_ON_SOLANA',
    name: 'Token Name',
    launchTimestamp: Date.now() - (200 * 60 * 1000), // Example: 3h20min ago
    chain: 'solana'
  }
];
```

## Running the benchmark

```bash
npm run benchmark
```

## API Endpoints Used

### Mobula
- **Endpoint**: `GET https://api.mobula.io/api/2/trades/filters`
- **Authentication**: `Authorization: {API_KEY}`
- **Time filtering**: `from={timestamp_ms}&to={timestamp_ms}`
- **Pagination**: `cursor` (auto), `limit=5000` max per page
- **Features**: Full DEX coverage, real-time data

### Moralis
- **Endpoint**: `GET https://solana-gateway.moralis.io/token/mainnet/{TOKEN}/swaps`
- **Authentication**: `X-API-Key: {API_KEY}`
- **Time filtering**: `fromDate=2026-03-08T15:03:17&toDate=2026-03-08T16:03:17`
- **Pagination**: `cursor` (manual), `limit=100` max per page
- **Additional params**: `order=ASC`, `transactionTypes=buy,sell`
- **Limitations**: Data available from September 2024 onwards only

### Bitquery
- **Endpoint**: `POST https://streaming.bitquery.io/graphql`
- **Authentication**: `X-API-KEY: {API_KEY}`
- **Time filtering**: GraphQL `Block.Time.since` and `till` fields (ISO string)
- **Pagination**: `limit: {count: 10000}` max, no cursor pagination
- **Dataset**: Must use `dataset: realtime` (not `combined`)
- **Query structure**:
```graphql
query {
  Solana(dataset: realtime) {
    DEXTradeByTokens(
      where: {
        Block: { Time: { since: "...", till: "..." } }
        Trade: { Currency: { MintAddress: { is: "..." } } }
      }
      limit: { count: 10000 }
    ) { ... }
  }
}
```

## Benchmark Results Summary

Test token: `BWJ7zJauzatao4FsBnGdVsqdBi3k5NbgSY62noZApump`
Time window: First hour after launch (60 minutes)

### Mobula
- **Total trades**: 12,823
- **Unique wallets**: 2,745
- **DEX coverage**: 13 DEXs
- **Query time**: 4,662ms
- **Missing trades**: 0 (baseline)
- **DEXs covered**:
  - unknown
  - Axiom
  - Fomo
  - GMGN
  - Phantom
  - Padre
  - Trojan
  - BullX
  - Photon
  - Bloom
  - UniversalX
  - Maestro
  - Lute

### Moralis
- **Total trades**: 6,009
- **Unique wallets**: 2,071
- **DEX coverage**: 2 DEXs
- **Query time**: 16,877ms
- **Missing trades**: 6,814 (53.1% of total)
- **DEXs covered**:
  - PumpSwap
  - Meteora Dynamic AMM v2

### Bitquery
- **Total trades**: 10,000 (hard limit reached)
- **Unique wallets**: 2,268
- **DEX coverage**: 5 DEXs
- **Query time**: 2,953ms
- **Missing trades**: 2,823 (22.0% of total)
- **DEXs covered**:
  - dex_solana_v3
  - pump_amm
  - lb_clmm
  - cp_amm
  - jupiter

## Output

The tool will:
1. Fetch all trades from each provider for the configured time window
2. Compare trade counts, wallet counts, and DEX coverage
3. Print a detailed comparison report to console
4. Save raw results to `results/benchmark-[timestamp].json`

## Project Structure

```
src/
├── types.ts              # TypeScript interfaces
├── providers/
│   ├── mobula.ts        # Mobula API client
│   ├── moralis.ts       # Moralis API client
│   └── bitquery.ts      # Bitquery GraphQL client
└── benchmark.ts         # Main benchmark script
```

## License

MIT
