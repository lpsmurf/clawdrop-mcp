#!/usr/bin/env node
/**
 * @clawdrop/openclaw — Combined MCP stdio server
 *
 * Single container that loads ALL Clawdrop tool bundles:
 *   - mcp-wallet:          check_balance, get_token_price, swap_tokens, send_tokens,
 *                          get_transaction_history, get_fee_summary
 *   - travel-crypto-pro:   search_flights, price_flight, book_flight, search_hotels, book_hotel
 *   - treasury:            stake_sol, get_staking_positions, get_defi_overview, get_yield_opportunities
 *   - research:            web_search, summarize_url, get_news, get_token_info, get_trending_tokens, search_token
 *
 * Environment:
 *   WALLET_PRIVATE_KEY   — Solana wallet private key (bs58)
 *   DUFFEL_API_TOKEN     — Duffel flights API token
 *   ANTHROPIC_API_KEY    — Anthropic API key
 *   TELEGRAM_BOT_TOKEN   — Telegram bot token
 *   HELIUS_API_KEY       — Helius RPC API key
 *   BRAVE_API_KEY        — (optional) Brave Search API key for web_search
 *   SOLANA_RPC_URL       — Solana RPC endpoint (required for staking tools)
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

// ─── Tool manifests ───────────────────────────────────────────────────────────

const walletTools: Tool[] = [
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
    description: 'Swap tokens on Solana using Jupiter aggregator. Requires WALLET_PRIVATE_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        from_token: { type: 'string', description: 'Token to sell (e.g. SOL, USDC)' },
        to_token: { type: 'string', description: 'Token to buy' },
        amount: { type: 'number', description: 'Amount of from_token to swap' },
        slippage_bps: { type: 'number', description: 'Max slippage in basis points (default: 50)', default: 50 },
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
  {
    name: 'get_fee_summary',
    description: 'Get Clawdrop platform fee summary (admin only)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

const travelTools: Tool[] = [
  {
    name: 'search_flights',
    description: 'Search for available flights using the Duffel API',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Departure airport IATA code (e.g. LAX, JFK)' },
        destination: { type: 'string', description: 'Arrival airport IATA code' },
        departure_date: { type: 'string', description: 'Departure date YYYY-MM-DD' },
        return_date: { type: 'string', description: 'Optional return date YYYY-MM-DD' },
        passengers: { type: 'number', description: 'Number of passengers (default: 1)' },
        cabin_class: {
          type: 'string',
          enum: ['economy', 'premium_economy', 'business', 'first'],
          description: 'Cabin class preference',
        },
      },
      required: ['origin', 'destination', 'departure_date'],
    },
  },
  {
    name: 'price_flight',
    description: 'Get confirmed pricing for a flight offer before booking',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: { type: 'string', description: 'Flight offer ID from search_flights' },
        total_amount: { type: 'string', description: 'Total price amount to confirm' },
        currency: { type: 'string', description: 'Currency code (e.g. USD, EUR)' },
      },
      required: ['offer_id', 'total_amount'],
    },
  },
  {
    name: 'book_flight',
    description: 'Book a flight with passenger details. Requires DUFFEL_API_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: { type: 'string', description: 'Flight offer ID to book' },
        given_name: { type: 'string', description: 'Passenger first name' },
        family_name: { type: 'string', description: 'Passenger last name' },
        email: { type: 'string', description: 'Passenger email address' },
        phone: { type: 'string', description: 'Passenger phone number' },
        date_of_birth: { type: 'string', description: 'Passenger DOB YYYY-MM-DD' },
        gender: { type: 'string', enum: ['male', 'female'], description: 'Passenger gender' },
      },
      required: ['offer_id', 'given_name', 'family_name', 'email', 'phone', 'date_of_birth', 'gender'],
    },
  },
  {
    name: 'search_hotels',
    description: 'Search for available hotels in a city. Returns up to 5 options at different price points with amenities and booking tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name (e.g. "New York", "Paris", "Tokyo")' },
        check_in: { type: 'string', description: 'Check-in date YYYY-MM-DD' },
        check_out: { type: 'string', description: 'Check-out date YYYY-MM-DD' },
        guests: { type: 'number', description: 'Number of guests (default: 1)' },
        max_price_usd: { type: 'number', description: 'Maximum price per night in USD (optional filter)' },
      },
      required: ['city', 'check_in', 'check_out'],
    },
  },
  {
    name: 'book_hotel',
    description: 'Book a hotel using a booking_token from search_hotels. Returns a confirmation number and full booking details.',
    inputSchema: {
      type: 'object',
      properties: {
        booking_token: { type: 'string', description: 'Opaque booking token returned by search_hotels' },
        guest_name: { type: 'string', description: 'Full name of the primary guest' },
        guest_email: { type: 'string', description: 'Guest email address for confirmation' },
        payment_method: { type: 'string', description: 'Payment method: "card", "sol", or "usdc"' },
      },
      required: ['booking_token', 'guest_name', 'guest_email', 'payment_method'],
    },
  },
];

const researchToolDefs: Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web and return top results. Uses Brave if BRAVE_API_KEY is set, otherwise DuckDuckGo.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (max 5, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'summarize_url',
    description: 'Fetch a URL and return cleaned text content (first 2000 chars) and page title',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch and summarize' },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_news',
    description: 'Get top news stories for a query — returns title, URL, source, and date',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'News search query' },
        count: { type: 'number', description: 'Number of results (max 5, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_token_info',
    description: 'Get real-time token data from DexScreener: price, 24h change, volume, liquidity, market cap, DEX, chain, and social links.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Token mint address (Solana) or contract address (EVM)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_trending_tokens',
    description: 'Get top trending/boosted tokens on DexScreener right now',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_token',
    description: 'Search DexScreener for tokens/pairs by symbol or name. Returns top 5 matching pairs with price and liquidity.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Token symbol or name to search (e.g. "SOL", "bonk", "WIF")' },
      },
      required: ['query'],
    },
  },
];

const treasuryTools: Tool[] = [
  {
    name: 'stake_sol',
    description: 'Stake SOL via Marinade liquid staking — converts SOL to mSOL and earns yield. Requires WALLET_PRIVATE_KEY and SOLANA_RPC_URL.',
    inputSchema: {
      type: 'object',
      properties: {
        amount_sol: { type: 'number', description: 'Amount of SOL to stake' },
        wallet: { type: 'string', description: 'Wallet address (defaults to your wallet)' },
      },
      required: ['amount_sol'],
    },
  },
  {
    name: 'get_staking_positions',
    description: 'Get current mSOL staking positions: balance, USD value, and estimated APY. Requires SOLANA_RPC_URL.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address (defaults to your wallet)' },
      },
      required: [],
    },
  },
  {
    name: 'get_defi_overview',
    description: 'Full DeFi portfolio overview: SOL balance, SPL tokens, and staking positions with USD values.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address (defaults to your wallet)' },
      },
      required: [],
    },
  },
  {
    name: 'get_yield_opportunities',
    description: 'Get top Solana yield opportunities (liquid staking, LP pools, lending) with APY and risk ratings.',
    inputSchema: {
      type: 'object',
      properties: {
        risk_tolerance: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Filter by risk level (optional)',
        },
      },
      required: [],
    },
  },
];

const allTools: Tool[] = [...walletTools, ...travelTools, ...researchToolDefs, ...treasuryTools];

// ─── Tool set membership ──────────────────────────────────────────────────────

const WALLET_TOOLS = new Set([
  'check_balance', 'get_token_price', 'swap_tokens',
  'send_tokens', 'get_transaction_history', 'get_fee_summary',
]);
const TRAVEL_TOOLS = new Set(['search_flights', 'price_flight', 'book_flight', 'search_hotels', 'book_hotel']);
const RESEARCH_TOOLS = new Set(['web_search', 'summarize_url', 'get_news', 'get_token_info', 'get_trending_tokens', 'search_token']);
const TREASURY_TOOLS = new Set(['stake_sol', 'get_staking_positions', 'get_defi_overview', 'get_yield_opportunities']);

// ─── Routing ──────────────────────────────────────────────────────────────────

/**
 * Resolve the path to a sibling package relative to this file's location.
 * At runtime inside the Docker image: /app/packages/openclaw/dist/index.js
 * Siblings live at:                   /app/packages/{name}/...
 */
