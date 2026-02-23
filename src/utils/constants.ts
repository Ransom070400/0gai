export const NETWORK = {
  name: '0G Galileo Testnet',
  chainId: 16602,
  chainIdHex: '0x40da',
  rpcUrl: 'https://evmrpc-testnet.0g.ai',
  blockExplorer: 'https://chainscan-galileo.0g.ai',
  blockExplorerApi: 'https://chainscan-galileo.0g.ai/open/api',
  symbol: '0G',
  decimals: 18,
} as const;

export const MAINNET = {
  name: '0G Mainnet',
  chainId: 16661,
  chainIdHex: '0x4115',
  rpcUrl: 'https://evmrpc.0g.ai',
  blockExplorer: 'https://chainscan.0g.ai',
  blockExplorerApi: 'https://chainscan.0g.ai/open/api',
  symbol: '0G',
  decimals: 18,
} as const;

/** System prompt template for wallet analysis */
export const SYSTEM_PROMPT = `You are a blockchain wallet analyst AI for the 0G network.
You provide clear, insightful analysis of wallet activity and transactions.
When analyzing data:
- Summarize transaction behavior and patterns
- Detect unusual or suspicious activity
- Highlight large transfers or outliers
- Calculate totals and averages accurately
- Provide insights about spending/receiving patterns
- Suggest potential risks if found
- Format numbers clearly (e.g., "2.5 OG" not raw wei values)
- Use markdown for formatting when helpful
Respond in simple, human-friendly language. Be concise but thorough.`;

export function buildPrompt(
  walletAddress: string,
  activityJson: string,
  userQuestion: string
): string {
  return `You are a blockchain wallet analyst AI.

The user wallet address is: ${walletAddress}

Here is the wallet activity data in JSON:
${activityJson}

The user asked:
"${userQuestion}"

Analyze the wallet data and answer the question clearly.

If relevant:
- Summarize transaction behavior
- Detect unusual activity
- Highlight large transfers
- Calculate totals
- Provide insights
- Suggest potential risks

Respond in simple, human-friendly language. Use markdown for formatting.`;
}

/** Suggested questions for the chat */
export const SUGGESTED_QUESTIONS = [
  'Summarize my wallet activity',
  'What is my biggest transaction?',
  'How much OG have I spent?',
  'Any suspicious activity?',
  'How many transfers in the last 7 days?',
  'Did I interact with any smart contracts?',
] as const;
