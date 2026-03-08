import * as dotenv from 'dotenv';
import { MobulaProvider } from './providers/mobula';
import { FlipsideProvider } from './providers/flipside';
import { DuneProvider } from './providers/dune';
import { TokenConfig, BenchmarkResult } from './types';
import * as fs from 'fs';

dotenv.config();

const TOKENS: TokenConfig[] = [
  {
    address: 'YOUR_TOKEN_ADDRESS_HERE',
    name: 'Example Token',
    launchTimestamp: 1706745600000, // Replace with actual launch timestamp
    chain: 'solana'
  }
  // Add more tokens here
];

async function runBenchmark(token: TokenConfig): Promise<BenchmarkResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking: ${token.name} (${token.address})`);
  console.log(`${'='.repeat(60)}\n`);

  const startTimestamp = token.launchTimestamp;
  const endTimestamp = token.launchTimestamp + 3600000; // +1 hour

  // Initialize providers
  const mobula = new MobulaProvider(process.env.MOBULA_API_KEY!);
  const flipside = new FlipsideProvider(process.env.FLIPSIDE_API_KEY!);
  const dune = new DuneProvider(process.env.DUNE_API_KEY!);

  // Fetch data from all providers
  console.log('Fetching from Mobula...');
  const mobulaResult = await mobula.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Mobula: ${mobulaResult.totalTrades} trades in ${mobulaResult.queryTime}ms`);

  console.log('\nFetching from Flipside...');
  const flipsideResult = await flipside.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Flipside: ${flipsideResult.totalTrades} trades in ${flipsideResult.queryTime}ms`);

  console.log('\nFetching from Dune...');
  const duneResult = await dune.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Dune: ${duneResult.totalTrades} trades in ${duneResult.queryTime}ms`);

  // Calculate deltas
  const mobulaWallets = new Set(mobulaResult.trades.map(t => t.wallet));
  const flipsideWallets = new Set(flipsideResult.trades.map(t => t.wallet));
  const duneWallets = new Set(duneResult.trades.map(t => t.wallet));

  const missingWalletsFlipside = [...mobulaWallets].filter(w => !flipsideWallets.has(w));
  const missingWalletsDune = [...mobulaWallets].filter(w => !duneWallets.has(w));

  const mobulaDexs = new Set(mobulaResult.dexList);
  const flipsideDexs = new Set(flipsideResult.dexList);
  const duneDexs = new Set(duneResult.dexList);

  const missingDEXsFlipside = [...mobulaDexs].filter(d => !flipsideDexs.has(d));
  const missingDEXsDune = [...mobulaDexs].filter(d => !duneDexs.has(d));

  const result: BenchmarkResult = {
    token,
    timeWindow: {
      start: startTimestamp,
      end: endTimestamp,
      durationMinutes: 60
    },
    results: {
      mobula: mobulaResult,
      flipside: flipsideResult,
      dune: duneResult
    },
    comparison: {
      tradeDelta: {
        mobulaVsFlipside: mobulaResult.totalTrades - flipsideResult.totalTrades,
        mobulaVsDune: mobulaResult.totalTrades - duneResult.totalTrades
      },
      walletDelta: {
        mobulaVsFlipside: missingWalletsFlipside.length,
        mobulaVsDune: missingWalletsDune.length
      },
      missingDEXs: {
        flipside: missingDEXsFlipside,
        dune: missingDEXsDune
      },
      missingWallets: {
        flipside: missingWalletsFlipside,
        dune: missingWalletsDune
      }
    }
  };

  return result;
}

function printReport(result: BenchmarkResult) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('BENCHMARK RESULTS');
  console.log(`${'='.repeat(60)}\n`);

  console.log(`Token: ${result.token.name}`);
  console.log(`Time Window: ${new Date(result.timeWindow.start).toISOString()} -> ${new Date(result.timeWindow.end).toISOString()}`);
  console.log(`Duration: ${result.timeWindow.durationMinutes} minutes\n`);

  console.log('TRADE COUNT COMPARISON:');
  console.log(`┌${'─'.repeat(58)}┐`);
  console.log(`│ Provider  │ Total Trades │ Unique Wallets │ Query Time │`);
  console.log(`├${'─'.repeat(58)}┤`);
  console.log(`│ Mobula    │ ${String(result.results.mobula.totalTrades).padEnd(12)} │ ${String(result.results.mobula.uniqueWallets).padEnd(14)} │ ${String(result.results.mobula.queryTime + 'ms').padEnd(10)} │`);
  console.log(`│ Flipside  │ ${String(result.results.flipside.totalTrades).padEnd(12)} │ ${String(result.results.flipside.uniqueWallets).padEnd(14)} │ ${String(result.results.flipside.queryTime + 'ms').padEnd(10)} │`);
  console.log(`│ Dune      │ ${String(result.results.dune.totalTrades).padEnd(12)} │ ${String(result.results.dune.uniqueWallets).padEnd(14)} │ ${String(result.results.dune.queryTime + 'ms').padEnd(10)} │`);
  console.log(`└${'─'.repeat(58)}┘\n`);

  console.log('DELTA ANALYSIS:');
  console.log(`Mobula vs Flipside:`);
  console.log(`  - Trade delta: +${result.comparison.tradeDelta.mobulaVsFlipside} trades (${((result.comparison.tradeDelta.mobulaVsFlipside / result.results.flipside.totalTrades) * 100).toFixed(1)}% more)`);
  console.log(`  - Wallet delta: +${result.comparison.walletDelta.mobulaVsFlipside} unique wallets\n`);

  console.log(`Mobula vs Dune:`);
  console.log(`  - Trade delta: +${result.comparison.tradeDelta.mobulaVsDune} trades (${((result.comparison.tradeDelta.mobulaVsDune / result.results.dune.totalTrades) * 100).toFixed(1)}% more)`);
  console.log(`  - Wallet delta: +${result.comparison.walletDelta.mobulaVsDune} unique wallets\n`);

  console.log('DEX COVERAGE:');
  console.log(`Mobula DEXs (${result.results.mobula.dexList.length}): ${result.results.mobula.dexList.join(', ')}`);
  console.log(`Flipside DEXs (${result.results.flipside.dexList.length}): ${result.results.flipside.dexList.join(', ')}`);
  console.log(`Dune DEXs (${result.results.dune.dexList.length}): ${result.results.dune.dexList.join(', ')}\n`);

  if (result.comparison.missingDEXs.flipside.length > 0) {
    console.log(`Missing from Flipside: ${result.comparison.missingDEXs.flipside.join(', ')}`);
  }
  if (result.comparison.missingDEXs.dune.length > 0) {
    console.log(`Missing from Dune: ${result.comparison.missingDEXs.dune.join(', ')}`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

async function main() {
  if (!process.env.MOBULA_API_KEY) {
    console.error('Error: MOBULA_API_KEY not found in .env file');
    process.exit(1);
  }

  const results: BenchmarkResult[] = [];

  for (const token of TOKENS) {
    const result = await runBenchmark(token);
    results.push(result);
    printReport(result);
  }

  // Save results to file
  if (!fs.existsSync('results')) {
    fs.mkdirSync('results');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `results/benchmark-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${filename}`);
}

main().catch(console.error);
