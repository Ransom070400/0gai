import { Wallet, LogOut, Cpu, ExternalLink } from 'lucide-react';
import { shortAddr } from '../utils/wallet';
import { NETWORK } from '../utils/constants';

interface NavbarProps {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Navbar({
  address,
  isConnected,
  isConnecting,
  isCorrectNetwork,
  onConnect,
  onDisconnect,
}: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-og-500 to-og-700
                          flex items-center justify-center shadow-lg shadow-og-600/20">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base leading-none tracking-tight">
              0G Wallet <span className="text-og-400">AI</span>
            </h1>
            <p className="text-[10px] text-void-400 font-medium mt-0.5 tracking-wide">
              INTELLIGENT ANALYTICS
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          {isConnected && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                            bg-void-800/60 border border-void-700/50 text-xs text-void-300">
              <div className={`w-1.5 h-1.5 rounded-full ${
                isCorrectNetwork ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              {isCorrectNetwork ? NETWORK.name : 'Wrong Network'}
            </div>
          )}

          {/* Connect / Address */}
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="badge-connected">
                <div className="w-1.5 h-1.5 rounded-full bg-og-400 animate-pulse" />
                <span className="font-mono">{shortAddr(address)}</span>
              </div>

              <a
                href={`${NETWORK.blockExplorer}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon"
                title="View on Explorer"
              >
                <ExternalLink size={14} />
              </a>

              <button onClick={onDisconnect} className="btn-icon" title="Disconnect">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-primary"
            >
              <Wallet size={15} />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
