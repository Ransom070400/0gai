import { ethers } from 'ethers';
import { buildPrompt } from './constants';

/**
 * 0G Compute Network integration — matched to official starter kit & docs.
 *
 * SDK: @0glabs/0g-serving-broker@latest
 *
 * NOTE: The SDK's default serving contract may be stale on Galileo testnet.
 * If the default address has no bytecode, the user can provide a custom
 * contract address via setCustomContractAddress().
 *
 * Official refs:
 *   https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference
 *   https://github.com/0gfoundation/0g-compute-ts-starter-kit
 *
 * Flow:
 *   1. broker.ledger.addLedger(3)            — create account (min 3 OG)
 *      OR broker.ledger.depositFund(amount)   — deposit to existing account
 *   2. broker.inference.acknowledgeProviderSigner(addr)
 *   3. broker.ledger.transferFund(addr, "inference", parseEther(amount))
 */

// ─── Official Testnet Providers (starter kit + docs, Feb 2026) ──────
export const TESTNET_PROVIDERS = [
  {
    address: '0xa48f01287233509FD694a22Bf840225062E67836',
    model: 'qwen-2.5-7b-instruct',
    label: 'Qwen 2.5 7B Instruct',
    type: 'chatbot',
    inputPrice: '0.00001',
  },
  {
    address: '0x8e60d466FD16798Bec4868aa4CE38586D5590049',
    model: 'gpt-oss-20b',
    label: 'GPT-OSS 20B',
    type: 'chatbot',
    inputPrice: '0.00001',
  },
  {
    address: '0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08',
    model: 'google/gemma-3-27b-it',
    label: 'Gemma 3 27B IT',
    type: 'chatbot',
    inputPrice: '0.00001',
  },
] as const;

// ─── State ─────────────────────────────────────────────────────────
let brokerInstance: any = null;
let brokerError: string | null = null;
const acknowledgedProviders = new Set<string>();
const fundedProviders = new Set<string>();

// ─── Broker Init ───────────────────────────────────────────────────

// Custom contract address (can be set by user)
let customContractAddress: string | null = null;

export function setCustomContractAddress(addr: string | null) {
  customContractAddress = addr;
  // Reset broker so it re-initializes with new address
  brokerInstance = null;
  brokerError = null;
}

export function getCustomContractAddress(): string | null {
  return customContractAddress;
}

async function getBroker(signer: ethers.Signer): Promise<any> {
  if (brokerInstance) return brokerInstance;
  if (brokerError) throw new Error(brokerError);

  try {
    const sdk = await import('@0glabs/0g-serving-broker');
    const exports = Object.keys(sdk);
    console.log('[0G Compute] SDK exports:', exports);

    const createBroker =
      (sdk as any).createZGComputeNetworkBroker ||
      (sdk as any).createZGServingNetworkBroker ||
      (sdk as any).default?.createZGComputeNetworkBroker ||
      (sdk as any).default?.createZGServingNetworkBroker;

    if (!createBroker) {
      brokerError = `SDK loaded but no broker constructor. Exports: ${exports.join(', ')}`;
      throw new Error(brokerError);
    }

    // Pass custom contract address if provided
    const args: any[] = [signer];
    if (customContractAddress) {
      args.push(customContractAddress);
      console.log(`[0G Compute] Using CUSTOM contract address: ${customContractAddress}`);
    } else {
      console.log('[0G Compute] Using SDK default contract address');
    }

    console.log('[0G Compute] Creating broker with signer...');
    brokerInstance = await createBroker(...args);

    if (brokerInstance) {
      const ledgerMethods = brokerInstance.ledger
        ? Object.keys(brokerInstance.ledger).filter((k) => typeof brokerInstance.ledger[k] === 'function')
        : [];
      const inferenceMethods = brokerInstance.inference
        ? Object.keys(brokerInstance.inference).filter((k) => typeof brokerInstance.inference[k] === 'function')
        : [];
      console.log('[0G Compute] Ledger methods:', ledgerMethods);
      console.log('[0G Compute] Inference methods:', inferenceMethods);

      // Log contract address for debugging
      try {
        // Walk the broker object to find contract references
        const findContract = (obj: any, path: string, depth: number): void => {
          if (depth > 3 || !obj) return;
          for (const key of Object.keys(obj)) {
            try {
              const val = obj[key];
              if (key === 'contract' || key === '_contract') {
                const addr = val?.target || val?.address || val?.getAddress?.();
                if (addr) console.log(`[0G Compute] ${path}.${key} => ${addr}`);
              }
              if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                findContract(val, `${path}.${key}`, depth + 1);
              }
            } catch { /* skip */ }
          }
        };
        findContract(brokerInstance, 'broker', 0);
      } catch { /* non-critical */ }
    }

    return brokerInstance;
  } catch (err: any) {
    if (!brokerError) brokerError = err.message;
    console.error('[0G Compute] Broker init failed:', err);
    throw err;
  }
}

