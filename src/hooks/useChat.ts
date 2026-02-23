import { useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { ChatMessage, WalletActivity } from '../types';
import { sendInference } from '../utils/compute';
import { activityToPromptJson } from '../utils/transactions';
import { uid } from '../utils/helpers';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((role: ChatMessage['role'], content: string): ChatMessage => {
    const msg: ChatMessage = { id: uid(), role, content, timestamp: Date.now() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  /**
   * Send a user question to 0G Compute for analysis.
   */
  const sendMessage = useCallback(
    async (
      question: string,
      signer: ethers.Signer,
      walletAddress: string,
      activity: WalletActivity | null
    ) => {
      if (!question.trim() || isProcessing) return;

      // Add user message
      addMessage('user', question.trim());

      setIsProcessing(true);

      try {
        const activityJson = activity
          ? activityToPromptJson(activity)
          : JSON.stringify({ wallet: walletAddress, balance: 'unknown', transactions: [] });

        const response = await sendInference(signer, walletAddress, activityJson, question.trim());

        addMessage('assistant', response);
      } catch (err: any) {
        const errorContent =
          `Sorry, I couldn't process that request.\n\n**Error:** ${err.message}\n\n` +
          `**If you haven't already:**\n` +
          `1. Click **"Setup Compute"** in the sidebar to create your ledger & fund a provider\n` +
          `2. You need at least **5 OG tokens** (get from [faucet.0g.ai](https://faucet.0g.ai))\n` +
          `3. Confirm the 3 wallet transactions during setup\n` +
          `4. Then try asking again!`;

        addMessage('assistant', errorContent);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, addMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isProcessing,
    sendMessage,
    clearMessages,
    addMessage,
  };
}
