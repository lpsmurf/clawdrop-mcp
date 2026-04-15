#!/usr/bin/env node
/**
 * @clawdrop/mcp — Lightweight Solana wallet MCP server
 *
 * Add to Claude Desktop in one line:
 * "clawdrop-wallet": { "command": "npx", "args": ["-y", "@clawdrop/mcp@latest"],
 *   "env": { "WALLET_PRIVATE_KEY": "your_base58_private_key" } }
 *
 * Gives Claude: swap_tokens, send_tokens, check_balance,
 *               get_token_price, get_transaction_history
 *
 * Your private key never leaves your machine.
 */
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools/index.js';
import { handleToolCall } from './tools/handler.js';

const server = new Server(
  { name: 'clawdrop-wallet', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const result = await handleToolCall(req.params.name, req.params.arguments ?? {});
    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('clawdrop-wallet MCP running (stdio)');