// ─── Enhanced Error Extraction ──────────────────────────────────────

function extractRevertReason(err: any): string {
  const msg = err?.message || String(err);

  // ethers v6: check err.info.error
  if (err?.info?.error?.message) {
    return err.info.error.message;
  }

  // Check for revert data
  const revertData = err?.data || err?.error?.data || err?.info?.error?.data;
  if (revertData && typeof revertData === 'string' && revertData.length > 2) {
    try {
      if (revertData.startsWith('0x08c379a0')) {
        const reason = ethers.AbiCoder.defaultAbiCoder().decode(
          ['string'],
          '0x' + revertData.slice(10)
        );
        return `Revert: "${reason[0]}"`;
      }
      return `Revert data: ${revertData.slice(0, 66)}`;
    } catch { /* fall through */ }
  }

  // Check for receipt (tx mined but reverted)
  if (err?.receipt?.hash) {
    return `TX reverted on-chain: ${err.receipt.hash}`;
  }

  // ethers v6 action/reason
  if (err?.action) {
    return `${err.action}: ${err.reason || err.shortMessage || msg.slice(0, 200)}`;
  }

  return msg.slice(0, 300);
}

// ─── Setup Status ──────────────────────────────────────────────────

export interface SetupStatus {
  hasLedger: boolean;
  balance: string;
  locked: string;
  available: string;
  walletBalance: string;
  brokerLoaded: boolean;
  brokerError: string | null;
  sdkExports: string[];
  serviceCount: number;
  ledgerMethods: string[];
  contractAddress: string;
}

export async function getSetupStatus(signer: ethers.Signer): Promise<SetupStatus> {
  const base: SetupStatus = {
    hasLedger: false, balance: '0', locked: '0', available: '0',
    walletBalance: '0', brokerLoaded: false, brokerError: null,
    sdkExports: [], serviceCount: 0, ledgerMethods: [], contractAddress: 'unknown',
  };

  try {
    const addr = await signer.getAddress();
    const prov = signer.provider;
    if (prov) {
      const bal = await prov.getBalance(addr);
      base.walletBalance = ethers.formatEther(bal);
    }
  } catch { /* non-critical */ }

  try {
    const sdk = await import('@0glabs/0g-serving-broker');
    base.sdkExports = Object.keys(sdk);
  } catch (err: any) {
    base.brokerError = `SDK import failed: ${err.message}`;
    return base;
  }

  let broker: any;
  try {
    broker = await getBroker(signer);
    base.brokerLoaded = true;
  } catch (err: any) {
    base.brokerError = `Broker creation failed: ${err.message}`;
    return base;
  }

  // Services
  try {
    const services = await broker.inference.listService();
    base.serviceCount = services?.length || 0;
    console.log('[0G Compute] Services found:', base.serviceCount);
    if (services?.length) {
      services.forEach((s: any, i: number) => {
        console.log(`[0G Compute] Service ${i}:`, JSON.stringify({
          provider: s.provider, model: s.model, serviceType: s.serviceType,
        }));
      });
    }
  } catch (err: any) {
    console.warn('[0G Compute] listService failed:', err.message);
  }

  try {
    base.ledgerMethods = Object.keys(broker.ledger).filter(
      (k) => typeof broker.ledger[k] === 'function'
    );
  } catch { /* non-critical */ }

  // Ledger info
  try {
    const ledger = await broker.ledger.getLedger();
    console.log('[0G Compute] getLedger raw:', JSON.stringify(ledger, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v));
    if (ledger) {
      base.hasLedger = true;
      const total = BigInt(ledger.totalBalance || ledger.balance || 0);
      const avail = ledger.availableBalance !== undefined ? BigInt(ledger.availableBalance) : undefined;
      const locked = (ledger.locked || ledger.lockedBalance) ? BigInt(ledger.locked || ledger.lockedBalance || 0) : undefined;
      base.balance = ethers.formatEther(total);
      if (avail !== undefined) {
        base.available = ethers.formatEther(avail);
        base.locked = ethers.formatEther(total > avail ? total - avail : 0n);
      } else if (locked !== undefined) {
        base.locked = ethers.formatEther(locked);
        base.available = ethers.formatEther(total > locked ? total - locked : 0n);
      }
    }
  } catch (err: any) {
    console.log('[0G Compute] getLedger error (normal if no account):', err.message);
  }

  return base;
}

