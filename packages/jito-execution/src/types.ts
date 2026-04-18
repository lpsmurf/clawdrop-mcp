/**
 * Jito MEV Bundle Types
 */

export interface JitoBundle {
  transactions: string[];  // base64-encoded transactions
  skipPreflightValidation: boolean;
}

export interface BundleResult {
  bundle_id: string;
  status: 'pending' | 'landed' | 'failed' | 'expired';
  slot?: number;
  timestamp?: number;
  mev_tip_lamports: number;
}

export interface SwapWithJito {
  swap_tx: string;
  follow_up_tx?: string;
  mev_tip_lamports: number;
}

export interface MevConfig {
  min_swap_usd: number;
  tip_bps: number;  // basis points for tip calculation
}
