export interface Transaction {
  hash: string;
  type: 'transfer' | 'contract_call' | 'contract_creation' | 'unknown';
  from: string;
  to: string;
  amount: string;
  amountRaw: bigint;
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  gasPrice: string;
  isError: boolean;
  methodId?: string;
}

export interface WalletActivity {
  wallet: string;
  balance: string;
  balanceRaw: bigint;
  transactions: Transaction[];
  fetchedAt: number;
  totalTxCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ComputeProvider {
  address: string;
  model: string;
  endpoint: string;
  inputPrice: string;
  outputPrice: string;
  verifiability: string;
}

export interface AppState {
  wallet: {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    chainId: number | null;
  };
  activity: {
    data: WalletActivity | null;
    isLoading: boolean;
    error: string | null;
  };
  chat: {
    messages: ChatMessage[];
    isProcessing: boolean;
  };
}
