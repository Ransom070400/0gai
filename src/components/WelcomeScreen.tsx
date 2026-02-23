import {
  Brain, Zap, Shield, TrendingUp, MessageSquare, Wallet,
} from 'lucide-react';
import { SUGGESTED_QUESTIONS } from '../utils/constants';

interface WelcomeScreenProps {
  isConnected: boolean;
  onConnect: () => void;
  onSuggestion: (q: string) => void;
}

export default function WelcomeScreen({ isConnected, onConnect, onSuggestion }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 py-8">
      {/* Animated icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-og-500/20 to-og-800/20
                        border border-og-500/10 flex items-center justify-center
                        animate-float">
          <Brain size={32} className="text-og-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-og-500
                        flex items-center justify-center animate-pulse">
          <Zap size={10} className="text-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="font-display font-bold text-2xl sm:text-3xl text-center mb-3 tracking-tight">
        0G Wallet <span className="text-og-400">AI</span> Assistant
      </h2>
      <p className="text-void-400 text-sm text-center max-w-md mb-8 leading-relaxed">
        Ask intelligent questions about your wallet activity, transactions, and spending patterns.
        Powered by decentralized AI on the 0G Compute Network.
      </p>

      {!isConnected ? (
        /* Connect CTA */
        <div className="text-center">
          <button onClick={onConnect} className="btn-primary text-base px-8 py-3 mb-4">
            <Wallet size={18} />
            Connect Wallet to Start
          </button>
          <p className="text-xs text-void-600">
            Your wallet data is analyzed on-chain via 0G Compute. Nothing is stored on external servers.
          </p>
        </div>
      ) : (
        /* Suggested Questions */
        <div className="w-full max-w-xl">
          <p className="text-xs text-void-500 uppercase tracking-wider font-semibold text-center mb-4">
            Try asking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(q)}
                className="flex items-start gap-3 px-4 py-3 rounded-xl
                           bg-void-800/30 border border-void-700/30
                           hover:border-og-500/20 hover:bg-og-500/5
                           transition-all duration-200 text-left group"
              >
                <MessageSquare
                  size={14}
                  className="text-void-500 group-hover:text-og-400 transition-colors mt-0.5 flex-shrink-0"
                />
                <span className="text-sm text-void-300 group-hover:text-void-100 transition-colors">
                  {q}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="flex items-center gap-6 mt-10 text-[10px] text-void-600 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-og-500/60" />
          On-Chain AI
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={10} className="text-og-500/60" />
          Real-time Analysis
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-og-500/60" />
          0G Compute
        </div>
      </div>
    </div>
  );
}
