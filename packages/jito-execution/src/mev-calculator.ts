/**
 * MEV Tip Calculator
 */

export function calculateMevTip(swapAmountUsd: number): number {
  // Formula: max(1000, floor(amount_usd * 0.001 * 2_000_000_000))
  // $10,000 → ~20,000 lamports (~$0.005)
  // $100,000 → ~200,000 lamports (~$0.05)
  // Min tip: 1,000 lamports (~$0.00025)
  const minTip = 1000;
  const calculatedTip = Math.floor(swapAmountUsd * 0.001 * 2_000_000_000);
  return Math.max(minTip, calculatedTip);
}

export function shouldUseJito(swapAmountUsd: number): boolean {
  const threshold = parseInt(process.env.JITO_MIN_SWAP_USD || '5000');
  return swapAmountUsd >= threshold;
}
