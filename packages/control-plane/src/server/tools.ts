import { Tool } from '@modelcontextprotocol/sdk/types';
import {
  ToolInputSchemas,
  ListTiersOutputSchema,
  QuoteTierOutputSchema,
  DeployAgentOutputSchema,
  GetDeploymentStatusOutputSchema,
  CancelSubscriptionOutputSchema,
} from './schemas';
import { listTiers, getTier, quoteTier } from '../services/tier';
import { verifyPayment } from '../services/payment';
import {
  saveAgent,
  getAgent,
  updateAgentStatus,
  loadFromDisk,
  DeployedAgent,
} from '../db/memory';
import { deployViaHFSP, getHFSPStatus } from '../integrations/hfsp';
import { logger } from '../utils/logger';

// Load persisted state on startup
loadFromDisk();

// ─── Tool definitions (JSON Schema for MCP protocol) ─────────────────────────

export const tools: Tool[] = [
  {
    name: 'list_tiers',
    description:
      'List all available Clawdrop deployment tiers with pricing and capacity info. ' +
      'All tiers include access to solana, research, and treasury capability bundles.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'quote_tier',
    description:
      'Get a price quote for a deployment tier in your chosen payment token ' +
      '(SOL, USDT, USDC, or HERD). Bundles do not affect the price.',
    inputSchema: {
      type: 'object',
      properties: {
        tier_id: {
          type: 'string',
          description: 'Tier to quote: tier_a (Shared), tier_b (Dedicated), tier_c (Custom)',
        },
        payment_token: {
          type: 'string',
          enum: ['SOL', 'USDT', 'USDC', 'HERD'],
          description: 'Token you want to pay with',
          default: 'SOL',
        },
        bundles: {
          type: 'array',
          items: { type: 'string', enum: ['solana', 'research', 'treasury'] },
          description: 'Capability bundles to include (optional, do not affect price)',
          default: [],
        },
      },
      required: ['tier_id'],
    },
  },
  {
    name: 'deploy_agent',
    description:
      'Deploy a new OpenClaw agent after confirming payment. Provide the transaction hash ' +
      'from your Solana wallet. The agent will be provisioned via HFSP with your chosen bundles.',
    inputSchema: {
      type: 'object',
      properties: {
        tier_id: { type: 'string', description: 'Tier to deploy on' },
        agent_name: {
          type: 'string',
          description: 'Display name for your agent (3-64 characters)',
        },
        owner_wallet: {
          type: 'string',
          description: 'Your Solana wallet public key (receives SSH access)',
        },
        payment_token: {
          type: 'string',
          enum: ['SOL', 'USDT', 'USDC', 'HERD'],
          description: 'Token used for payment',
        },
        payment_tx_hash: {
          type: 'string',
          description: 'Transaction signature from your Solana wallet',
        },
        bundles: {
          type: 'array',
          items: { type: 'string', enum: ['solana', 'research', 'treasury'] },
          description: 'Capability bundles to install',
          default: [],
        },
      },
      required: ['tier_id', 'agent_name', 'owner_wallet', 'payment_token', 'payment_tx_hash'],
    },
  },
  {
    name: 'get_deployment_status',
    description: 'Check the status, subscription health, and recent logs of a deployed agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The agent ID returned from deploy_agent',
        },
        owner_wallet: {
          type: 'string',
          description: 'Your Solana wallet public key (proves ownership)',
        },
      },
      required: ['agent_id', 'owner_wallet'],
    },
  },
  {
    name: 'cancel_subscription',
    description:
      'Cancel an active agent subscription. The agent will be stopped immediately. ' +
      'This action is irreversible.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The agent ID to cancel' },
        owner_wallet: {
          type: 'string',
          description: 'Your Solana wallet public key (proves ownership)',
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm — the agent will be stopped permanently',
        },
      },
      required: ['agent_id', 'owner_wallet', 'confirm'],
    },
  },
];

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

