/**
 * DD.xyz Risk Scoring Types
 */

export type RiskTier = 'GREEN' | 'YELLOW' | 'RED';

export interface TokenRisk {
  mint: string;
  tier: RiskTier;
  confidence: number;  // 0-100
  flags: string[];     // e.g., ["no_audit", "high_concentration"]
  reasoning: string;
  recommendation: 'proceed' | 'caution' | 'block';
}

export interface PolicyDecision {
  action: 'swap' | 'send' | 'stake';
  token_mint: string;
  risk_tier: RiskTier;
  decision: 'allowed' | 'warned' | 'blocked';
  reason_if_blocked?: string;
  warning_message?: string;
}

export interface RiskConfig {
  policy: 'strict' | 'normal' | 'permissive';
  whitelist: string[];  // mint addresses
}
