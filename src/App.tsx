import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import Navbar from './components/Navbar';
import ActivityPanel from './components/ActivityPanel';
import ComputeSetup from './components/ComputeSetup';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';

import { useWallet } from './hooks/useWallet';
import { useChat } from './hooks/useChat';
import { fetchWalletActivity } from './utils/transactions';
import { resetBroker } from './utils/compute';
import { WalletActivity } from './types';

export default function App() {
  const wallet = useWallet();
  const chat = useChat();

  const [activity, setActivity] = useState<WalletActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Fetch activity when wallet connects
  const loadActivity = useCallback(async () => {
    if (!wallet.address) return;

    setActivityLoading(true);
    setActivityError(null);

    try {
      const data = await fetchWalletActivity(wallet.address);
      setActivity(data);

      // Show welcome message in chat
      if (chat.messages.length === 0) {
        chat.addMessage(
          'assistant',
          `Connected to **${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}**!\n\n` +
          `I found **${data.totalTxCount} transactions** and a balance of **${parseFloat(data.balance).toFixed(4)} OG**.\n\n` +
          `**Before chatting**, click **"Setup Compute"** in the sidebar to initialize your 0G Compute ledger (one-time, requires ~5 OG).\n\n` +
          `Then ask me anything about your wallet activity!`
        );
      }
    } catch (err: any) {
      setActivityError(err.message || 'Failed to fetch wallet activity');
      toast.error('Failed to fetch wallet data');
    } finally {
      setActivityLoading(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadActivity();
    }
  }, [wallet.isConnected, wallet.address]);

  // Clear state on disconnect
  useEffect(() => {
    if (!wallet.isConnected) {
      setActivity(null);
      setActivityError(null);
      chat.clearMessages();
      resetBroker();
    }
  }, [wallet.isConnected]);

  // Handle sending a message
  const handleSend = useCallback(
    (message: string) => {
      if (!wallet.signer || !wallet.address) {
        toast.error('Please connect your wallet first');
        return;
      }
      chat.sendMessage(message, wallet.signer, wallet.address, activity);
    },
    [wallet.signer, wallet.address, activity, chat.sendMessage]
  );

  return (
    <div className="min-h-screen bg-void-950 noise mesh-bg">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#141425',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#7c3aed', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {/* Navbar */}
      <Navbar
        address={wallet.address}
        isConnected={wallet.isConnected}
        isConnecting={wallet.isConnecting}
        isCorrectNetwork={wallet.isCorrectNetwork}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
      />

      {/* Main Layout */}
      <main className="pt-16 h-screen flex">
        {/* Sidebar: Activity Panel */}
        {wallet.isConnected && (
          <aside className="hidden lg:block w-80 xl:w-96 border-r border-void-800/50 overflow-y-auto p-4">
            <ActivityPanel
              activity={activity}
              isLoading={activityLoading}
              error={activityError}
              onRefresh={loadActivity}
            />

            {/* Compute Setup */}
            <div className="mt-4">
              <ComputeSetup signer={wallet.signer} isConnected={wallet.isConnected} />
            </div>

            {/* How it works */}
            <div className="mt-4 p-4 rounded-xl bg-void-800/20 border border-void-700/20">
              <p className="text-[10px] text-void-500 uppercase tracking-wider font-semibold mb-2">
                How it works
              </p>
              <div className="space-y-2 text-xs text-void-400 leading-relaxed">
                <p>1. Your wallet data is fetched from 0G RPC</p>
                <p>2. Click <strong className="text-void-200">Setup Compute</strong> above (one-time)</p>
                <p>3. Questions are structured into analysis prompts</p>
                <p>4. Prompts are sent to 0G Compute Network</p>
                <p>5. AI analyzes your data and responds</p>
              </div>
            </div>
          </aside>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Activity + Compute Setup */}
          {wallet.isConnected && (
            <div className="lg:hidden px-4 pt-4 space-y-3">
              <ActivityPanel
                activity={activity}
                isLoading={activityLoading}
                error={activityError}
                onRefresh={loadActivity}
              />
              <ComputeSetup signer={wallet.signer} isConnected={wallet.isConnected} />
            </div>
          )}

          {/* Chat Window */}
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              messages={chat.messages}
              isProcessing={chat.isProcessing}
              isConnected={wallet.isConnected}
              onConnect={wallet.connect}
              onSuggestion={handleSend}
              onClear={chat.clearMessages}
            />
          </div>

          {/* Chat Input */}
          <div className="p-4 sm:p-6 border-t border-void-800/50 bg-void-950/80 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                onSend={handleSend}
                disabled={!wallet.isConnected}
                isProcessing={chat.isProcessing}
                placeholder={
                  !wallet.isConnected
                    ? 'Connect your wallet to start...'
                    : chat.isProcessing
                    ? 'Analyzing via 0G Compute...'
                    : 'Ask about your wallet activity...'
                }
              />
              <p className="text-[10px] text-void-700 text-center mt-2">
                AI analysis powered by 0G Compute Network · Responses may not always be accurate
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