// ─── Deposit Funds (Step 1) ────────────────────────────────────────

export async function createLedger(signer: ethers.Signer, amountOG: number = 3): Promise<string> {
  const broker = await getBroker(signer);

  const ledgerMethods = Object.keys(broker.ledger).filter(
    (k) => typeof broker.ledger[k] === 'function'
  );
  console.log('[0G Compute] ALL ledger methods:', ledgerMethods);

  // === CONTRACT EXISTENCE CHECK ===
  try {
    // Try to find the contract address the SDK is using
    let contractAddr: string | null = null;
    const findAddr = (obj: any, depth: number): string | null => {
      if (depth > 4 || !obj) return null;
      for (const key of Object.keys(obj)) {
        try {
          const val = obj[key];
          if ((key === 'contract' || key === '_contract') && val) {
            return val.target || val.address || null;
          }
          if (typeof val === 'object' && val !== null) {
            const found = findAddr(val, depth + 1);
            if (found) return found;
          }
        } catch { /* skip */ }
      }
      return null;
    };
    contractAddr = findAddr(broker, 0);

    if (contractAddr && signer.provider) {
      const code = await signer.provider.getCode(contractAddr);
      if (!code || code === '0x' || code === '0x0') {
        throw new Error(
          `**No contract at ${contractAddr}!**\n\n` +
          `The SDK's default serving contract doesn't exist on this chain.\n` +
          `The official marketplace (compute-marketplace.0g.ai) also shows 0 models — this is a **testnet infrastructure issue**.\n\n` +
          `**Options:**\n` +
          `• Ask in [0G Discord](https://discord.com/invite/0glabs) #support-tickets for the current serving contract address\n` +
          `• If you get an address, enter it in the "Custom Contract Address" field below and retry\n` +
          `• Wait for the 0G team to update the SDK/testnet`
        );
      }
      console.log(`[0G Compute] ✓ Contract verified at ${contractAddr}`);
    } else {
      console.log('[0G Compute] Could not find contract address in broker object');
    }
  } catch (err: any) {
    if (err.message.includes('No contract at')) throw err;
    console.warn('[0G Compute] Contract check:', err.message);
  }

  // === DIAGNOSTICS: listService ===
  try {
    const services = await broker.inference.listService();
    console.log('[0G Compute] listService:', services?.length || 0, 'services');
  } catch (err: any) {
    console.warn('[0G Compute] listService failed:', err.message);
  }

  // === CHECK EXISTING LEDGER ===
  let hasExisting = false;
  try {
    const existing = await broker.ledger.getLedger();
    console.log('[0G Compute] getLedger:', JSON.stringify(existing, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v));
    if (existing) hasExisting = true;
  } catch (err: any) {
    console.log('[0G Compute] getLedger error:', err.message);
  }

  // === BALANCE CHECK ===
  let balanceOG = 0;
  try {
    const address = await signer.getAddress();
    if (signer.provider) {
      const balance = await signer.provider.getBalance(address);
      balanceOG = parseFloat(ethers.formatEther(balance));
    }
  } catch { /* non-critical */ }

  if (balanceOG > 0 && balanceOG < amountOG + 0.01) {
    throw new Error(
      `Insufficient balance: **${balanceOG.toFixed(4)} OG** (need ${amountOG}+ OG). Get tokens from https://faucet.0g.ai`
    );
  }

  const hasDeposit = typeof broker.ledger.depositFund === 'function';
  const hasAddLedger = typeof broker.ledger.addLedger === 'function';

  console.log(`[0G Compute] hasExisting=${hasExisting}, hasDeposit=${hasDeposit}, hasAddLedger=${hasAddLedger}, balance=${balanceOG}`);

  // === BUILD ATTEMPTS ===
  const attempts: { fn: () => Promise<any>; label: string }[] = [];

  if (hasExisting) {
    if (hasDeposit) attempts.push({ fn: () => broker.ledger.depositFund(amountOG), label: `depositFund(${amountOG})` });
  } else {
    if (hasAddLedger) attempts.push({ fn: () => broker.ledger.addLedger(amountOG), label: `addLedger(${amountOG})` });
    if (hasDeposit) attempts.push({ fn: () => broker.ledger.depositFund(amountOG), label: `depositFund(${amountOG})` });
  }

  if (!attempts.length) {
    if (hasAddLedger) attempts.push({ fn: () => broker.ledger.addLedger(amountOG), label: `addLedger(${amountOG})` });
    if (hasDeposit) attempts.push({ fn: () => broker.ledger.depositFund(amountOG), label: `depositFund(${amountOG})` });
  }

  if (!attempts.length) {
    throw new Error(`No deposit methods found! Available: ${ledgerMethods.join(', ')}`);
  }

  // === TRY EACH METHOD ===
  const errors: string[] = [];
  let lastTxParams: any = null; // Capture raw tx params for diagnostics

  for (const { fn, label } of attempts) {
    try {
      console.log(`[0G Compute] Trying: broker.ledger.${label}`);
      await fn();
      return `Deposited ${amountOG} OG via ${label}`;
    } catch (err: any) {
      const reason = extractRevertReason(err);
      console.warn(`[0G Compute] ${label} failed:`, reason);
      try { console.warn(`[0G Compute] Full error:`, JSON.stringify(err, Object.getOwnPropertyNames(err))); } catch { console.warn('[0G Compute] Raw error:', err); }
      errors.push(`${label}: ${reason}`);

      if (err.message?.includes('user rejected') || err.message?.includes('denied')) {
        throw new Error('Transaction rejected in wallet.');
      }
      if (err.message?.includes('insufficient funds for gas')) {
        throw new Error(`Insufficient gas. Balance: ${balanceOG.toFixed(4)} OG`);
      }

      // addLedger failed because account exists → try depositFund
      if ((reason.includes('already') || reason.includes('exist')) && hasDeposit && label.startsWith('addLedger')) {
        try {
          await broker.ledger.depositFund(amountOG);
          return `Deposited ${amountOG} OG (account already existed)`;
        } catch (depErr: any) {
          errors.push(`depositFund fallback: ${extractRevertReason(depErr)}`);
        }
      }
    }
  }

  // === DEEP DIAGNOSTIC: Retry with intercepting signer to get raw revert ===
  let rawDiag = '';
  try {
    console.log('[0G Compute] === DEEP DIAGNOSTICS ===');

    // 1. Try to find contract address by walking broker internals
    let contractAddr: string | null = null;
    const walk = (obj: any, d: number): void => {
      if (d > 5 || !obj) return;
      for (const k of Object.keys(obj)) {
        try {
          const v = obj[k];
          if (!v) continue;
          // ethers v6 Contract has .target
          if (v.target && typeof v.target === 'string' && v.target.startsWith('0x')) {
            contractAddr = v.target;
            console.log(`[0G Compute] Found contract at broker path .${k}: ${contractAddr}`);
          }
          if (v.address && typeof v.address === 'string' && v.address.startsWith('0x')) {
            contractAddr = v.address;
            console.log(`[0G Compute] Found contract at broker path .${k}: ${contractAddr}`);
          }
          if (typeof v === 'object' && !Array.isArray(v)) walk(v, d + 1);
        } catch { /* skip */ }
      }
    };
    walk(broker.ledger, 0);
    if (!contractAddr) walk(broker, 0);

    if (contractAddr) {
      console.log(`[0G Compute] Target contract: ${contractAddr}`);
      rawDiag += `Contract: ${contractAddr}\n`;

      // 2. Verify contract exists
      const code = await signer.provider!.getCode(contractAddr);
      console.log(`[0G Compute] Contract code length: ${code.length}`);
      rawDiag += `Code: ${code.length > 2 ? 'YES' : 'NO'} (${code.length} chars)\n`;

      if (code.length <= 2) {
        rawDiag += '⚠️ NO CONTRACT AT THIS ADDRESS! SDK default address is stale.';
      } else {
        // 3. Try raw eth_call for both function signatures to get revert reason
        const userAddr = await signer.getAddress();
        const amountWei = ethers.parseEther(amountOG.toString());

        // Common function selectors for 0G serving contracts:
        // addLedger(uint256) = first 4 bytes of keccak256("addLedger(uint256)")  
        // depositFund(uint256)
        // addAccount(uint256)
        const sigs = [
          { name: 'depositFund(uint256)', sel: ethers.id('depositFund(uint256)').slice(0, 10) },
          { name: 'addLedger(uint256)', sel: ethers.id('addLedger(uint256)').slice(0, 10) },
          { name: 'addAccount(uint256)', sel: ethers.id('addAccount(uint256)').slice(0, 10) },
          { name: 'depositFund()', sel: ethers.id('depositFund()').slice(0, 10) },
        ];

        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amountWei]);

        for (const sig of sigs) {
          try {
            const callData = sig.name.includes('()') ? sig.sel : sig.sel + encoded.slice(2);
            console.log(`[0G Compute] eth_call ${sig.name} → ${callData.slice(0, 20)}...`);

            const result = await signer.provider!.call({
              to: contractAddr,
              from: userAddr,
              data: callData,
              value: amountWei, // payable — send OG as value
            });
            console.log(`[0G Compute] ${sig.name} static call OK:`, result);
            rawDiag += `${sig.name}: OK (${result.slice(0, 20)})\n`;
          } catch (callErr: any) {
            const revertMsg = callErr?.revert?.args?.[0]  // ethers v6 decoded revert
              || callErr?.reason
              || callErr?.data
              || callErr?.message?.slice(0, 200)
              || String(callErr);
            console.warn(`[0G Compute] ${sig.name} reverted:`, revertMsg);
            rawDiag += `${sig.name}: REVERT → ${typeof revertMsg === 'string' ? revertMsg.slice(0, 150) : JSON.stringify(revertMsg)}\n`;
          }
        }

        // 4. Also try without value (in case the contract takes amount as param, not msg.value)
        try {
          const callData = ethers.id('depositFund(uint256)').slice(0, 10) + encoded.slice(2);
          const result = await signer.provider!.call({
            to: contractAddr,
            from: userAddr,
            data: callData,
            value: 0n, // no value
          });
          console.log(`[0G Compute] depositFund(uint256) without value OK:`, result);
          rawDiag += `depositFund(noValue): OK\n`;
        } catch (callErr: any) {
          const reason = callErr?.reason || callErr?.revert?.args?.[0] || callErr?.message?.slice(0, 150);
          rawDiag += `depositFund(noValue): ${reason}\n`;
        }
      }
    } else {
      rawDiag += 'Could not find contract address in broker object.\n';
      console.warn('[0G Compute] Could not locate contract address');
    }
  } catch (diagErr: any) {
    rawDiag += `Diagnostic error: ${diagErr.message}`;
    console.warn('[0G Compute] Diagnostic failed:', diagErr);
  }

  throw new Error(
    `All deposit methods failed:\n\n${errors.map((e) => `• ${e}`).join('\n')}\n\n` +
    (rawDiag ? `**Raw diagnostics:**\n\`\`\`\n${rawDiag}\`\`\`\n\n` : '') +
    `**Wallet: ${balanceOG.toFixed(4)} OG** | Methods: ${ledgerMethods.join(', ')}\n\n` +
    `**Next steps:**\n` +
    `1. Run \`rm -rf node_modules package-lock.json && npm install\`\n` +
    `2. Confirm MetaMask chain = **16602** (Galileo)\n` +
    `3. Try official UI: https://compute-marketplace.0g.ai/inference\n` +
    `4. Check F12 console for "[0G Compute]" diagnostics`
  );
}

