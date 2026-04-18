/**
 * Risk Policy MCP Server
 */
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { executeWithRiskCheck, getRiskEmoji } from './policy-engine.js';

const server = new Server(
  { name: 'clawdrop-risk-policy', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

const tools = [
  {
    name: 'check_token_risk',
    description: 'Assess the on-chain risk of a token before transacting',
    inputSchema: {
      type: 'object',
      properties: {
        mint: { type: 'string', description: 'Token mint address' },
        action: { 
          type: 'string', 
          enum: ['swap', 'send', 'stake'],
          description: 'Type of transaction' 
        },
        amount: { type: 'number', description: 'Amount (for context)' },
      },
      required: ['mint', 'action'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    if (req.params.name === 'check_token_risk') {
      const { mint, action, amount = 0 } = req.params.arguments as any;
      const result = await executeWithRiskCheck(action, mint, amount);
      
      const emoji = getRiskEmoji(result.risk_tier);
      const text = result.decision === 'blocked'
        ? `${emoji} ${result.reason_if_blocked}`
        : result.decision === 'warned'
        ? `${emoji} ${result.warning_message}`
        : `${emoji} Safe to proceed`;
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({ ...result, summary: text }, null, 2)
        }] 
      };
    }
    
    return { 
      content: [{ type: 'text', text: 'Unknown tool' }],
      isError: true 
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('clawdrop-risk-policy MCP running (stdio)');
