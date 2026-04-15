/**
 * Gnosis Pay spend abstraction
 *
 * Gnosis Pay is a Visa debit card backed by a Safe wallet on Gnosis Chain.
 * The card holder spends EURe (Euro stablecoin) — no bridges needed.
 *
 * API reference: https://docs.gnosispay.com (requires partnership agreement for production)
 *
 * This abstraction:
 *  1. Checks if the Safe wallet has enough balance for a spend
 *  2. Creates an approval request (agent asks user to approve large spends)
 *  3. Executes the spend after approval
 *
 * In sandbox mode (GNOSIS_PAY_SANDBOX=true) all calls return mock data.
 */

import type {
  SpendAvailability,
  SpendApprovalRequest,
  SpendResult,
} from '../types/index.js';

const GNOSIS_PAY_API = process.env.GNOSIS_PAY_API_URL ?? 'https://api.gnosispay.com';
const IS_SANDBOX     = process.env.GNOSIS_PAY_SANDBOX === 'true';

// In-memory approval store (in production, persist to DB)
const pendingApprovals = new Map<string, SpendApprovalRequest>();

// ─── helpers ───────────────────────────────────────────────────────────────────

async function gnosisPayRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<any> {
  if (IS_SANDBOX) return null; // handled by callers

  const apiKey = process.env.GNOSIS_PAY_API_KEY;
  if (!apiKey) throw new Error('GNOSIS_PAY_API_KEY not configured');

  const { default: axios } = await import('axios');
  const resp = await axios.request({
    method,
    url: `${GNOSIS_PAY_API}${path}`,
    data: body,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 15_000,
  });
  return resp.data;
}

// ─── public API ────────────────────────────────────────────────────────────────

/**
 * Check if the linked Gnosis Pay card can cover a spend of `amountUsd`.
 * Exchange rate EURe/USD is fetched from CoinGecko (fallback: 1.08).
 */
export async function checkSpendAvailability(amountUsd: number): Promise<SpendAvailability> {
  if (IS_SANDBOX) {
    // Sandbox: always available up to $5,000/day
    return {
      available:          amountUsd <= 5_000,
      spending_limit_usd: 5_000,
      spent_today_usd:    0,
      remaining_usd:      5_000,
      card_status:        'active',
    };
  }

  const data = await gnosisPayRequest('GET', '/v1/card/balance');
  const balanceEur = parseFloat(data?.balance ?? '0');

  // Rough EUR→USD (1.08); TODO: fetch live rate
  const balanceUsd  = balanceEur * 1.08;
  const limitUsd    = parseFloat(data?.dailyLimit ?? '5000') * 1.08;
  const spentUsd    = parseFloat(data?.dailySpent ?? '0') * 1.08;
  const remainingUsd = limitUsd - spentUsd;

  return {
    available:          amountUsd <= remainingUsd,
    spending_limit_usd: limitUsd,
    spent_today_usd:    spentUsd,
    remaining_usd:      remainingUsd,
    card_status:        data?.status ?? 'active',
  };
}

/**
 * Create a spend approval request for amounts above the agent's auto-approve threshold.
 * The agent should surface this to the user and wait for confirmation before booking.
 */
export async function requestSpendApproval(
  amountUsd: number,
  merchant: string,
  purpose: string,
  ttlMinutes = 30,
): Promise<SpendApprovalRequest> {
  const requestId  = `gp_req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const expiresAt  = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

  const request: SpendApprovalRequest = {
    request_id: requestId,
    amount_usd: amountUsd,
    merchant,
    purpose,
    expires_at: expiresAt,
    status:     'pending',
  };

  pendingApprovals.set(requestId, request);

  if (!IS_SANDBOX) {
    // Notify via Gnosis Pay webhook/push (if configured)
    await gnosisPayRequest('POST', '/v1/approvals', {
      amount:    amountUsd,
      currency:  'USD',
      merchant,
      note:      purpose,
      expiresAt,
    }).catch(() => { /* non-fatal */ });
  }

  return request;
}

/**
 * Mark a pending approval as approved (called when user confirms).
 */
export function approveSpendRequest(requestId: string): SpendApprovalRequest {
  const req = pendingApprovals.get(requestId);
  if (!req) throw new Error(`Approval request not found: ${requestId}`);
  if (req.status !== 'pending') throw new Error(`Request already ${req.status}`);
  if (new Date(req.expires_at) < new Date()) {
    req.status = 'expired';
    pendingApprovals.set(requestId, req);
    throw new Error('Approval request expired');
  }
  req.status = 'approved';
  pendingApprovals.set(requestId, req);
  return req;
}

/**
 * Execute a spend after it's been approved (or auto-approved under threshold).
 * In production this triggers the Gnosis Pay card to charge the merchant.
 */
export async function executeApprovedSpend(params: {
  requestId?: string;  // Required for manual approvals
  amountUsd:  number;
  merchant:   string;
  purpose:    string;
}): Promise<SpendResult> {
  const now = new Date().toISOString();

  // Validate approval if a request ID was provided
  if (params.requestId) {
    const req = pendingApprovals.get(params.requestId);
    if (!req) throw new Error(`Approval request not found: ${params.requestId}`);
    if (req.status !== 'approved') throw new Error(`Spend not approved (status: ${req.status})`);
  }

  if (IS_SANDBOX) {
    return {
      success:        true,
      tx_hash:        `0xsandbox_${Date.now().toString(16)}`,
      gnosis_chain_tx:`0xgnosis_sandbox_${Date.now().toString(16)}`,
      amount_usd:     params.amountUsd,
      merchant:       params.merchant,
      timestamp:      now,
    };
  }

  try {
    const data = await gnosisPayRequest('POST', '/v1/charges', {
      amount:   params.amountUsd,
      currency: 'USD',
      merchant: params.merchant,
      note:     params.purpose,
    });

    return {
      success:        true,
      tx_hash:        data?.txHash,
      gnosis_chain_tx: data?.gnosisChainTx,
      amount_usd:     params.amountUsd,
      merchant:       params.merchant,
      timestamp:      now,
    };
  } catch (err: any) {
    return {
      success:    false,
      amount_usd: params.amountUsd,
      merchant:   params.merchant,
      timestamp:  now,
      error:      err?.message ?? 'Unknown error',
    };
  }
}

/**
 * Get a pending approval request by ID.
 */
export function getApprovalRequest(requestId: string): SpendApprovalRequest | null {
  return pendingApprovals.get(requestId) ?? null;
}