// ─── Acknowledge Provider (Step 2) ─────────────────────────────────

export async function acknowledgeProvider(signer: ethers.Signer, providerAddress: string): Promise<string> {
  if (acknowledgedProviders.has(providerAddress)) return 'Already acknowledged (cached)';
  const broker = await getBroker(signer);
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress);
    acknowledgedProviders.add(providerAddress);
    return 'Provider acknowledged';
  } catch (err: any) {
    if (err.message?.includes('already') || err.message?.includes('exist') || err.message?.includes('duplicate')) {
      acknowledgedProviders.add(providerAddress);
      return 'Provider already acknowledged';
    }
    throw err;
  }
}

// ─── Transfer to Provider (Step 3) ─────────────────────────────────

export async function transferToProvider(signer: ethers.Signer, providerAddress: string, amountOG: number = 1): Promise<string> {
  const broker = await getBroker(signer);
  if (typeof broker.ledger.transferFund !== 'function') {
    const methods = Object.keys(broker.ledger).filter((k) => typeof broker.ledger[k] === 'function');
    throw new Error(`transferFund not found. Available: ${methods.join(', ')}`);
  }
  try {
    const amount = ethers.parseEther(amountOG.toString());
    console.log(`[0G Compute] transferFund(${providerAddress}, "inference", ${amount})`);
    await broker.ledger.transferFund(providerAddress, 'inference', amount);
    fundedProviders.add(providerAddress);
    return `Transferred ${amountOG} OG to provider`;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('already') || msg.includes('exist')) { fundedProviders.add(providerAddress); return 'Provider already funded'; }
    if (msg.includes('user rejected') || msg.includes('denied')) throw new Error('Transaction rejected in wallet.');
    throw new Error(`transferFund failed: ${extractRevertReason(err)}`);
  }
}

