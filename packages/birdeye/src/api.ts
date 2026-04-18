/**
 * Birdeye API Client
 * HTTP wrapper with retry logic and caching
 * Updated to v3 API per Context7 documentation
 */
import axios from 'axios';
import { pino } from 'pino';

const logger = pino({ name: 'birdeye-api' });

const API_KEY = process.env.BIRDEYE_API_KEY!;
const BASE_URL = 'https://public-api.birdeye.so';

if (!API_KEY) {
  throw new Error('BIRDEYE_API_KEY env var required');
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-KEY': API_KEY,
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Retry on 521 errors (Cloudflare overload)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (!config || !config.retry) {
      config.retry = 0;
    }
    if (err.response?.status === 521 && config.retry < 3) {
      config.retry++;
      const delay = Math.pow(2, config.retry) * 1000;
      logger.warn({ retry: config.retry, delay }, 'Retrying Birdeye API (521 error)');
      await new Promise(r => setTimeout(r, delay));
      return api(config);
    }
    return Promise.reject(err);
  }
);

// v3 API endpoints per Context7 docs
export async function getTokenMeta(mint: string) {
  // GET /defi/v3/token/meta-data/single?tokenAddress={mint}
  const res = await api.get(`/defi/v3/token/meta-data/single?tokenAddress=${mint}`);
  return res.data?.data || res.data;
}

export async function getTokenPrice(mint: string) {
  // GET /defi/price?token_address={mint}&chain=solana
  const res = await api.get(`/defi/price?token_address=${mint}&chain=solana`);
  return res.data;
}

export async function getTokenOverview(mint: string) {
  // v3 uses same meta-data endpoint
  const res = await api.get(`/defi/v3/token/meta-data/single?tokenAddress=${mint}`);
  return res.data?.data || res.data;
}

export async function getTrendingTokens() {
  // GET /defi/token_trending?limit=10
  const res = await api.get('/defi/token_trending?limit=10');
  return res.data?.data || res.data;
}

export async function getWalletTokens(wallet: string) {
  // GET /v1/wallet/token_list?address={wallet}
  const res = await api.get(`/v1/wallet/token_list?address=${wallet}`);
  return res.data?.data || res.data;
}
