# Token Trade Benchmark

Benchmark tool for comparing token trade data coverage between Mobula and Dune Analytics.

## Purpose

This tool proves a single thing: **for the same token on the same time window, Mobula returns more trades than other providers** — and identifies where the delta comes from (DEX coverage).

## What it measures

- **Total trades** captured by each provider
- **Unique wallets** (early buyers) identified
- **DEX coverage** (which DEXs are indexed)
- **Query performance** (response time)
- **Missing trades** (wallets that competitors miss)

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
DUNE_API_KEY=your_dune_api_key
```

## Configuration

Edit `src/benchmark.ts` to configure the tokens you want to test:

```typescript
const TOKENS: TokenConfig[] = [
  {
    address: 'TOKEN_ADDRESS_ON_SOLANA',
    name: 'Token Name',
    launchTimestamp: 1706745600000, // Unix timestamp in ms
    chain: 'solana'
  }
];
```

### Best tokens to test

Ideally multi-DEX launches: tokens that traded simultaneously on Raydium + Orca + Phoenix + at least one minor DEX in the first hour after launch.

## Running the benchmark

```bash
npm run benchmark
```

## Output

The tool will:
1. Fetch all trades from each provider for the configured time window
2. Compare trade counts, wallet counts, and DEX coverage
3. Print a detailed comparison report
4. Save results to `results/benchmark-[timestamp].json`

### Example output:

```
BENCHMARK RESULTS
==============================================================

Token: Example Token
Time Window: 2024-02-01T00:00:00.000Z -> 2024-02-01T01:00:00.000Z
Duration: 60 minutes

TRADE COUNT COMPARISON:
┌──────────────────────────────────────────────────────────┐
│ Provider  │ Total Trades │ Unique Wallets │ Query Time │
├──────────────────────────────────────────────────────────┤
│ Mobula    │ 1247         │ 583            │ 2340ms     │
│ Dune      │ 1089         │ 502            │ 38100ms    │
└──────────────────────────────────────────────────────────┘

DELTA ANALYSIS:
Mobula vs Dune:
  - Trade delta: +158 trades (14.5% more)
  - Wallet delta: +81 unique wallets

DEX COVERAGE:
Mobula DEXs (8): Raydium, Orca, Phoenix, Lifinity, Jupiter, Meteora, Aldrin, Saber
Dune DEXs (6): Raydium, Orca, Phoenix, Jupiter, Meteora, Saber

Missing from Dune: Lifinity, Aldrin
```

## What this proves

- **The Missing Trade Problem**: Trades that Mobula captures but competitors miss
- **DEX Coverage Gap**: Specific DEXs where data is incomplete on other providers
- **Early Buyer Detection**: Wallets that would never be labeled by systems using incomplete data
- **Query Performance**: Real-time vs batch processing latency

## Project Structure

```
src/
├── types.ts              # TypeScript interfaces
├── providers/
│   ├── mobula.ts        # Mobula API client
│   └── dune.ts          # Dune Analytics API client
└── benchmark.ts         # Main benchmark script
```

## License

MIT
