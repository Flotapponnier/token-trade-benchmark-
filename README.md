# Token Trade Coverage Analysis

Tool for analyzing token trade data coverage using Mobula API.

## Purpose

This tool analyzes trade coverage for newly launched tokens, focusing on the critical first hour after launch. It measures total trades, unique wallets (early buyers), DEX coverage, and MEV activity.

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

3. Add your API key to `.env`:
```
MOBULA_API_KEY=your_mobula_api_key
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
MOBULA DATA COVERAGE REPORT
============================================================

Token: Test Token
Address: BWJ7zJauzatao4FsBnGdVsqdBi3k5NbgSY62noZApump
Time Window: 2026-03-08T14:47:00.000Z -> 2026-03-08T15:47:00.000Z
Duration: 60 minutes (first hour after launch)

TRADE STATISTICS:
┌──────────────────────────────────────────────────────────┐
│ Metric             │ Value                                │
├──────────────────────────────────────────────────────────┤
│ Total Trades       │ 13922                                │
│ Unique Wallets     │ 2892                                 │
│ Buy Trades         │ 8456                                 │
│ Sell Trades        │ 5466                                 │
│ MEV Trades         │ 234                                  │
│ Query Time         │ 6561ms                               │
│ DEX Count          │ 13                                   │
└──────────────────────────────────────────────────────────┘

DEX COVERAGE (13 platforms):
  1. Phantom
  2. Trojan
  3. Fomo
  4. Axiom
  5. Padre
  6. GMGN
  7. UniversalX
  8. Photon
  9. Lute
  10. BullX
  11. Bloom
  12. Maestro
  13. unknown
```

## What this shows

- **Complete DEX Coverage**: Number of different trading platforms captured in the first hour
- **Early Buyer Detection**: Unique wallets that participated in the launch
- **MEV Activity**: Proportion of trades involving MEV
- **Query Performance**: Real-time data retrieval speed

## Project Structure

```
src/
├── types.ts              # TypeScript interfaces
├── providers/
│   └── mobula.ts        # Mobula API client
└── benchmark.ts         # Main analysis script
```

## License

MIT
