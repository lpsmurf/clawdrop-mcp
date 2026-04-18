/**
 * Risk Policy Engine
 */
import type { TokenRisk, PolicyDecision, RiskTier, RiskConfig } from './types.js';
import { assessTokenRisk } from './dd-xyz-client.js';

const WHITELIST = (process.env.WHITELIST_TOKENS || '')
  .split(',')
  .filter(Boolean);

const POLICY = process.env.RISK_POLICY || 'normal';

export async function executeWithRiskCheck(
  action: 'swap' | 'send' | 'stake',
  tokenMint: string,
  amount: number
): Promise<PolicyDecision> {
  // Check whitelist first
  if (WHITELIST.includes(tokenMint)) {
    return {
      action,
      token_mint: tokenMint,
      risk_tier: 'GREEN',
      decision: 'allowed',
    };
  }
  
  const risk = await assessTokenRisk(tokenMint);
  
  if (risk.tier === 'GREEN') {
    return {
      action,
      token_mint: tokenMint,
      risk_tier: 'GREEN',
      decision: 'allowed',
    };
  }
  
  if (risk.tier === 'YELLOW') {
    const strictMode = POLICY === 'strict';
    return {
      action,
      token_mint: tokenMint,
      risk_tier: 'YELLOW',
      decision: strictMode ? 'blocked' : 'warned',
      warning_message: strictMode 
        ? `Blocked: ${risk.reasoning}` 
        : `⚠️ Caution: ${risk.reasoning}`,
      reason_if_blocked: strictMode ? risk.reasoning : undefined,
    };
  }
  
  // RED tier - always block
  return {
    action,
    token_mint: tokenMint,
    risk_tier: 'RED',
    decision: 'blocked',
    reason_if_blocked: `🚫 Blocked for safety: ${risk.reasoning}`,
  };
}

export function getRiskEmoji(tier: RiskTier): string {
  switch (tier) {
    case 'GREEN': return '🟢';
    case 'YELLOW': return '🟡';
    case 'RED': return '🔴';
  }
}