// ─── Auto Setup ────────────────────────────────────────────────────

export async function autoSetup(signer: ethers.Signer, providerAddress?: string): Promise<{ provider: string; steps: string[] }> {
  const target = providerAddress || TESTNET_PROVIDERS[0].address;
  const steps: string[] = [];

  try {
    const result = await createLedger(signer, 3);
    steps.push(`✓ ${result}`);
  } catch (err: any) { throw new Error(`Deposit failed: ${err.message}`); }

  try {
    const result = await acknowledgeProvider(signer, target);
    steps.push(`✓ ${result}`);
  } catch (err: any) { throw new Error(`Acknowledge failed: ${err.message}\n\nCompleted: ${steps.join(', ')}`); }

  try {
    const result = await transferToProvider(signer, target, 1);
    steps.push(`✓ ${result}`);
  } catch (err: any) { throw new Error(`Fund transfer failed: ${err.message}\n\nCompleted: ${steps.join(', ')}`); }

  return { provider: target, steps };
}

// ─── Inference ─────────────────────────────────────────────────────

export async function listServices(signer: ethers.Signer): Promise<any[]> {
  try { const broker = await getBroker(signer); return (await broker.inference.listService()) || []; } catch { return []; }
}

/**
 * Send inference request per official docs (Feb 2026).
 */
