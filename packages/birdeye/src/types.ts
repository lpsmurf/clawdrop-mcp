/**
 * Birdeye API Types
 */

export interface TokenMeta {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logo_uri?: string;
  supply: number;
  holder_count: number;
  market_cap?: number;
}

export interface TokenPrice {
  mint: string;
  price_usd: number;
  price_change_24h: number;
  price_change_5m?: number;
  price_change_1h?: number;
  high_24h?: number;
  low_24h?: number;
}

export interface TokenOverview {
  mint: string;
  volume_24h: number;
  liquidity: number;
  num_markets: number;
  num_holders: number;
}

export interface TrendingToken {
  mint: string;
  symbol: string;
  name: string;
  price_usd: number;
  price_change_24h: number;
  volume_24h: number;
}

export interface WalletToken {
  mint: string;
  symbol: string;
  balance: number;
  value_usd: number;
}

export interface TokenAnalytics {
  mint: string;
  symbol: string;
  name: string;
  price_usd: number;
  price_change_24h: number;
  market_cap?: number;
  liquidity?: number;
  holder_count?: number;
  volume_24h?: number;
}

export interface WalletAnalytics {
  wallet: string;
  total_value_usd: number;
  holdings: Array<{
    mint: string;
    symbol: string;
    balance: number;
    value_usd: number;
    percentage_of_portfolio: number;
  }>;
}
