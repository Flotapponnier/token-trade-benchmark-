import * as dotenv from 'dotenv';
import { MobulaProvider } from './providers/mobula';
import { MoralisProvider } from './providers/moralis';
import { BitqueryProvider } from './providers/bitquery';
import { CodexProvider } from './providers/codex';
import { TokenConfig, ProviderResult } from './types';
import * as fs from 'fs';

dotenv.config();

const TOKENS: TokenConfig[] = [
  // Solana
  {
    address: 'BWJ7zJauzatao4FsBnGdVsqdBi3k5NbgSY62noZApump',
    name: 'Nana',
    launchTimestamp: Date.now() - 3600000, // 1 hour ago
    chain: 'solana'
  },
  {
    address: 'GJqCjtgEwqdFWVRsDs8JXKFoTeRVZeHs1RL4ccvrpump',
    name: 'Oilinu',
    launchTimestamp: Date.now() - 3600000,
    chain: 'solana'
  },
  // Ethereum
  {
    address: '0x279B46A5BCB1D1de37F5588e46c756B15b26A896',
    name: 'OIL',
    launchTimestamp: Date.now() - 3600000,
    chain: 'ethereum'
  },
  {
    address: '0x2b566950BA2298AcEf3c730CC0129b2f4fBd30a3',
    name: 'Kimchi',
    launchTimestamp: Date.now() - 3600000,
    chain: 'ethereum'
  },
  // BSC
  {
    address: '0xc20E45E49e0E79f0fC81E71F05fD2772d6587777',
    name: 'MILADY',
    launchTimestamp: Date.now() - 3600000,
    chain: 'bsc'
  },
  {
    address: '0xCae117ca6Bc8A341D2E7207F30E180f0e5618B9D',
    name: 'ARK',
    launchTimestamp: Date.now() - 3600000,
    chain: 'bsc'
  },
  // Base
  {
    address: '0x64384EBd580f8c48ED4972bbbE895aDE55671Aca',
    name: 'Broke',
    launchTimestamp: Date.now() - 3600000,
    chain: 'base'
  },
  {
    address: '0x9aA448c1Da3B8975e0619A5a96db4Fccc491e4d5',
    name: 'LANCER',
    launchTimestamp: Date.now() - 3600000,
    chain: 'base'
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
  console.log(`Duration: ${result.timeWindow.durationMinutes} minutes\n`);

  // Calculate unique transactions
  const mobulaUniqueTx = new Set(result.results.mobula.trades.map(t => t.hash)).size;
  const moralisUniqueTx = new Set(result.results.moralis.trades.map(t => t.hash)).size;
  const bitqueryUniqueTx = new Set(result.results.bitquery.trades.map(t => t.hash)).size;
  const codexUniqueTx = new Set(result.results.codex.trades.map(t => t.hash)).size;

  console.log('COMPARISON TABLE:');
  console.log(`┌${'─'.repeat(98)}┐`);
  console.log(`│ Provider  │ Total Trades │ Unique TX │ Unique Wallets │ DEXs │ Query Time   │`);
  console.log(`├${'─'.repeat(98)}┤`);
  console.log(`│ Mobula    │ ${String(result.results.mobula.totalTrades).padEnd(12)} │ ${String(mobulaUniqueTx).padEnd(9)} │ ${String(result.results.mobula.uniqueWallets).padEnd(14)} │ ${String(result.results.mobula.dexList.length).padEnd(4)} │ ${String(result.results.mobula.queryTime + 'ms').padEnd(12)} │`);
  console.log(`│ Moralis   │ ${String(result.results.moralis.totalTrades).padEnd(12)} │ ${String(moralisUniqueTx).padEnd(9)} │ ${String(result.results.moralis.uniqueWallets).padEnd(14)} │ ${String(result.results.moralis.dexList.length).padEnd(4)} │ ${String(result.results.moralis.queryTime + 'ms').padEnd(12)} │`);
  console.log(`│ Bitquery  │ ${String(result.results.bitquery.totalTrades).padEnd(12)} │ ${String(bitqueryUniqueTx).padEnd(9)} │ ${String(result.results.bitquery.uniqueWallets).padEnd(14)} │ ${String(result.results.bitquery.dexList.length).padEnd(4)} │ ${String(result.results.bitquery.queryTime + 'ms').padEnd(12)} │`);
  console.log(`│ Codex     │ ${String(result.results.codex.totalTrades).padEnd(12)} │ ${String(codexUniqueTx).padEnd(9)} │ ${String(result.results.codex.uniqueWallets).padEnd(14)} │ ${String(result.results.codex.dexList.length).padEnd(4)} │ ${String(result.results.codex.queryTime + 'ms').padEnd(12)} │`);
  console.log(`└${'─'.repeat(98)}┘\n`);

  console.log('DELTA ANALYSIS (Unique Transactions vs Mobula):');

  const moralisTxDelta = mobulaUniqueTx - moralisUniqueTx;
  const moralisTxPercentage = mobulaUniqueTx > 0
    ? ((moralisTxDelta / mobulaUniqueTx) * 100).toFixed(1)
    : '0.0';
  console.log(`  Moralis missing: ${moralisTxDelta} transactions (${moralisTxPercentage}%)`);

  const bitqueryTxDelta = mobulaUniqueTx - bitqueryUniqueTx;
  const bitqueryTxPercentage = mobulaUniqueTx > 0
    ? ((bitqueryTxDelta / mobulaUniqueTx) * 100).toFixed(1)
    : '0.0';
  console.log(`  Bitquery missing: ${bitqueryTxDelta} transactions (${bitqueryTxPercentage}%)`);

  const codexTxDelta = mobulaUniqueTx - codexUniqueTx;
  const codexTxPercentage = mobulaUniqueTx > 0
    ? ((codexTxDelta / mobulaUniqueTx) * 100).toFixed(1)
    : '0.0';
  console.log(`  Codex missing: ${codexTxDelta} transactions (${codexTxPercentage}%)\n`);

  console.log('NOTE: Providers may count multi-hop swaps differently:');
  console.log(`  - Mobula trade/tx ratio: ${(result.results.mobula.totalTrades / mobulaUniqueTx).toFixed(2)}`);
  console.log(`  - Moralis trade/tx ratio: ${moralisUniqueTx > 0 ? (result.results.moralis.totalTrades / moralisUniqueTx).toFixed(2) : 'N/A'}`);
  console.log(`  - Bitquery trade/tx ratio: ${bitqueryUniqueTx > 0 ? (result.results.bitquery.totalTrades / bitqueryUniqueTx).toFixed(2) : 'N/A'}`);
  console.log(`  - Codex trade/tx ratio: ${codexUniqueTx > 0 ? (result.results.codex.totalTrades / codexUniqueTx).toFixed(2) : 'N/A'}\n`);

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