function siblingPath(pkgRelative: string): string {
  // __dirname is dist/, go up two levels to /app/packages
  return new URL(`../../${pkgRelative}`, import.meta.url).href;
}

async function dispatchToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (WALLET_TOOLS.has(name)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(siblingPath('mcp-wallet/src/tools/handler.js')) as any;
    const result: unknown = await mod.handleToolCall(name, input);
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  }

  if (TRAVEL_TOOLS.has(name)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(siblingPath('bundles/travel-crypto-pro/src/tools/flights.js')) as any;
    const handler = mod.handleTravelTool ?? mod.handleFlightTool;
    const result: unknown = await handler(name, input);
    return JSON.stringify(result, null, 2);
  }

  if (RESEARCH_TOOLS.has(name)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(siblingPath('bundles/research/dist/index.js')) as any;
    const result: unknown = await mod.handleResearchTool(name, input);
    return JSON.stringify(result, null, 2);
  }

  if (TREASURY_TOOLS.has(name)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(siblingPath('bundles/treasury/src/index.js')) as any;
    const result: unknown = await mod.handleTreasuryTool(name, input);
    return JSON.stringify(result, null, 2);
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ─── MCP server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'clawdrop-openclaw', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const text = await dispatchToolCall(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Start Telegram bot as background process if token is configured
if (process.env.TELEGRAM_BOT_TOKEN) {
  import('./bot.js').catch((err: Error) =>
    console.error('[openclaw] Telegram bot failed to start:', err.message)
  );
  console.error('[openclaw] Telegram bot starting...');
}

console.error(
  'clawdrop-openclaw MCP running (stdio) — bundles: mcp-wallet, travel-crypto-pro, research, treasury — 21 tools'
);
