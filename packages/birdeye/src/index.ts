/**
 * Birdeye MCP Server
 * Token analytics tools for Poli
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
  { name: 'clawdrop-birdeye', version: '1.0.0' },
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
console.error('clawdrop-birdeye MCP running (stdio)');
