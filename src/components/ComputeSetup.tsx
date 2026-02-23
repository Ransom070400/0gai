import { useState, useEffect } from 'react';
import {
  Cpu, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Zap, Wallet, ArrowRight, RefreshCw, Bug,
} from 'lucide-react';
import { ethers } from 'ethers';
import {
  autoSetup, getSetupStatus, TESTNET_PROVIDERS, SetupStatus,
  setCustomContractAddress, getCustomContractAddress,
} from '../utils/compute';

interface ComputeSetupProps {
  signer: ethers.Signer | null;
  isConnected: boolean;
}

export default function ComputeSetup({ signer, isConnected }: ComputeSetupProps) {
  const [expanded, setExpanded] = useState(true);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupSteps, setSetupSteps] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [customAddr, setCustomAddr] = useState(getCustomContractAddress() || '');
  const [showContractInput, setShowContractInput] = useState(false);

  const applyCustomContract = () => {
    const addr = customAddr.trim();
    if (addr && addr.startsWith('0x') && addr.length === 42) {
      setCustomContractAddress(addr);
      setSetupError(null);
      checkStatus();
    } else if (!addr) {
      setCustomContractAddress(null);
      setSetupError(null);
      checkStatus();
    }
  };

  useEffect(() => {
    if (signer && isConnected) checkStatus();
  }, [signer, isConnected]);

  const checkStatus = async () => {
    if (!signer) return;
    setIsChecking(true);
    try {
      const s = await getSetupStatus(signer);
      setStatus(s);
    } catch (err: any) {
      setStatus({
        hasLedger: false,
        balance: '0',
        locked: '0',
        available: '0',
        walletBalance: '0',
        brokerLoaded: false,
        brokerError: err.message,
        sdkExports: [],
        serviceCount: 0,
        ledgerMethods: [],
        contractAddress: 'unknown',
      });
    }
    setIsChecking(false);
  };

  const handleSetup = async () => {
    if (!signer) return;
    setIsSettingUp(true);
    setSetupError(null);
    setSetupSteps([]);

    try {
      const result = await autoSetup(signer);
      setSetupSteps(result.steps);
      await checkStatus();
    } catch (err: any) {
      setSetupError(err.message);
    }

    setIsSettingUp(false);
  };

  if (!isConnected) return null;

  const isReady = status?.hasLedger && parseFloat(status.available) > 0;

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-void-800/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Cpu size={16} className="text-og-400" />
          <span className="font-display font-semibold text-sm">0G Compute</span>
          {isReady && <CheckCircle2 size={12} className="text-emerald-400" />}
          {status?.brokerError && <AlertCircle size={12} className="text-amber-400" />}
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-void-500" />
          : <ChevronDown size={14} className="text-void-500" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          {/* Loading */}
          {isChecking && (
            <div className="flex items-center gap-2 text-xs text-void-400 py-2">
              <Loader2 size={12} className="animate-spin" />
              Checking compute status...
            </div>
          )}

          {/* Status */}
          {status && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-void-500 uppercase tracking-wider font-semibold">
                  Status
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="btn-icon !w-6 !h-6"
                    title="Toggle debug info"
                  >
                    <Bug size={10} />
                  </button>
                  <button onClick={checkStatus} disabled={isChecking} className="btn-icon !w-6 !h-6">
                    <RefreshCw size={10} className={isChecking ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* SDK / Broker status indicators */}
              <div className="space-y-1">
                <StatusRow
                  label="Wallet balance"
                  ok={parseFloat(status.walletBalance) >= 5}
                  detail={`${parseFloat(status.walletBalance).toFixed(4)} OG`}
                />
                <StatusRow
                  label="SDK loaded"
                  ok={status.sdkExports.length > 0}
                  detail={status.sdkExports.length > 0 ? `${status.sdkExports.length} exports` : 'Not loaded'}
                />
                <StatusRow
                  label="Broker initialized"
                  ok={status.brokerLoaded}
                  detail={status.brokerLoaded ? 'Ready' : (status.brokerError?.slice(0, 60) || 'Not initialized')}
                />
                <StatusRow
                  label="Ledger created"
                  ok={status.hasLedger}
                  detail={status.hasLedger ? `${parseFloat(status.balance).toFixed(4)} OG` : 'Not yet'}
                />
                <StatusRow
                  label="Services found"
                  ok={status.serviceCount > 0}
                  detail={status.serviceCount > 0 ? `${status.serviceCount} providers` : 'None'}
                />
              </div>

              {/* Insufficient balance warning */}
              {parseFloat(status.walletBalance) < 5 && parseFloat(status.walletBalance) > 0 && !status.hasLedger && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-xs text-amber-300 font-medium mb-1">Insufficient Balance</p>
                  <p className="text-[10px] text-void-500 leading-relaxed">
                    You have <strong className="text-void-300">{parseFloat(status.walletBalance).toFixed(4)} OG</strong> but
                    need at least <strong className="text-void-300">~5 OG</strong> (3 for ledger + 1 for provider + gas).
                    Get tokens from <a href="https://faucet.0g.ai" target="_blank" rel="noopener noreferrer" className="text-og-500 hover:underline">faucet.0g.ai</a>
                  </p>
                </div>
              )}

              {/* Ledger balances */}
              {status.hasLedger && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 rounded-lg bg-void-800/30 border border-void-700/30">
                    <p className="text-[9px] text-void-600 uppercase">Balance</p>
                    <p className="text-xs font-mono font-semibold text-void-200">
                      {parseFloat(status.balance).toFixed(4)} OG
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-void-800/30 border border-void-700/30">
                    <p className="text-[9px] text-void-600 uppercase">Available</p>
                    <p className="text-xs font-mono font-semibold text-emerald-300">
                      {parseFloat(status.available).toFixed(4)} OG
                    </p>
                  </div>
                </div>
              )}

              {/* Debug panel */}
              {showDebug && (
                <div className="p-3 rounded-xl bg-void-900/60 border border-void-700/20 font-mono text-[10px] text-void-500 space-y-1 overflow-x-auto">
                  <p><span className="text-void-400">Wallet balance:</span> {parseFloat(status.walletBalance).toFixed(6)} OG</p>
                  <p><span className="text-void-400">SDK exports:</span> {status.sdkExports.join(', ') || 'none'}</p>
                  <p><span className="text-void-400">Broker:</span> {status.brokerLoaded ? 'OK' : 'FAILED'}</p>
                  <p><span className="text-void-400">Services:</span> {status.serviceCount}</p>
                  <p><span className="text-void-400">Ledger methods:</span> {status.ledgerMethods.join(', ') || 'none'}</p>
                  <p><span className="text-void-400">Contract:</span> {(status as any).contractAddress || 'unknown'}</p>
                  {status.brokerError && (
                    <p className="text-red-400 break-all"><span className="text-void-400">Error:</span> {status.brokerError}</p>
                  )}
                  <p className="text-void-600 mt-1">Open browser console (F12) for detailed logs</p>
                </div>
              )}
            </div>
          )}

          {/* Broker error — show prominently */}
          {status?.brokerError && !showDebug && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-xs text-amber-300 font-medium mb-1">SDK Issue Detected</p>
              <p className="text-[10px] text-void-500 leading-relaxed break-all">
                {status.brokerError.slice(0, 150)}
                {status.brokerError.length > 150 ? '...' : ''}
              </p>
              <p className="text-[10px] text-void-600 mt-1">
                Click the <Bug size={9} className="inline" /> icon for full diagnostic info
              </p>
            </div>
          )}

          {/* Provider list */}
          <div>
            <p className="text-[10px] text-void-500 uppercase tracking-wider font-semibold mb-2">
              Testnet Providers
            </p>
            <div className="space-y-1.5">
              {TESTNET_PROVIDERS.map((p) => (
                <div
                  key={p.address}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-void-800/20 border border-void-700/20"
                >
                  <div>
                    <p className="text-xs text-void-200 font-medium">{p.label}</p>
                    <p className="text-[9px] text-void-600 font-mono">{p.address.slice(0, 10)}...</p>
                  </div>
                  <span className="text-[9px] text-void-500">{p.inputPrice}/tok</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom contract address — shows when stale address detected or user toggles */}
          {(setupError?.includes('No contract at') || showContractInput) && (
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-300 font-medium">Custom Contract Address</p>
                {!setupError?.includes('No contract at') && (
                  <button onClick={() => setShowContractInput(false)} className="text-[10px] text-void-600 hover:text-void-400">
                    Hide
                  </button>
                )}
              </div>
              <p className="text-[10px] text-void-500 leading-relaxed">
                The SDK's default serving contract is stale. If you have the current address from
                {' '}<a href="https://discord.com/invite/0glabs" target="_blank" rel="noopener noreferrer" className="text-og-500 hover:underline">0G Discord</a>,
                enter it here:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAddr}
                  onChange={(e) => setCustomAddr(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-2 py-1.5 text-[10px] font-mono bg-void-900/60 border border-void-700/30 rounded-lg text-void-200 placeholder:text-void-700 focus:outline-none focus:border-og-500/50"
                />
                <button
                  onClick={applyCustomContract}
                  className="px-3 py-1.5 text-[10px] font-medium bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  Apply
                </button>
              </div>
              {getCustomContractAddress() && (
                <p className="text-[9px] text-blue-400/60">
                  Active: {getCustomContractAddress()}
                </p>
              )}
            </div>
          )}

          {/* Toggle for advanced users to try custom address */}
          {!showContractInput && !setupError?.includes('No contract at') && (
            <button
              onClick={() => setShowContractInput(true)}
              className="text-[9px] text-void-600 hover:text-void-400 transition-colors"
            >
              Advanced: Set custom serving contract address
            </button>
          )}

          {/* Setup button */}
          <button
            onClick={handleSetup}
            disabled={isSettingUp || (status !== null && !status.brokerLoaded)}
            className="btn-primary w-full justify-center"
          >
            {isSettingUp ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Setting up... (confirm in wallet)
              </>
            ) : isReady ? (
              <>
                <Zap size={14} />
                Re-run Setup
              </>
            ) : (
              <>
                <Wallet size={14} />
                Setup Compute
                <ArrowRight size={12} />
              </>
            )}
          </button>

          <p className="text-[9px] text-void-700 text-center leading-relaxed">
            Creates ledger (3 OG) + acknowledges & funds first provider (1 OG).
            Requires ~3 wallet confirmations. Need tokens? → <a href="https://faucet.0g.ai" target="_blank" rel="noopener noreferrer" className="text-og-500 hover:underline">faucet.0g.ai</a>
          </p>

          {/* Setup progress */}
          {setupSteps.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
              {setupSteps.map((step, i) => (
                <p key={i} className="text-xs text-emerald-300">{step}</p>
              ))}
            </div>
          )}

          {/* Setup error */}
          {setupError && (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-xs text-red-300 font-medium mb-1">Setup Error</p>
              <p className="text-[10px] text-red-400/80 break-all whitespace-pre-wrap leading-relaxed">
                {setupError}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-800/20">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-void-600'}`} />
      <span className="text-[10px] text-void-400 flex-shrink-0">{label}</span>
      <span className="text-[10px] text-void-600 truncate ml-auto">{detail}</span>
    </div>
  );
}