/**
 * @clawdrop/treasury — Treasury & DeFi tool bundle
 *
 * Exports MCP-compatible tools:
 *  - stake_sol               (Marinade liquid staking: SOL → mSOL)
 *  - get_staking_positions   (mSOL balance + USD value + yield estimate)
 *  - get_defi_overview       (full portfolio: SOL + tokens + staking)
 *  - get_yield_opportunities (top Solana yield sources with risk ratings)
 */

export { stakeSolTool, getStakingPositionsTool, handleStakeSol, handleGetStakingPositions } from './tools/staking.js';
export { getDefiOverviewTool, handleGetDefiOverview } from './tools/portfolio.js';
export { getYieldOpportunitiesTool, handleGetYieldOpportunities } from './tools/yields.js';

import { stakeSolTool, getStakingPositionsTool, handleStakeSol, handleGetStakingPositions } from './tools/staking.js';
import { getDefiOverviewTool, handleGetDefiOverview } from './tools/portfolio.js';
import { getYieldOpportunitiesTool, handleGetYieldOpportunities } from './tools/yields.js';

export const treasuryTools = [
  stakeSolTool,
  getStakingPositionsTool,
  getDefiOverviewTool,
  getYieldOpportunitiesTool,
];

export async function handleTreasuryTool(
  name: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'stake_sol':
      return handleStakeSol(input);
    case 'get_staking_positions':
      return handleGetStakingPositions(input);
    case 'get_defi_overview':
      return handleGetDefiOverview(input);
    case 'get_yield_opportunities':
      return handleGetYieldOpportunities(input);
    default:
      return { error: `Unknown treasury tool: ${name}` };
  }
}
