/**
 * Jito MCP Server
 */
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'clawdrop-jito', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Jito doesn't expose direct tools - it's used internally by swap logic
// This server is for monitoring/status purposes
server.setRequestHandler(ListToolsRequestSchema, async () => ({ 
  tools: [] 
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  return { 
    content: [{ type: 'text', text: 'Jito execution is integrated into swap_tokens tool' }],
    isError: true 
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('clawdrop-jito MCP running (stdio)');
