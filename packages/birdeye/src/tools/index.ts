import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'get_token_analytics',
    description: 'Get detailed analytics for a token (price, liquidity, holder count, volume)',
    inputSchema: {
      type: 'object',
      properties: {
        mint: { 
          type: 'string', 
          description: 'Token mint address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v for USDC)' 
        }
      },
      required: ['mint'],
    },
  },
  {
    name: 'get_market_overview',
    description: 'Get trending tokens on Solana (top 10 by volume/activity)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_wallet_analytics',
    description: 'Analyze a wallet\'s token holdings and portfolio value',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { 
          type: 'string', 
          description: 'Solana wallet address to analyze' 
        }
      },
      required: ['wallet'],
    },
  },
];
