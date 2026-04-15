import { Tool } from '@modelcontextprotocol/sdk/types'; 
import { z } from 'zod';
import { 
  ToolInputMap, 
  Service,
  ListServicesResponseSchema,
  QuoteServiceResponseSchema,
  PayWithSolResponseSchema,
  CreateOpenclawAgentResponseSchema,
  GetAgentStatusResponseSchema,
} from './schemas';
import { readServicesFromFile } from '../services/catalog';
import { getSOLPrice, getHERDPrice, verifyHeliusTransaction } from '../integrations/helius';
import { saveAgent, getAgent, updateAgentStatus, addAgentLog } from '../db/memory';
import { deployViaHFSP, getHFSPStatus } from '../integrations/hfsp';
import { sendDevnetPayment } from '../integrations/solana-payment';
import { logger } from '../utils/logger';

export const tools: Tool[] = [
  {
    name: 'list_services',
    description: 'List all available Clawdrop services that can be deployed and provisioned',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'quote_service',
    description: 'Get a price quote for a service in SOL or HERD tokens',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: {
          type: 'string',
          description: 'The ID of the service to quote',
        },
        token: {
          type: 'string',
          enum: ['sol', 'herd'],
          description: 'Token to quote in (SOL or HERD)',
        },
      },
      required: ['service_id'],
    },
  },
  {
    name: 'pay_with_sol',
    description: 'Pay for a service using SOL on devnet. Requires user approval.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: {
          type: 'string',
          description: 'The service to purchase',
        },
        amount_sol: {
          type: 'number',
          description: 'Amount of SOL to send',
        },
        wallet_pubkey: {
          type: 'string',
          description: 'Your Solana wallet public key',
        },
        approve: {
          type: 'boolean',
          description: 'User approval for payment',
        },
      },
      required: ['service_id', 'amount_sol', 'wallet_pubkey', 'approve'],
    },
  },
  {
    name: 'create_openclaw_agent',
    description: 'Deploy a new OpenClaw agent after payment is confirmed',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: {
          type: 'string',
          description: 'The service ID that was purchased',
        },
        agent_name: {
          type: 'string',
          description: 'Human-readable name for the deployed agent',
        },
        agent_description: {
          type: 'string',
          description: 'Description of the agent purpose',
        },
        config: {
          type: 'object',
          description: 'Optional custom configuration for the agent',
        },
      },
      required: ['service_id', 'agent_name'],
    },
  },
  {
    name: 'get_agent_status',
    description: 'Check the status and health of a deployed OpenClaw agent',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The agent ID returned from create_openclaw_agent',
        },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'verify_payment',
    description: 'Verify a Solana payment transaction on devnet using Helius RPC',
    inputSchema: {
      type: 'object',
      properties: {
        payment_id: {
          type: 'string',
          description: 'The payment ID to verify',
        },
        tx_hash: {
          type: 'string',
          description: 'The Solana transaction signature (tx hash) to verify on devnet',
        },
      },
      required: ['payment_id', 'tx_hash'],
    },
  },
];