export async function sendInference(
  signer: ethers.Signer, walletAddress: string, activityJson: string, userQuestion: string
): Promise<string> {
  const prompt = buildPrompt(walletAddress, activityJson, userQuestion);
  const broker = await getBroker(signer);
  const errors: string[] = [];

  // Use live services if available
  let providers = [...TESTNET_PROVIDERS];
  try {
    const services = await broker.inference.listService();
    const chatbots = services?.filter((s: any) => s.serviceType === 'chatbot');
    if (chatbots?.length) {
      providers = chatbots.map((s: any) => ({ address: s.provider, model: s.model, label: s.model, type: 'chatbot' }));
    }
  } catch { /* use hardcoded */ }

  for (const prov of providers) {
    try {
      if (!acknowledgedProviders.has(prov.address)) {
        try { await broker.inference.acknowledgeProviderSigner(prov.address); } catch { /* may already be ack'd */ }
        acknowledgedProviders.add(prov.address);
      }

      const metadata = await broker.inference.getServiceMetadata(prov.address);
      const endpoint = metadata.endpoint || metadata.url;
      const model = metadata.model || prov.model;
      if (!endpoint) throw new Error('No endpoint from getServiceMetadata');

      // Chatbot: getRequestHeaders takes 1 param (providerAddress)
      const headers = await broker.inference.getRequestHeaders(prov.address);

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a blockchain wallet analyst AI for the 0G network. Respond in markdown.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from model');

      // processResponse — per docs: (providerAddress, chatID?, usageString?)
      try {
        let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key');
        if (!chatID) chatID = data.id || data.chatID;
        if (data.usage) {
          await broker.inference.processResponse(prov.address, chatID || undefined, JSON.stringify(data.usage));
        } else if (chatID) {
          await broker.inference.processResponse(prov.address, chatID);
        }
      } catch { /* non-critical */ }

      return content;
    } catch (err: any) {
      errors.push(`${prov.label}: ${err.message}`);
      continue;
    }
  }

  throw new Error(
    `All providers failed.\n\n` + errors.map((e) => `• ${e}`).join('\n') +
    `\n\n**Make sure you've run Setup Compute first.**`
  );
}

export function resetBroker() {
  brokerInstance = null;
  brokerError = null;
  acknowledgedProviders.clear();
  fundedProviders.clear();
}