import { ethers } from 'ethers';
import { Transaction, WalletActivity } from '../types';
import { NETWORK } from './constants';

const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);

/** Small delay to respect rate limits */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch wallet balance and transaction history from 0G RPC.
 * Uses the block explorer API first (single HTTP call), then
 * falls back to a gentle sequential block scan if the explorer is unavailable.
 */
export async function fetchWalletActivity(address: string): Promise<WalletActivity> {
  const checksumAddr = ethers.getAddress(address);

  // Get balance + tx count (2 RPC calls)
  const [balanceRaw, txCount] = await Promise.all([
    provider.getBalance(checksumAddr),
    provider.getTransactionCount(checksumAddr),
  ]);
  const balance = ethers.formatEther(balanceRaw);

  // Block explorer APIs are CORS-blocked from browser origins,
  // so we go straight to RPC-based block scan.
  let transactions: Transaction[] = [];
  transactions = await scanRecentBlocks(checksumAddr, 25);

  return {
    wallet: checksumAddr,
    balance,
    balanceRaw,
    transactions,
    fetchedAt: Date.now(),
    totalTxCount: txCount,
  };
}

/**
 * Fetch from the 0G block explorer API (Etherscan-compatible format).
 */
async function fetchFromExplorer(address: string): Promise<Transaction[]> {
  const url =
    `${NETWORK.blockExplorerApi}?module=account&action=txlist` +
    `&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=50`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error('Explorer API unavailable');

  const data = await resp.json();
  if (data.status !== '1' || !Array.isArray(data.result)) {
    throw new Error('No results from explorer');
  }

  return data.result.map((tx: any) => parseTxFromExplorer(tx, address));
}

/**
 * Alternate explorer endpoint pattern (some 0G explorers use /api/v2).
 */
async function fetchFromExplorerV2(address: string): Promise<Transaction[]> {
  const base = NETWORK.blockExplorer;
  const url = `${base}/api/v2/addresses/${address}/transactions?limit=50`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error('Explorer v2 API unavailable');

  const data = await resp.json();
  const items = data.items || data.result || data;
  if (!Array.isArray(items)) throw new Error('Unexpected v2 format');

  return items.map((tx: any) => {
    const value = BigInt(tx.value || tx.amount || '0');
    const hasInput = tx.input && tx.input !== '0x' && tx.input.length > 10;
    const noTo = !tx.to?.hash && !tx.to;

    let type: Transaction['type'] = 'transfer';
    if (noTo) type = 'contract_creation';
    else if (hasInput) type = 'contract_call';

    const toAddr = typeof tx.to === 'object' ? tx.to?.hash : tx.to || '';
    const fromAddr = typeof tx.from === 'object' ? tx.from?.hash : tx.from || '';

    return {
      hash: tx.hash || tx.transaction_hash,
      type,
      from: fromAddr,
      to: toAddr,
      amount: ethers.formatEther(value) + ' OG',
      amountRaw: value,
      timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now(),
      blockNumber: tx.block_number || tx.blockNumber || 0,
      gasUsed: tx.gas_used || tx.gasUsed || '0',
      gasPrice: tx.gas_price || tx.gasPrice || '0',
      isError: tx.status === 'error' || tx.isError === '1',
      methodId: hasInput ? (tx.input || tx.raw_input || '').slice(0, 10) : undefined,
    } as Transaction;
  });
}

function parseTxFromExplorer(tx: any, myAddress: string): Transaction {
  const value = BigInt(tx.value || '0');
  const isContractCreation = !tx.to || tx.to === '';
  const isContractCall = tx.input && tx.input !== '0x' && tx.input.length > 10;

  let type: Transaction['type'] = 'transfer';
  if (isContractCreation) type = 'contract_creation';
  else if (isContractCall) type = 'contract_call';

  return {
    hash: tx.hash,
    type,
    from: tx.from,
    to: tx.to || '',
    amount: ethers.formatEther(value) + ' OG',
    amountRaw: value,
    timestamp: parseInt(tx.timeStamp) * 1000,
    blockNumber: parseInt(tx.blockNumber),
    gasUsed: tx.gasUsed || '0',
    gasPrice: tx.gasPrice || '0',
    isError: tx.isError === '1',
    methodId: isContractCall ? tx.input.slice(0, 10) : undefined,
  };
}

/**
 * Gentle fallback: scan recent blocks SEQUENTIALLY, 3 at a time max,
 * with a delay between batches to stay under the 50 req/s rate limit.
 */
async function scanRecentBlocks(address: string, numBlocks: number): Promise<Transaction[]> {
  const latestBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, latestBlock - numBlocks);
  const transactions: Transaction[] = [];
  const addrLower = address.toLowerCase();

  // Process 3 blocks at a time with 200ms pause between batches
  const batchSize = 3;

  for (let i = latestBlock; i >= startBlock && transactions.length < 25; i -= batchSize) {
    const promises: Promise<ethers.Block | null>[] = [];
    for (let j = 0; j < batchSize && (i - j) >= startBlock; j++) {
      promises.push(provider.getBlock(i - j, true).catch(() => null));
    }

    const blocks = await Promise.all(promises);

    for (const block of blocks) {
      if (!block || !block.prefetchedTransactions) continue;

      for (const tx of block.prefetchedTransactions) {
        const fromMatch = tx.from?.toLowerCase() === addrLower;
        const toMatch = tx.to?.toLowerCase() === addrLower;

        if (fromMatch || toMatch) {
          const isContractCall = tx.data && tx.data !== '0x' && tx.data.length > 10;
          const isContractCreation = !tx.to;

          let type: Transaction['type'] = 'transfer';
          if (isContractCreation) type = 'contract_creation';
          else if (isContractCall) type = 'contract_call';

          transactions.push({
            hash: tx.hash,
            type,
            from: tx.from,
            to: tx.to || '',
            amount: ethers.formatEther(tx.value) + ' OG',
            amountRaw: tx.value,
            timestamp: (block.timestamp || 0) * 1000,
            blockNumber: block.number,
            gasUsed: '0',
            gasPrice: tx.gasPrice?.toString() || '0',
            isError: false,
            methodId: isContractCall ? tx.data.slice(0, 10) : undefined,
          });

          if (transactions.length >= 25) break;
        }
      }
    }

    // Pause between batches to avoid rate limiting
    await sleep(250);
  }

  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Convert wallet activity to a compact JSON string for the AI prompt.
 */
export function activityToPromptJson(activity: WalletActivity): string {
  const compact = {
    wallet: activity.wallet,
    balance: activity.balance + ' OG',
    totalTransactions: activity.totalTxCount,
    recentTransactions: activity.transactions.slice(0, 30).map((tx) => ({
      hash: tx.hash.slice(0, 10) + '...',
      type: tx.type,
      direction: tx.from.toLowerCase() === activity.wallet.toLowerCase() ? 'sent' : 'received',
      amount: tx.amount,
      to: tx.to ? tx.to.slice(0, 10) + '...' : 'contract creation',
      from: tx.from.slice(0, 10) + '...',
      date: new Date(tx.timestamp).toISOString().split('T')[0],
      isError: tx.isError,
      ...(tx.methodId ? { methodId: tx.methodId } : {}),
    })),
  };

  return JSON.stringify(compact, null, 2);
}