import {
  getTokenMeta,
  getTokenPrice,
  getTokenOverview,
  getTrendingTokens,
  getWalletTokens,
} from '../api.js';
import { cache, CACHE_TTL } from '../cache.js';
import type { TokenAnalytics, WalletAnalytics } from '../types.js';

export async function handleToolCall(
  toolName: string, 
  input: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'get_token_analytics':
      return getTokenAnalytics(input);
    case 'get_market_overview':
      return getMarketOverview(input);
    case 'get_wallet_analytics':
      return getWalletAnalytics(input);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function getTokenAnalytics(input: Record<string, unknown>): Promise<string> {
  const mint = input.mint as string;
  const cacheKey = `token:${mint}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.stringify(cached, null, 2);
  }

  // Fetch from API
  const [meta, price, overview] = await Promise.all([
    getTokenMeta(mint).catch(() => null),
    getTokenPrice(mint).catch(() => null),
    getTokenOverview(mint).catch(() => null),
  ]);

  const result: TokenAnalytics = {
    mint,
    symbol: meta?.symbol || 'UNKNOWN',
    name: meta?.name || 'Unknown Token',
    price_usd: price?.price_usd || 0,
    price_change_24h: price?.price_change_24h || 0,
    market_cap: meta?.market_cap,
    liquidity: overview?.liquidity,
    holder_count: meta?.holder_count || overview?.num_holders,
    volume_24h: overview?.volume_24h,
  };

  // Cache result
  cache.set(cacheKey, result, CACHE_TTL.PRICE);

  return JSON.stringify(result, null, 2);
}

async function getMarketOverview(_input: Record<string, unknown>): Promise<string> {
  const cacheKey = 'trending';
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.stringify(cached, null, 2);
  }

  // Fetch from API
  const data = await getTrendingTokens();
  
  // Format top 10
  const trending = (data?.tokens || data || []).slice(0, 10).map((t: any) => ({
    mint: t.address || t.mint,
    symbol: t.symbol,
    name: t.name,
    price_usd: t.price_usd || t.price,
    price_change_24h: t.price_change_24h || t.change24h,
    volume_24h: t.volume_24h || t.volume,
  }));

  const result = {
    count: trending.length,
    tokens: trending,
    updated_at: new Date().toISOString(),
  };

  // Cache result
  cache.set(cacheKey, result, CACHE_TTL.TRENDING);

  return JSON.stringify(result, null, 2);
}

async function getWalletAnalytics(input: Record<string, unknown>): Promise<string> {
  const wallet = input.wallet as string;
  const cacheKey = `wallet:${wallet}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.stringify(cached, null, 2);
  }

  // Fetch wallet tokens
  const data = await getWalletTokens(wallet);
  const tokens = data?.items || data?.tokens || data || [];

  // Calculate total value
  let totalValue = 0;
  const holdings = [];

  for (const token of tokens) {
    const value = token.value_usd || token.valueUsd || 0;
    totalValue += value;
    holdings.push({
      mint: token.address || token.mint,
      symbol: token.symbol || 'UNKNOWN',
      balance: token.ui_amount || token.balance || 0,
      value_usd: value,
      percentage_of_portfolio: 0, // Will calculate after total
    });
  }

  // Calculate percentages
  for (const h of holdings) {
    h.percentage_of_portfolio = totalValue > 0 
      ? Math.round((h.value_usd / totalValue) * 100 * 100) / 100 
      : 0;
  }

  // Sort by value
  holdings.sort((a, b) => b.value_usd - a.value_usd);

  const result: WalletAnalytics = {
    wallet,
    total_value_usd: totalValue,
    holdings,
  };

  // Cache result
  cache.set(cacheKey, result, CACHE_TTL.WALLET);

  return JSON.stringify(result, null, 2);
}