export async function handleToolCall(
  toolName: string,
  toolInput: unknown
): Promise<string> {
  logger.info({ tool: toolName, input: toolInput }, 'Tool call received');

  try {
    switch (toolName) {
      case 'list_services':
        return await handleListServices(toolInput);
      case 'quote_service':
        return await handleQuoteService(toolInput);
      case 'pay_with_sol':
        return await handlePayWithSol(toolInput);
      case 'create_openclaw_agent':
        return await handleCreateAgent(toolInput);
      case 'get_agent_status':
        return await handleGetAgentStatus(toolInput);
      case 'verify_payment':
        return await handleVerifyPayment(toolInput);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    logger.error({ error, tool: toolName }, 'Tool execution failed');
    throw error;
  }
}

async function handleListServices(input: unknown): Promise<string> {
  ToolInputMap.list_services.parse(input);
  const services = await readServicesFromFile();
  const response = ListServicesResponseSchema.parse({
    services,
    total_count: services.length,
  });
  return JSON.stringify(response);
}

async function handleQuoteService(input: unknown): Promise<string> {
  const parsed = ToolInputMap.quote_service.parse(input);
  const services = await readServicesFromFile();
  const service = services.find(s => s.id === parsed.service_id);
  
  if (!service) {
    throw new Error(`Service not found: ${parsed.service_id}`);
  }

  const token = parsed.token || 'sol';
  
  let price: number;
  let estimatedGas: number;
  
  if (token === 'sol') {
    price = service.price_sol;
    estimatedGas = 0.005; // 5k lamports
  } else {
    price = service.price_herd;
    estimatedGas = 0;
  }

  const response = QuoteServiceResponseSchema.parse({
    service_id: service.id,
    service_name: service.name,
    price,
    token,
    estimated_gas: estimatedGas,
    total_with_gas: price + estimatedGas,
    valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min validity
  });

  logger.info(
    { 
      service_id: service.id, 
      price, 
      token, 
      total: price + estimatedGas 
    },
    'Service quoted'
  );

  return JSON.stringify(response);
}

async function handlePayWithSol(input: unknown): Promise<string> {
  const parsed = ToolInputMap.pay_with_sol.parse(input);

  if (!parsed.approve) {
    throw new Error('Payment requires user approval');
  }

  // Get service details to determine recipient
  const services = await readServicesFromFile();
  const service = services.find(s => s.id === parsed.service_id);
  
  if (!service) {
    throw new Error(`Service not found: ${parsed.service_id}`);
  }

  // Use service provider wallet, env treasury, or the user's wallet as fallback
  // Note: In production, payments should go to a clawdrop treasury or service provider
  const treasuryWallet = process.env.CLAWDROP_TREASURY_WALLET;
  const recipientAddress = service.provider_wallet || treasuryWallet || parsed.wallet_pubkey;

  // Send real SOL payment via Helius devnet RPC
  const paymentResult = await sendDevnetPayment(recipientAddress, parsed.amount_sol);

  if (!paymentResult.success || !paymentResult.signature) {
    throw new Error(`Payment failed: ${paymentResult.error || 'Unknown error'}`);
  }

  logger.info(
    {
      service_id: parsed.service_id,
      amount: parsed.amount_sol,
      wallet: parsed.wallet_pubkey,
      tx_hash: paymentResult.signature,
      recipient: recipientAddress,
    },
    'Payment processed on devnet'
  );

  const response = PayWithSolResponseSchema.parse({
    tx_hash: paymentResult.signature,
    status: 'confirmed',
    amount_sol: parsed.amount_sol,
    timestamp: new Date().toISOString(),
  });

  return JSON.stringify(response);
}

async function handleCreateAgent(input: unknown): Promise<string> {
  const parsed = ToolInputMap.create_openclaw_agent.parse(input);
  const services = await readServicesFromFile();
  const service = services.find(s => s.id === parsed.service_id);

  if (!service) {
    throw new Error(`Service not found: ${parsed.service_id}`);
  }

  // Generate deployment ID
  const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Call HFSP to deploy the agent
  const hfspResponse = await deployViaHFSP({
    deployment_id: deploymentId,
    tier_id: parsed.service_id,
    region: (parsed.config?.region as string) || 'us-east',
    capability_bundle: service.category,
    payment_verified: true, // Assumes payment was verified before calling this
    wallet_address: (parsed.config?.wallet_address as string) || 'unknown',
    config: {
      agent_name: parsed.agent_name,
      agent_description: parsed.agent_description,
      ...parsed.config,
    },
  });

  if (hfspResponse.error) {
    throw new Error(`HFSP deployment failed: ${hfspResponse.error}`);
  }

  // Save to memory store with real HFSP data
  saveAgent({
    agent_id: hfspResponse.agent_id,
    service_id: parsed.service_id,
    agent_name: parsed.agent_name,
    payment_tx_hash: deploymentId, // Using deploymentId as reference
    status: 'provisioning',
    console_url: hfspResponse.endpoint,
    deployed_at: new Date(),
    last_activity: new Date(),
    logs: [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Agent deployment initiated via HFSP',
      },
    ],
  });

  logger.info(
    {
      agent_id: hfspResponse.agent_id,
      agent_name: parsed.agent_name,
      service_id: parsed.service_id,
      endpoint: hfspResponse.endpoint,
    },
    'Agent deployment initiated via HFSP'
  );

  const response = CreateOpenclawAgentResponseSchema.parse({
    agent_id: hfspResponse.agent_id,
    agent_name: parsed.agent_name,
    status: 'provisioning',
    deployed_at: new Date().toISOString(),
    console_url: hfspResponse.endpoint,
  });

  return JSON.stringify(response);
}