export async function handleToolCall(toolName: string, toolInput: unknown): Promise<string> {
  logger.info({ tool: toolName }, 'Tool call received');
  try {
    switch (toolName) {
      case 'list_tiers':          return await handleListTiers(toolInput);
      case 'quote_tier':          return await handleQuoteTier(toolInput);
      case 'deploy_agent':        return await handleDeployAgent(toolInput);
      case 'get_deployment_status': return await handleGetDeploymentStatus(toolInput);
      case 'cancel_subscription': return await handleCancelSubscription(toolInput);
      default: throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    logger.error({ error, tool: toolName }, 'Tool execution failed');
    throw error;
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleListTiers(input: unknown): Promise<string> {
  ToolInputSchemas.list_tiers.parse(input);

  const tiers = listTiers();
  const response = ListTiersOutputSchema.parse({
    tiers: tiers.map(t => ({
      tier_id: t.id,
      name: t.name,
      description: t.description,
      price_usd: t.price_usd,
      vps_type: t.vps_type,
      vps_capacity: t.vps_capacity,
      available_bundles: ['solana', 'research', 'treasury'],
    })),
  });

  return JSON.stringify(response, null, 2);
}

async function handleQuoteTier(input: unknown): Promise<string> {
  const parsed = ToolInputSchemas.quote_tier.parse(input);

  // quoteTier returns { tier, payment: PaymentQuote, bundles_available }
  const tierQuote = await quoteTier(parsed.tier_id, parsed.payment_token);

  const { tier, payment } = tierQuote;

  // Calculate fee_usd from business rule (smart fee: <$100 flat $1, ≥$100 → 0.35%)
  const fee_usd =
    payment.tier_price_usd < 100
      ? 1.0
      : parseFloat((payment.tier_price_usd * 0.0035).toFixed(2));

  const fee_breakdown =
    payment.tier_price_usd < 100
      ? 'Flat fee: $1.00 (transactions under $100)'
      : `0.35% swap fee: $${fee_usd.toFixed(2)} (on $${payment.tier_price_usd.toFixed(2)})`;

  const response = QuoteTierOutputSchema.parse({
    tier_id: tier.id,
    tier_name: tier.name,
    price_usd: payment.tier_price_usd,
    price_in_token: payment.amount_to_send,
    payment_token: parsed.payment_token,
    fee_usd,
    fee_breakdown,
    bundles_included: parsed.bundles,
    quote_expires_at: payment.expires_at.toISOString(),
  });

  return JSON.stringify(response, null, 2);
}

async function handleDeployAgent(input: unknown): Promise<string> {
  const parsed = ToolInputSchemas.deploy_agent.parse(input);

  // 1. Verify payment on-chain (stub → real Helius in Phase 2)
  const verified = await verifyPayment(parsed.payment_tx_hash);
  if (!verified) {
    throw new Error(
      `Payment not verified: tx ${parsed.payment_tx_hash} — ` +
        'ensure the transaction is confirmed on Solana devnet'
    );
  }

  // 2. Get tier info
  const tier = getTier(parsed.tier_id);
  if (!tier) throw new Error(`Tier not found: ${parsed.tier_id}`);

  // 3. Deploy via HFSP
  const agent_id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payment_id = `pay_${Date.now()}`;

  const hfspResp = await deployViaHFSP({
    deployment_id: agent_id,
    tier_id: parsed.tier_id,
    region: 'eu-west',
    capability_bundle: parsed.bundles.join(',') || 'none',
    payment_verified: true,
    wallet_address: parsed.owner_wallet,
    config: {
      agent_name: parsed.agent_name,
      installed_bundles: parsed.bundles,
    },
  });

  if (hfspResp.error) {
    throw new Error(`HFSP provisioning failed: ${hfspResp.error}`);
  }

  // 4. Persist to DB
  const now = new Date();
  const nextPayment = new Date(now);
  nextPayment.setDate(nextPayment.getDate() + 30);

  const agent: DeployedAgent = {
    agent_id: hfspResp.agent_id,
    tier_id: parsed.tier_id,
    agent_name: parsed.agent_name,
    owner_wallet: parsed.owner_wallet,
    bundles: parsed.bundles as DeployedAgent['bundles'],
    status: 'provisioning',
    console_url: hfspResp.endpoint,
    deployed_at: now,
    last_activity: now,
    subscription: {
      tier_id: parsed.tier_id,
      amount_usd: tier.price_usd,
      payment_token: parsed.payment_token,
      started_at: now,
      next_payment_due: nextPayment,
      grace_period_end: null,
      payment_history: [
        {
          payment_id,
          amount: tier.price_sol,
          token: parsed.payment_token,
          tx_hash: parsed.payment_tx_hash,
          timestamp: now,
          fee_charged_usd: tier.price_usd < 100 ? 1.0 : tier.price_usd * 0.0035,
          jupiter_swap: parsed.payment_token !== 'SOL',
        },
      ],
    },
    logs: [
      {
        timestamp: now,
        level: 'info',
        message: `Provisioning started. Tier: ${parsed.tier_id}. Bundles: ${
          parsed.bundles.join(', ') || 'none'
        }`,
      },
    ],
  };

  saveAgent(agent);

  logger.info(
    { agent_id: agent.agent_id, tier_id: parsed.tier_id, bundles: parsed.bundles },
    'Agent deployed'
  );

  const response = DeployAgentOutputSchema.parse({
    agent_id: agent.agent_id,
    agent_name: parsed.agent_name,
    tier_id: parsed.tier_id,
    status: 'provisioning',
    bundles: parsed.bundles,
    deployed_at: now.toISOString(),
    next_payment_due: nextPayment.toISOString(),
    console_url: hfspResp.endpoint,
    message:
      `Agent "${parsed.agent_name}" is being provisioned on ${tier.name}. ` +
      `SSH access at ${hfspResp.endpoint ?? 'your VPS IP'} once running. ` +
      `Next payment due: ${nextPayment.toLocaleDateString()}.`,
  });

  return JSON.stringify(response, null, 2);
}

async function handleGetDeploymentStatus(input: unknown): Promise<string> {
  const parsed = ToolInputSchemas.get_deployment_status.parse(input);

  const agent = getAgent(parsed.agent_id);
  if (!agent) throw new Error(`Agent not found: ${parsed.agent_id}`);

  // Ownership check — prevents IDOR
  if (agent.owner_wallet !== parsed.owner_wallet) {
    throw new Error('Unauthorized: wallet does not match agent owner');
  }

  // Poll HFSP for live status
  const hfspStatus = await getHFSPStatus(parsed.agent_id);
  if (!hfspStatus.error && hfspStatus.status) {
    updateAgentStatus(parsed.agent_id, hfspStatus.status as DeployedAgent['status']);
  }

  const fresh = getAgent(parsed.agent_id)!;
  const uptimeSeconds = Math.floor((Date.now() - fresh.deployed_at.getTime()) / 1000);

  const response = GetDeploymentStatusOutputSchema.parse({
    agent_id: fresh.agent_id,
    agent_name: fresh.agent_name,
    tier_id: fresh.tier_id,
    status: fresh.status,
    bundles: fresh.bundles,
    vps_ip: fresh.vps_ip,
    console_url: fresh.console_url,
    uptime_seconds: uptimeSeconds,
    last_activity: fresh.last_activity.toISOString(),
    subscription: {
      next_payment_due: fresh.subscription.next_payment_due.toISOString(),
      grace_period_end: fresh.subscription.grace_period_end?.toISOString() ?? null,
      amount_usd: fresh.subscription.amount_usd,
      payment_token: fresh.subscription.payment_token,
      payments_made: fresh.subscription.payment_history.length,
    },
    recent_logs: fresh.logs.slice(-10).map(l => ({
      timestamp: l.timestamp.toISOString(),
      level: l.level,
      message: l.message,
    })),
  });

  return JSON.stringify(response, null, 2);
}

async function handleCancelSubscription(input: unknown): Promise<string> {
  const parsed = ToolInputSchemas.cancel_subscription.parse(input);

  if (!parsed.confirm) {
    throw new Error('Cancellation requires confirm: true');
  }

  const agent = getAgent(parsed.agent_id);
  if (!agent) throw new Error(`Agent not found: ${parsed.agent_id}`);

  // Ownership check — prevents IDOR
  if (agent.owner_wallet !== parsed.owner_wallet) {
    throw new Error('Unauthorized: wallet does not match agent owner');
  }

  if (agent.status === 'stopped') {
    throw new Error(`Agent ${parsed.agent_id} is already stopped`);
  }

  updateAgentStatus(parsed.agent_id, 'stopped');
  // TODO Phase 2: call HFSP to tear down the container/VPS

  logger.info({ agent_id: parsed.agent_id }, 'Agent subscription cancelled');

  const response = CancelSubscriptionOutputSchema.parse({
    agent_id: parsed.agent_id,
    status: 'stopped',
    message:
      `Agent "${agent.agent_name}" has been stopped and subscription cancelled. ` +
      'Your VPS will be decommissioned shortly.',
    stopped_at: new Date().toISOString(),
  });

  return JSON.stringify(response, null, 2);
}
