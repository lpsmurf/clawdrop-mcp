/**
 * Staking tools — stake_sol and get_staking_positions
 *
 * stake_sol: Marinade Finance liquid staking via SOL→mSOL (Jupiter swap model).
 * get_staking_positions: Fetch mSOL balance via Helius RPC + Jupiter price API.
 */

import axios from 'axios';

const MSOL_MINT = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';
const MSOL_APY = 7.5;

function getRpcUrl(): string {
  return process.env.HELIUS_MAINNET_RPC ?? 'https://api.mainnet-beta.solana.com';
}

function getWallet(): string {
  return (process.env.WALLET_PUBLIC_KEY ?? '').trim();
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const stakeSolTool = {
  name: 'stake_sol',
  description:
    'Stake SOL via Marinade Finance liquid staking (SOL→mSOL). Returns the amount staked, estimated mSOL received, current APY, and a mock transaction hash.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount_sol: {
        type: 'number',
        description: 'Amount of SOL to stake (must be > 0)',
      },
    },
    required: ['amount_sol'],
  },
};

export const getStakingPositionsTool = {
  name: 'get_staking_positions',
  description:
    'Fetch current mSOL staking positions for the configured wallet. Returns mSOL balance, price in SOL, SOL/USD values, and estimated annual yield.',
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

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleStakeSol(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const amount_sol = input.amount_sol as number;
    if (!amount_sol || amount_sol <= 0) {
      return { error: 'amount_sol must be a positive number' };
    }

    // Fetch mSOL/SOL price from Jupiter to calculate mSOL received
    let msol_price_sol = 1.05; // sensible default if price fetch fails
    try {
      const priceRes = await axios.get(
        `https://price.jup.ag/v6/price?ids=${MSOL_MINT}`,
        { timeout: 8000 }
      );
      const priceData = priceRes.data?.data?.[MSOL_MINT];
      if (priceData?.price) {
        // Jupiter returns price of mSOL in USD; we need mSOL price in SOL terms
        // We'll also fetch SOL price and compute the ratio
        const solRes = await axios.get(
          'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112',
          { timeout: 8000 }
        );
        const solPrice = solRes.data?.data?.['So11111111111111111111111111111111111111112']?.price;
        if (solPrice && priceData.price) {
          msol_price_sol = priceData.price / solPrice;
        }
      }
    } catch {
      // use default
    }

    // mSOL received = SOL / mSOL_price_in_SOL
    const msol_received = amount_sol / msol_price_sol;

    return {
      action: 'stake_sol',
      amount_staked_sol: amount_sol,
      msol_received: parseFloat(msol_received.toFixed(6)),
      msol_mint: MSOL_MINT,
      current_apy_percent: MSOL_APY,
      estimated_annual_yield_sol: parseFloat((amount_sol * (MSOL_APY / 100)).toFixed(6)),
      tx_hash: 'MOCK_TX_HASH — integrate Jupiter swap SDK for live execution',
      note:
        'In production this executes a SOL→mSOL swap via Jupiter. Tx hash is mocked; connect a wallet signer to submit.',
      protocol: 'Marinade Finance',
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function handleGetStakingPositions(
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

    // Fetch mSOL token accounts
    const rpcRes = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          wallet,
          { mint: MSOL_MINT },
          { encoding: 'jsonParsed' },
        ],
      },
      { timeout: 12000 }
    );

    const accounts = rpcRes.data?.result?.value ?? [];
    let msol_balance = 0;
    for (const acc of accounts) {
      const amount = acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      msol_balance += amount;
    }

    // Fetch prices from Jupiter
    let msol_price_usd = 0;
    let sol_price_usd = 0;
    let msol_price_sol = 0;
    try {
      const priceRes = await axios.get(
        `https://price.jup.ag/v6/price?ids=${MSOL_MINT},So11111111111111111111111111111111111111112`,
        { timeout: 8000 }
      );
      const data = priceRes.data?.data ?? {};
      msol_price_usd = data[MSOL_MINT]?.price ?? 0;
      sol_price_usd =
        data['So11111111111111111111111111111111111111112']?.price ?? 0;
      if (sol_price_usd > 0) {
        msol_price_sol = msol_price_usd / sol_price_usd;
      }
    } catch {
      // prices unavailable
    }

    const sol_value = msol_balance * msol_price_sol;
    const usd_value = msol_balance * msol_price_usd;
    const estimated_annual_yield_usd = usd_value * (MSOL_APY / 100);

    return {
      wallet,
      msol_balance: parseFloat(msol_balance.toFixed(6)),
      msol_mint: MSOL_MINT,
      msol_price_sol: parseFloat(msol_price_sol.toFixed(6)),
      msol_price_usd: parseFloat(msol_price_usd.toFixed(4)),
      sol_value: parseFloat(sol_value.toFixed(6)),
      usd_value: parseFloat(usd_value.toFixed(2)),
      apy_percent: MSOL_APY,
      estimated_annual_yield_usd: parseFloat(estimated_annual_yield_usd.toFixed(2)),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
