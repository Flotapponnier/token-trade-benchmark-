import * as dotenv from 'dotenv';
import { MobulaProvider } from './providers/mobula';
import { TokenConfig } from './types';
import * as fs from 'fs';

dotenv.config();

const TOKENS: TokenConfig[] = [
  {
    address: 'BWJ7zJauzatao4FsBnGdVsqdBi3k5NbgSY62noZApump',
    name: 'Test Token',
    launchTimestamp: Date.now() - (200 * 60 * 1000), // ~3h20min ago
    chain: 'solana'
  }
];

interface BenchmarkResult {
  token: TokenConfig;
  timeWindow: {
    start: number;
    end: number;
    durationMinutes: number;
  };
  results: {
    totalTrades: number;
    uniqueWallets: number;
    dexList: string[];
    queryTime: number;
    buyTrades: number;
    sellTrades: number;
    mevTrades: number;
  };
}

async function runBenchmark(token: TokenConfig): Promise<BenchmarkResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking: ${token.name}`);
  console.log(`Address: ${token.address}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTimestamp = token.launchTimestamp;
  const endTimestamp = token.launchTimestamp + 3600000; // +1 hour

  // Initialize Mobula provider
  const mobula = new MobulaProvider(process.env.MOBULA_API_KEY!);

  // Fetch data
  console.log('Fetching trades from Mobula...');
  const mobulaResult = await mobula.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Fetched ${mobulaResult.totalTrades} trades in ${mobulaResult.queryTime}ms`);

  // Calculate stats
  const buyTrades = mobulaResult.trades.filter(t => t.type === 'buy').length;
  const sellTrades = mobulaResult.trades.filter(t => t.type === 'sell').length;
  const mevTrades = mobulaResult.trades.filter(t => t.isMEV).length;

  const result: BenchmarkResult = {
    token,
    timeWindow: {
      start: startTimestamp,
      end: endTimestamp,
      durationMinutes: 60
    },
    results: {
      totalTrades: mobulaResult.totalTrades,
      uniqueWallets: mobulaResult.uniqueWallets,
      dexList: mobulaResult.dexList,
      queryTime: mobulaResult.queryTime,
      buyTrades,
      sellTrades,
      mevTrades
    }
  };

  return result;
}

function printReport(result: BenchmarkResult) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('MOBULA DATA COVERAGE REPORT');
  console.log(`${'='.repeat(60)}\n`);

  console.log(`Token: ${result.token.name}`);
  console.log(`Address: ${result.token.address}`);
  console.log(`Time Window: ${new Date(result.timeWindow.start).toISOString()} -> ${new Date(result.timeWindow.end).toISOString()}`);
  console.log(`Duration: ${result.timeWindow.durationMinutes} minutes (first hour after launch)\n`);

  console.log('TRADE STATISTICS:');
  console.log(`┌${'─'.repeat(58)}┐`);
  console.log(`│ Metric             │ Value                                │`);
  console.log(`├${'─'.repeat(58)}┤`);
  console.log(`│ Total Trades       │ ${String(result.results.totalTrades).padEnd(36)} │`);
  console.log(`│ Unique Wallets     │ ${String(result.results.uniqueWallets).padEnd(36)} │`);
  console.log(`│ Buy Trades         │ ${String(result.results.buyTrades).padEnd(36)} │`);
  console.log(`│ Sell Trades        │ ${String(result.results.sellTrades).padEnd(36)} │`);
  console.log(`│ MEV Trades         │ ${String(result.results.mevTrades).padEnd(36)} │`);
  console.log(`│ Query Time         │ ${String(result.results.queryTime + 'ms').padEnd(36)} │`);
  console.log(`│ DEX Count          │ ${String(result.results.dexList.length).padEnd(36)} │`);
  console.log(`└${'─'.repeat(58)}┘\n`);

  console.log(`DEX COVERAGE (${result.results.dexList.length} platforms):`);
  result.results.dexList.forEach((dex, i) => {
    console.log(`  ${i + 1}. ${dex}`);
  });

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
