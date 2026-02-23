# 0G Wallet AI Assistant

> Intelligent wallet analytics powered by 0G Compute Network.

An AI-powered web application that lets you connect your 0G wallet, fetch transaction history, and ask natural language questions about your wallet activity. All AI processing runs through the **0G Compute Network** — fully decentralized.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────┐
│   Browser    │────▶│  0G RPC      │────▶│  Wallet Activity   │
│   (React)    │     │  (testnet)   │     │  (JSON)            │
└──────┬───────┘     └──────────────┘     └────────┬───────────┘
       │                                           │
       │  user question + wallet data               │
       ▼                                           ▼
┌──────────────────────────────────────────────────────────┐
│                   Structured Prompt                       │
│  "You are a wallet analyst... here is the data... the    │
│   user asked: '...' Analyze and respond."                │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              0G Compute Network                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ Serving Broker   │──│ Inference Provider (LLM)     │  │
│  │ (auth + billing) │  │ (OpenAI-compatible endpoint) │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
              AI Response → Chat UI
```

## Features

- **Wallet Connection** — MetaMask integration with auto-switch to 0G Galileo testnet
- **Transaction History** — Fetches balance, tx count, and recent transactions via 0G RPC
- **AI Chat Interface** — ChatGPT-style UI with markdown rendering
- **0G Compute Integration** — Inference via the `@0glabs/0g-serving-broker` SDK
- **Structured Prompts** — Wallet data is injected into a structured analysis prompt
- **Suggested Questions** — Pre-built questions to get started quickly

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (dark theme, glassmorphism) |
| Wallet | MetaMask via ethers.js v6 |
| Blockchain | 0G Chain RPC (`evmrpc-testnet.0g.ai`) |
| AI Compute | 0G Serving Broker (`@0glabs/0g-serving-broker`) |
| Markdown | react-markdown |

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- 0G testnet tokens ([faucet.0g.ai](https://faucet.0g.ai))
- Funds deposited in the 0G Compute ledger (for inference fees)

### Install & Run

```bash
npm install
npm run dev
```

### Setup for 0G Compute

To use the AI features, you need to:

1. **Connect wallet** to the 0G Galileo Testnet
2. **Get test tokens** from [faucet.0g.ai](https://faucet.0g.ai)
3. **Deposit funds** into the compute ledger:
   ```typescript
   // This happens via the serving broker
   await broker.ledger.depositFund("0.5");
   ```
4. **Acknowledge a provider** (handled automatically by the app)

### Network Config

| Setting | Value |
|---------|-------|
| Network | 0G Galileo Testnet |
| Chain ID | 16602 |
| RPC | `https://evmrpc-testnet.0g.ai` |
| Explorer | `https://chainscan-galileo.0g.ai` |
| Faucet | `https://faucet.0g.ai` |

## Project Structure

```
src/
├── components/
│   ├── Navbar.tsx           # Top navigation + wallet connection
│   ├── ActivityPanel.tsx    # Sidebar with balance + transaction list
│   ├── ChatWindow.tsx       # Scrollable chat container
│   ├── ChatInput.tsx        # Auto-resizing input with send button
│   ├── MessageBubble.tsx    # User/AI message bubbles + markdown
│   ├── TypingIndicator.tsx  # Animated loading dots
│   └── WelcomeScreen.tsx    # Welcome + suggested questions
├── hooks/
│   ├── useWallet.ts         # MetaMask connection + chain management
│   └── useChat.ts           # Chat state + message handling
├── utils/
│   ├── constants.ts         # Network config, prompt templates
│   ├── wallet.ts            # MetaMask integration
│   ├── transactions.ts      # Fetch wallet activity from RPC/explorer
│   ├── compute.ts           # 0G Compute inference (serving broker)
│   └── helpers.ts           # Formatting, IDs, clipboard
├── types/
│   └── index.ts             # TypeScript interfaces
├── App.tsx                  # Main orchestrator
├── main.tsx                 # Entry point
└── index.css                # Global styles + Tailwind
```

## AI Prompt Structure

When a user asks a question, the app constructs this prompt:

```
You are a blockchain wallet analyst AI.

The user wallet address is: 0x123...

Here is the wallet activity data in JSON:
{
  "wallet": "0x123...",
  "balance": "2.5 OG",
  "transactions": [...]
}

The user asked:
"How much OG have I spent this month?"

Analyze the wallet data and answer the question clearly.
```

This prompt is sent to an LLM inference provider on the 0G Compute Network via the serving broker SDK.

## Example Questions

- "Summarize my wallet behavior"
- "What is my biggest transaction?"
- "How much OG have I spent?"
- "Did I interact with any smart contracts?"
- "Is there any suspicious activity?"
- "How many transfers in the last 7 days?"

## License

MIT
