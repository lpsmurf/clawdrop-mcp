/**
 * DexScreener tools for the research bundle
 *
 * Three tools using the free DexScreener API (no auth required):
 *  - get_token_info    — token price, volume, liquidity, socials
 *  - get_trending_tokens — top boosted tokens right now
 *  - search_token      — search pairs by symbol/name
 */

import axios from 'axios';

const BASE = 'https://api.dexscreener.com';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const dexscreenerTools = [
  {
    name: 'get_token_info',
    description:
      'Get real-time token data from DexScreener: price, 24h change, volume, liquidity, market cap, DEX, chain, and social links.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        address: {
          type: 'string',
          description: 'Token mint address (Solana) or contract address (EVM)',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_trending_tokens',
    description: 'Get top trending/boosted tokens on DexScreener right now',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'search_token',
    description:
      'Search DexScreener for tokens/pairs by symbol or name. Returns top 5 matching pairs with price and liquidity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Token symbol or name to search (e.g. "SOL", "bonk", "WIF")',
        },
      },
      required: ['query'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleGetTokenInfo(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const address = input['address'] as string;
    if (!address) return { error: 'address is required' };

    const res = await axios.get(`${BASE}/latest/dex/tokens/${address}`, { timeout: 10000 });
    const pairs: any[] = res.data?.pairs ?? [];

    if (pairs.length === 0) {
      return { error: `No pairs found for address: ${address}` };
    }

    // Take the pair with highest liquidity as the canonical one
    const pair = pairs.sort(
      (a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];

    const ageHours = pair.pairCreatedAt
      ? Math.round((Date.now() - pair.pairCreatedAt) / 3_600_000)
      : null;

    return {
      symbol: pair.baseToken?.symbol ?? null,
      name: pair.baseToken?.name ?? null,
      price_usd: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
      price_change_24h: pair.priceChange?.h24 ?? null,
      volume_24h_usd: pair.volume?.h24 ?? null,
      liquidity_usd: pair.liquidity?.usd ?? null,
      market_cap_usd: pair.marketCap ?? null,
      dex: pair.dexId ?? null,
      chain: pair.chainId ?? null,
      pair_address: pair.pairAddress ?? null,
      age_hours: ageHours,
      socials: pair.info?.socials ?? [],
    };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to fetch token info' };
  }
}

export async function handleGetTrendingTokens(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const res = await axios.get(`${BASE}/token-boosts/top/v1`, { timeout: 10000 });
    const boosts: any[] = res.data ?? [];

    const top10 = boosts.slice(0, 10).map((b: any) => ({
      symbol: b.tokenAddress ?? null,   // boosts endpoint may not include symbol
      chain: b.chainId ?? null,
      address: b.tokenAddress ?? null,
      boost_amount: b.amount ?? b.totalAmount ?? null,
      socials: b.links ?? [],
      url: b.url ?? null,
    }));

    return { trending: top10, count: top10.length };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to fetch trending tokens' };
  }
}

export async function handleSearchToken(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const query = input['query'] as string;
    if (!query) return { error: 'query is required' };

    const res = await axios.get(`${BASE}/latest/dex/search`, {
      params: { q: query },
      timeout: 10000,
    });
    const pairs: any[] = res.data?.pairs ?? [];

    const top5 = pairs.slice(0, 5).map((p: any) => ({
      symbol: p.baseToken?.symbol ?? null,
      name: p.baseToken?.name ?? null,
      chain: p.chainId ?? null,
      dex: p.dexId ?? null,
      price_usd: p.priceUsd ? parseFloat(p.priceUsd) : null,
      volume_24h: p.volume?.h24 ?? null,
      liquidity: p.liquidity?.usd ?? null,
      pair_address: p.pairAddress ?? null,
    }));

    return { results: top5, count: top5.length, query };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to search token' };
  }
}
