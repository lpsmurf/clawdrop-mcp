/**
 * Yield opportunities tool — get_yield_opportunities
 *
 * Returns top Solana DeFi yield opportunities.
 * Primary sources: Marinade mSOL (hardcoded) + Jupiter stats API.
 * Falls back gracefully if the Jupiter API is unavailable.
 */

import axios from 'axios';

export interface YieldOpportunity {
  name: string;
  protocol: string;
  apy_percent: number;
  tvl_usd: number;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
}

const MARINADE_OPPORTUNITY: YieldOpportunity = {
  name: 'Marinade mSOL Staking',
  protocol: 'Marinade Finance',
  apy_percent: 7.5,
  tvl_usd: 1_200_000_000,
  risk_level: 'low',
  description:
    'Liquid staking — receive mSOL, unstake anytime. Backed by 450+ validators. No lock-up period.',
};

function riskFromTvl(tvl_usd: number): 'low' | 'medium' | 'high' {
  if (tvl_usd >= 100_000_000) return 'low';
  if (tvl_usd >= 10_000_000) return 'medium';
  return 'high';
}

export const getYieldOpportunitiesTool = {
  name: 'get_yield_opportunities',
  description:
    'Fetch top Solana DeFi yield opportunities with APY, TVL, risk rating, and protocol details. Includes Marinade mSOL staking and top Jupiter liquidity pools.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      min_apy: {
        type: 'number',
        description: 'Minimum APY percent to include (default: 5)',
      },
      limit: {
        type: 'number',
        description: 'Max number of opportunities to return (default: 5)',
      },
    },
    required: [],
  },
};

export async function handleGetYieldOpportunities(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const min_apy = (input.min_apy as number | undefined) ?? 5;
    const limit   = Math.min((input.limit as number | undefined) ?? 5, 20);

    const opportunities: YieldOpportunity[] = [MARINADE_OPPORTUNITY];
    let jupiter_note: string | undefined;

    // Attempt to fetch Jupiter pools
    try {
      const res = await axios.get(
        'https://stats.jup.ag/pools?sortBy=apy&limit=10',
        { timeout: 10000 }
      );

      const pools: Array<Record<string, unknown>> = Array.isArray(res.data)
        ? res.data
        : (res.data?.pools ?? []);

      for (const pool of pools) {
        const apy = (pool.apy ?? pool.apr ?? pool.apy_percent ?? 0) as number;
        const tvl = (pool.tvl ?? pool.tvl_usd ?? pool.liquidity ?? 0) as number;
        const name = (pool.name ?? pool.pair ?? pool.pool_name ?? 'Unknown Pool') as string;
        const protocol = (pool.protocol ?? pool.dex ?? 'Jupiter') as string;

        if (apy < min_apy) continue;
        // Skip duplicates (Marinade already included)
        if (name.toLowerCase().includes('marinade')) continue;

        opportunities.push({
          name: String(name),
          protocol: String(protocol),
          apy_percent: parseFloat(Number(apy).toFixed(2)),
          tvl_usd: parseFloat(Number(tvl).toFixed(0)),
          risk_level: riskFromTvl(Number(tvl)),
          description: `Liquidity pool on ${String(protocol)}`,
        });
      }
    } catch (jupErr) {
      jupiter_note =
        'Jupiter stats API unavailable — showing Marinade data only. ' +
        (jupErr instanceof Error ? jupErr.message : String(jupErr));
    }

    // Filter and sort by APY descending, cap at limit
    const filtered = opportunities
      .filter((o) => o.apy_percent >= min_apy)
      .sort((a, b) => b.apy_percent - a.apy_percent)
      .slice(0, limit);

    const result: Record<string, unknown> = {
      opportunities: filtered,
      count: filtered.length,
      fetched_at: new Date().toISOString(),
    };

    if (jupiter_note) {
      result.note = jupiter_note;
    }

    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
