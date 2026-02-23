import { useState } from 'react';
import {
  RefreshCw, ArrowUpRight, ArrowDownLeft, FileCode, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Coins, Activity, Hash,
} from 'lucide-react';
import { WalletActivity, Transaction } from '../types';
import { shortAddr } from '../utils/wallet';
import { formatDate, formatOG, truncHash } from '../utils/helpers';
import { NETWORK } from '../utils/constants';

interface ActivityPanelProps {
  activity: WalletActivity | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function ActivityPanel({ activity, isLoading, error, onRefresh }: ActivityPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!activity && !isLoading && !error) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-void-800/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Activity size={16} className="text-og-400" />
          <span className="font-display font-semibold text-sm">Wallet Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            disabled={isLoading}
            className="btn-icon !w-7 !h-7"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {expanded ? <ChevronUp size={14} className="text-void-500" /> : <ChevronDown size={14} className="text-void-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Loading */}
          {isLoading && !activity && (
            <div className="flex items-center gap-3 py-6 justify-center text-void-400 text-sm">
              <Loader2 size={16} className="animate-spin text-og-400" />
              Fetching wallet data...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-300">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Stats */}
          {activity && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Balance"
                  value={formatOG(activity.balance)}
                  icon={<Coins size={14} className="text-og-400" />}
                />
                <StatCard
                  label="Transactions"
                  value={activity.totalTxCount.toString()}
                  icon={<Hash size={14} className="text-og-400" />}
                />
              </div>

              {/* Transaction list */}
              <div>
                <p className="text-[10px] text-void-500 uppercase tracking-wider font-semibold mb-2">
                  Recent Transactions ({activity.transactions.length})
                </p>

                {activity.transactions.length === 0 ? (
                  <p className="text-xs text-void-500 text-center py-4">
                    No transactions found
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                    {activity.transactions.slice(0, 20).map((tx) => (
                      <TxRow
                        key={tx.hash}
                        tx={tx}
                        myAddress={activity.wallet}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-void-800/30 border border-void-700/30">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-void-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold font-mono text-void-100">{value}</p>
    </div>
  );
}

function TxRow({ tx, myAddress }: { tx: Transaction; myAddress: string }) {
  const isSent = tx.from.toLowerCase() === myAddress.toLowerCase();

  const TypeIcon = tx.type === 'contract_call' || tx.type === 'contract_creation'
    ? FileCode
    : isSent ? ArrowUpRight : ArrowDownLeft;

  const typeColor = tx.isError
    ? 'text-red-400'
    : tx.type === 'contract_call' || tx.type === 'contract_creation'
    ? 'text-amber-400'
    : isSent ? 'text-rose-400' : 'text-emerald-400';

  return (
    <a
      href={`${NETWORK.blockExplorer}/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg
                 hover:bg-void-700/20 transition-colors group"
    >
      <div className={`w-7 h-7 rounded-lg bg-void-800/60 flex items-center justify-center ${typeColor}`}>
        <TypeIcon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-void-200 truncate">
            {tx.type === 'contract_call' ? 'Contract Call' :
             tx.type === 'contract_creation' ? 'Deploy' :
             isSent ? `To ${shortAddr(tx.to)}` : `From ${shortAddr(tx.from)}`}
          </span>
        </div>
        <span className="text-[10px] text-void-600">{formatDate(tx.timestamp)}</span>
      </div>
      <span className={`text-xs font-mono font-medium ${
        isSent ? 'text-rose-300' : 'text-emerald-300'
      }`}>
        {isSent ? '-' : '+'}{tx.amount}
      </span>
    </a>
  );
}