async function handleGetAgentStatus(input: unknown): Promise<string> {
  const parsed = ToolInputMap.get_agent_status.parse(input);

  // Get from memory store
  const agent = getAgent(parsed.agent_id);

  if (!agent) {
    throw new Error(`Agent not found: ${parsed.agent_id}`);
  }

  // Poll HFSP for actual status
  const hfspStatus = await getHFSPStatus(parsed.agent_id);
  
  if (hfspStatus.error) {
    logger.warn({ agent_id: parsed.agent_id, error: hfspStatus.error }, 'HFSP status check returned error');
    // Don't throw - return cached status with warning
  } else if (hfspStatus.status) {
    // Update local status from HFSP
    updateAgentStatus(parsed.agent_id, hfspStatus.status as any);
    
    // Add HFSP logs to agent logs if available
    if (hfspStatus.logs && hfspStatus.logs.length > 0) {
      // Only add new logs not already in our history
      const existingLogMessages = new Set(agent.logs.map(l => l.message));
      for (const log of hfspStatus.logs) {
        if (!existingLogMessages.has(log.message)) {
          addAgentLog(parsed.agent_id, log.level as any, log.message);
        }
      }
    }
  }

  // Refresh agent data after updates
  const updatedAgent = getAgent(parsed.agent_id);
  if (!updatedAgent) {
    throw new Error(`Agent disappeared: ${parsed.agent_id}`);
  }

  const response = GetAgentStatusResponseSchema.parse({
    agent_id: updatedAgent.agent_id,
    status: updatedAgent.status,
    uptime_seconds: Math.floor((Date.now() - updatedAgent.deployed_at.getTime()) / 1000),
    last_activity: updatedAgent.last_activity.toISOString(),
    logs: updatedAgent.logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      message: log.message,
    })),
  });

  logger.info({ agent_id: parsed.agent_id, status: updatedAgent.status }, 'Agent status retrieved');

  return JSON.stringify(response);
}

// Schema for verify_payment (not in original schemas, defining inline)
const VerifyPaymentRequestSchema = z.object({
  payment_id: z.string(),
  tx_hash: z.string(),
});

const VerifyPaymentResponseSchema = z.object({
  payment_id: z.string(),
  tx_hash: z.string(),
  verified: z.boolean(),
  confirmation_status: z.string().optional(),
  timestamp: z.string().datetime(),
});

async function handleVerifyPayment(input: unknown): Promise<string> {
  const parsed = VerifyPaymentRequestSchema.parse(input);

  logger.info({ payment_id: parsed.payment_id, tx_hash: parsed.tx_hash }, 'Verifying payment');

  // Call Helius to verify the transaction
  const isVerified = await verifyHeliusTransaction(parsed.tx_hash);

  // Get detailed status for the response
  const details = await import('../integrations/helius').then(m => m.getTransactionDetails(parsed.tx_hash));

  const response = VerifyPaymentResponseSchema.parse({
    payment_id: parsed.payment_id,
    tx_hash: parsed.tx_hash,
    verified: isVerified,
    confirmation_status: details?.confirmationStatus || 'unknown',
    timestamp: new Date().toISOString(),
  });

  logger.info({
    payment_id: parsed.payment_id,
    tx_hash: parsed.tx_hash,
    verified: isVerified,
  }, `Payment verification ${isVerified ? 'successful' : 'failed'}`);

  return JSON.stringify(response);
}
