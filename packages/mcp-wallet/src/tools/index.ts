import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'check_balance',
    description: 'Check SOL and token balances for any Solana wallet',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Solana wallet address (defaults to your wallet)' },
      },
      required: [],
    },
  },
  {
    name: 'get_token_price',
    description: 'Get live price of any Solana token in USD via Jupiter',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token symbol (SOL, USDC, USDT, HERD) or mint address' },
      },
      required: ['token'],
    },
  },
  {
    name: 'swap_tokens',
    description:
      'Swap tokens on Solana using Jupiter aggregator (best price across all DEXs). ' +
      'Requires WALLET_PRIVATE_KEY env var.',
    inputSchema: {
      type: 'object',
      properties: {
        from_token: { type: 'string', description: 'Token to sell (e.g. SOL, USDC, HERD)' },
        to_token: { type: 'string', description: 'Token to buy' },
        amount: { type: 'number', description: 'Amount of from_token to swap' },
        slippage_bps: {
          type: 'number',
          description: 'Max slippage in basis points (default: 50 = 0.5%)',
          default: 50,
        },
      },
      required: ['from_token', 'to_token', 'amount'],
    },
  },
  {
    name: 'send_tokens',
    description: 'Send SOL or SPL tokens to any address. Requires WALLET_PRIVATE_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient Solana wallet address' },
        token: { type: 'string', description: 'Token to send (SOL, USDC, USDT, HERD)' },
        amount: { type: 'number', description: 'Amount to send' },
        memo: { type: 'string', description: 'Optional memo/note' },
      },
      required: ['to', 'token', 'amount'],
    },
  },
  {
    name: 'get_transaction_history',
    description: 'Get recent transaction history for a wallet via Helius',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address (defaults to your wallet)' },
        limit: { type: 'number', description: 'Number of transactions to return (max 50)', default: 10 },
      },
      required: [],
    },
  },
];
