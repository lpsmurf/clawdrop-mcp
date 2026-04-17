/**
 * Portfolio tool — get_defi_overview
 *
 * Aggregates SOL balance, key token balances (USDC, USDT, mSOL),
 * prices from Jupiter, and staking yield into a single snapshot.
 */

import axios from 'axios';

const MSOL_MINT = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const SOL_MINT  = 'So11111111111111111111111111111111111111112';
const MSOL_APY  = 7.5;

const TOKEN_META: Record<string, { symbol: string; decimals: number }> = {
  [MSOL_MINT]: { symbol: 'mSOL', decimals: 9 },
  [USDC_MINT]: { symbol: 'USDC', decimals: 6 },
  [USDT_MINT]: { symbol: 'USDT', decimals: 6 },
};

function getRpcUrl(): string {
  return process.env.HELIUS_MAINNET_RPC ?? 'https://api.mainnet-beta.solana.com';
}

function getWallet(): string {
  return (process.env.WALLET_PUBLIC_KEY ?? '').trim();
}

export const getDefiOverviewTool = {
  name: 'get_defi_overview',
  description:
    'Full DeFi portfolio snapshot: SOL balance, USDC/USDT/mSOL token balances, USD values, staking yield estimate, and last-updated timestamp.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      wallet: {
        type: 'string',
        description:
          'Wallet public key to query (defaults to WALLET_PUBLIC_KEY env var)',
      },
    },
    required: [],
  },
};

export async function handleGetDefiOverview(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const wallet = (input.wallet as string | undefined) ?? getWallet();
    if (!wallet) {
      return {
        error:
          'No wallet provided. Pass wallet in input or set WALLET_PUBLIC_KEY env var.',
      };
    }

    const rpcUrl = getRpcUrl();

    // 1. SOL balance
    let sol_balance = 0;
    try {
      const balRes = await axios.post(
        rpcUrl,
        { jsonrpc: '2.0', id: 1, method: 'getBalance', params: [wallet] },
        { timeout: 10000 }
      );
      const lamports = balRes.data?.result?.value ?? 0;
      sol_balance = lamports / 1e9;
    } catch {
      // leave at 0
    }

    // 2. Token balances (USDC, USDT, mSOL)
    const tokenBalances: Record<string, number> = {
      [MSOL_MINT]: 0,
      [USDC_MINT]: 0,
      [USDT_MINT]: 0,
    };

    try {
      const tokenRes = await axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'getTokenAccountsByOwner',
          params: [
            wallet,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
          ],
        },
        { timeout: 12000 }
      );

      const accounts = tokenRes.data?.result?.value ?? [];
      for (const acc of accounts) {
        const info = acc?.account?.data?.parsed?.info;
        const mint: string = info?.mint ?? '';
        if (mint in tokenBalances) {
          tokenBalances[mint] += info?.tokenAmount?.uiAmount ?? 0;
        }
      }
    } catch {
      // leave at 0
    }

    // 3. Prices from Jupiter
    const priceIds = [SOL_MINT, MSOL_MINT, USDC_MINT, USDT_MINT].join(',');
    const prices: Record<string, number> = {};
    try {
      const priceRes = await axios.get(
        `https://price.jup.ag/v6/price?ids=${priceIds}`,
        { timeout: 8000 }
      );
      const data = priceRes.data?.data ?? {};
      for (const [id, entry] of Object.entries(data) as [string, { price?: number }][]) {
        prices[id] = entry?.price ?? 0;
      }
    } catch {
      // prices unavailable
    }

    const sol_price  = prices[SOL_MINT]  ?? 0;
    const msol_price = prices[MSOL_MINT] ?? 0;
    const usdc_price = prices[USDC_MINT] ?? 1;
    const usdt_price = prices[USDT_MINT] ?? 1;

    // 4. Build assets list
    const msol_balance = tokenBalances[MSOL_MINT];
    const usdc_balance = tokenBalances[USDC_MINT];
    const usdt_balance = tokenBalances[USDT_MINT];

    const assets = [
      {
        symbol: 'SOL',
        mint: SOL_MINT,
        balance: parseFloat(sol_balance.toFixed(6)),
        price_usd: parseFloat(sol_price.toFixed(4)),
        value_usd: parseFloat((sol_balance * sol_price).toFixed(2)),
      },
      {
        symbol: 'mSOL',
        mint: MSOL_MINT,
        balance: parseFloat(msol_balance.toFixed(6)),
        price_usd: parseFloat(msol_price.toFixed(4)),
        value_usd: parseFloat((msol_balance * msol_price).toFixed(2)),
      },
      {
        symbol: 'USDC',
        mint: USDC_MINT,
        balance: parseFloat(usdc_balance.toFixed(6)),
        price_usd: parseFloat(usdc_price.toFixed(4)),
        value_usd: parseFloat((usdc_balance * usdc_price).toFixed(2)),
      },
      {
        symbol: 'USDT',
        mint: USDT_MINT,
        balance: parseFloat(usdt_balance.toFixed(6)),
        price_usd: parseFloat(usdt_price.toFixed(4)),
        value_usd: parseFloat((usdt_balance * usdt_price).toFixed(2)),
      },
    ].filter((a) => a.balance > 0 || a.symbol === 'SOL'); // always show SOL

    const total_usd = assets.reduce((sum, a) => sum + a.value_usd, 0);
    const msol_usd_value = msol_balance * msol_price;
    const staking_yield_annual_usd = parseFloat(
      (msol_usd_value * (MSOL_APY / 100)).toFixed(2)
    );

    return {
      wallet,
      total_usd: parseFloat(total_usd.toFixed(2)),
      assets,
      staking_yield_annual_usd,
      apy_percent: MSOL_APY,
      last_updated: new Date().toISOString(),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
