/**
 * Birdeye API Client
 * HTTP wrapper with retry logic and caching
 */
import axios from 'axios';
import { pino } from 'pino';

const logger = pino({ name: 'birdeye-api' });

const API_KEY = process.env.BIRDEYE_API_KEY!;
const BASE_URL = 'https://api.birdeye.so/v1';

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

export async function getTokenMeta(mint: string) {
  const res = await api.get(`/token/meta?address=${mint}`);
  return res.data;
}

export async function getTokenPrice(mint: string) {
  const res = await api.get(`/token/price?address=${mint}`);
  return res.data;
}

export async function getTokenOverview(mint: string) {
  const res = await api.get(`/token/overview?address=${mint}`);
  return res.data;
}

export async function getTrendingTokens() {
  const res = await api.get('/defi/trending');
  return res.data;
}

export async function getWalletTokens(wallet: string) {
  const res = await api.get(`/wallet/token_list?wallet=${wallet}`);
  return res.data;
}
