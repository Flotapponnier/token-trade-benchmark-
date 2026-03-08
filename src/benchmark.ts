import * as dotenv from 'dotenv';
import { MobulaProvider } from './providers/mobula';
import { MoralisProvider } from './providers/moralis';
import { BitqueryProvider } from './providers/bitquery';
import { CodexProvider } from './providers/codex';
import { TokenConfig, ProviderResult } from './types';
import * as fs from 'fs';

dotenv.config();

const TOKENS: TokenConfig[] = [
  {
    address: 'BWJ7zJauzatao4FsBnGdVsqdBi3k5NbgSY62noZApump',
    name: 'Test Token',
    launchTimestamp: 1772982197000, // Fixed timestamp: 2026-03-08T16:16:37Z
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
    mobula: ProviderResult;
    moralis: ProviderResult;
    bitquery: ProviderResult;
    codex: ProviderResult;
  };
}

async function runBenchmark(token: TokenConfig): Promise<BenchmarkResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking: ${token.name}`);
  console.log(`Address: ${token.address}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTimestamp = token.launchTimestamp;
  const endTimestamp = token.launchTimestamp + 3600000; // +1 hour

  // Initialize providers
  const mobula = new MobulaProvider(process.env.MOBULA_API_KEY!);
  const moralis = new MoralisProvider(process.env.MORALIS_API_KEY!);
  const bitquery = new BitqueryProvider(process.env.BITQUERY_API_KEY!);
  const codex = new CodexProvider(process.env.CODEX_API_KEY!);

  // Fetch data from all providers
  console.log('Fetching trades from Mobula...');
  const mobulaResult = await mobula.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Mobula: ${mobulaResult.totalTrades} trades in ${mobulaResult.queryTime}ms`);

  console.log('\nFetching trades from Moralis...');
  const moralisResult = await moralis.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Moralis: ${moralisResult.totalTrades} trades in ${moralisResult.queryTime}ms`);

  console.log('\nFetching trades from Bitquery...');
  const bitqueryResult = await bitquery.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Bitquery: ${bitqueryResult.totalTrades} trades in ${bitqueryResult.queryTime}ms`);

  console.log('\nFetching trades from Codex...');
  const codexResult = await codex.fetchTrades(token, startTimestamp, endTimestamp);
  console.log(`✓ Codex: ${codexResult.totalTrades} trades in ${codexResult.queryTime}ms`);

  const result: BenchmarkResult = {
    token,
    timeWindow: {
      start: startTimestamp,
      end: endTimestamp,
      durationMinutes: 60
    },
    results: {
      mobula: mobulaResult,
      moralis: moralisResult,
      bitquery: bitqueryResult,
      codex: codexResult
    }
  };

  return result;
}

function printReport(result: BenchmarkResult) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('BENCHMARK RESULTS: MOBULA VS MORALIS VS BITQUERY VS CODEX');
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Token: ${result.token.name}`);
  console.log(`Address: ${result.token.address}`);
  console.log(`Time Window: ${new Date(result.timeWindow.start).toISOString()} -> ${new Date(result.timeWindow.end).toISOString()}`);
  console.log(`Duration: ${result.timeWindow.durationMinutes} minutes (first hour after launch)\n`);

  console.log('COMPARISON TABLE:');
  console.log(`┌${'─'.repeat(78)}┐`);
  console.log(`│ Provider  │ Total Trades │ Unique Wallets │ DEXs │ Query Time   │`);
  console.log(`├${'─'.repeat(78)}┤`);
  console.log(`│ Mobula    │ ${String(result.results.mobula.totalTrades).padEnd(12)} │ ${String(result.results.mobula.uniqueWallets).padEnd(14)} │ ${String(result.results.mobula.dexList.length).padEnd(4)} │ ${String(result.results.mobula.queryTime + 'ms').padEnd(12)} │`);
  console.log(`│ Moralis   │ ${String(result.results.moralis.totalTrades).padEnd(12)} │ ${String(result.results.moralis.uniqueWallets).padEnd(14)} │ ${String(result.results.moralis.dexList.length).padEnd(4)} │ ${String(result.results.moralis.queryTime + 'ms').padEnd(12)} │`);
  console.log(`│ Bitquery  │ ${String(result.results.bitquery.totalTrades).padEnd(12)} │ ${String(result.results.bitquery.uniqueWallets).padEnd(14)} │ ${String(result.results.bitquery.dexList.length).padEnd(4)} │ ${String(result.results.bitquery.queryTime + 'ms').padEnd(12)} │`);
  console.log(`│ Codex     │ ${String(result.results.codex.totalTrades).padEnd(12)} │ ${String(result.results.codex.uniqueWallets).padEnd(14)} │ ${String(result.results.codex.dexList.length).padEnd(4)} │ ${String(result.results.codex.queryTime + 'ms').padEnd(12)} │`);
  console.log(`└${'─'.repeat(78)}┘\n`);

  console.log('DELTA ANALYSIS (vs Mobula):');

  const moralisDelta = result.results.mobula.totalTrades - result.results.moralis.totalTrades;
  const moralisPercentage = result.results.mobula.totalTrades > 0
    ? ((moralisDelta / result.results.mobula.totalTrades) * 100).toFixed(1)
    : '0.0';
  console.log(`  Moralis missing: ${moralisDelta} trades (${moralisPercentage}% of total)`);

  const bitqueryDelta = result.results.mobula.totalTrades - result.results.bitquery.totalTrades;
  const bitqueryPercentage = result.results.mobula.totalTrades > 0
    ? ((bitqueryDelta / result.results.mobula.totalTrades) * 100).toFixed(1)
    : '0.0';
  console.log(`  Bitquery missing: ${bitqueryDelta} trades (${bitqueryPercentage}% of total)`);

  const codexDelta = result.results.mobula.totalTrades - result.results.codex.totalTrades;
  const codexPercentage = result.results.mobula.totalTrades > 0
    ? ((codexDelta / result.results.mobula.totalTrades) * 100).toFixed(1)
    : '0.0';
  console.log(`  Codex missing: ${codexDelta} trades (${codexPercentage}% of total)\n`);

  console.log('PLATFORM COVERAGE (Front-ends/Wallets):');
  console.log(`  Mobula: ${result.results.mobula.platformList?.join(', ') || 'N/A'}`);
  console.log(`  Moralis: ${result.results.moralis.dexList.length > 0 ? result.results.moralis.dexList.join(', ') : 'none'}`);
  console.log(`  Bitquery: ${result.results.bitquery.dexList.length > 0 ? result.results.bitquery.dexList.join(', ') : 'none'}`);
  console.log(`  Codex: N/A (no DEX/platform field)`);

  console.log(`\n${'='.repeat(80)}\n`);
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
