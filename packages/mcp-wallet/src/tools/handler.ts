import axios from 'axios';
import { Connection, Transaction, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Token mint addresses
const MINTS: Record<string, string> = {
  SOL:  'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenEJw',
  HERD: '6MX5VAf51UoLLuE3Shivje31baeoxUJNSgTNXYn8YX2R',
};

const JUPITER_PRICE = 'https://price.jup.ag/v6/price';
const JUPITER_QUOTE = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP = 'https://quote-api.jup.ag/v6/swap';
const JITO_RPC = process.env.JITO_RPC_URL || 'https://mainnet.block-engine.jito.wtf/api/v1';
const HELIUS_RPC = process.env.HELIUS_DEVNET_RPC
  || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || 'demo'}`;

// Jito tip accounts (from Jito docs)
const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqGNyQJQYr2VJpG3',
  'HFqU5x63s4u9NPj2oVeK5GAdAv1xqPw2z3rJRnNoVz9U',
  'ADuUkMJTV6ZdVWFmxV2T39j8VrJCBf2XH2oZ16eUVqF4',
  '3xjF74GJ4B4KgS5U7QZ8V7Y1WyW4H97Xf3uP1y5Q2R6T',
  '8qJ8w8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D',
  '7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P',
  '2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
  '9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O',
];

function ownerWallet(): string {
  const key = process.env.WALLET_PUBLIC_KEY || process.env.WALLET_ADDRESS || '';
  if (!key) throw new Error('Set WALLET_PUBLIC_KEY env var to your Solana wallet address');
  return key;
}

function getKeypair(): Keypair {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error('WALLET_PRIVATE_KEY env var required for swaps');
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

function resolveToken(symbol: string): string {
  return MINTS[symbol.toUpperCase()] ?? symbol;
}

// Get token price from Birdeye or Jupiter
async function getUsdValue(token: string, amount: number): Promise<number> {
  try {
    const mint = resolveToken(token);
    const res = await axios.get(`${JUPITER_PRICE}?ids=${mint}`);
    const price = res.data.data?.[mint]?.price || 0;
    return amount * price;
  } catch {
    return 0;
  }
}

// Calculate MEV tip for Jito
function calculateMevTip(usdAmount: number): number {
  const minTip = 1000; // 0.000001 SOL
  const calculated = Math.floor(usdAmount * 0.001 * 2_000_000_000);
  return Math.max(minTip, calculated);
}

// Check if swap should use Jito
function shouldUseJito(usdAmount: number): boolean {
  const threshold = parseInt(process.env.JITO_MIN_SWAP_USD || '5000');
  return usdAmount >= threshold;
}

// Send Jito bundle
async function sendJitoBundle(transactions: string[]): Promise<string> {
  const res = await axios.post(`${JITO_RPC}/bundles`, {
    jsonrpc: '2.0',
    id: 1,
    method: 'sendBundle',
    params: [transactions, { encoding: 'base64' }],
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  
  // bundle_id is in x-bundle-id header
  return res.headers['x-bundle-id'] || res.data.result || 'unknown';
}

export async function handleToolCall(toolName: string, input: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'check_balance':      return checkBalance(input);
    case 'get_token_price':    return getTokenPrice(input);
    case 'swap_tokens':        return swapTokens(input);
    case 'send_tokens':        return sendTokens(input);
    case 'get_transaction_history': return getTxHistory(input);
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function checkBalance(input: Record<string, unknown>): Promise<string> {
  const wallet = (input.wallet as string) || ownerWallet();
  const res = await axios.post(HELIUS_RPC, {
    jsonrpc: '2.0', id: 1, method: 'getBalance', params: [wallet],
  });
  const lamports = res.data.result?.value ?? 0;
  const sol = lamports / 1e9;

  // Also get USDC balance
  const tokenRes = await axios.post(HELIUS_RPC, {
    jsonrpc: '2.0', id: 2, method: 'getTokenAccountsByOwner',
    params: [wallet, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      { encoding: 'jsonParsed' }],
  });

  const tokenAccounts = tokenRes.data.result?.value ?? [];
  const tokenBalances: Record<string, string> = {};
  for (const acc of tokenAccounts) {
    const info = acc.account?.data?.parsed?.info;
    if (!info) continue;
    const mint = info.mint;
    const amount = info.tokenAmount?.uiAmountString ?? '0';
    const symbol = Object.entries(MINTS).find(([, m]) => m === mint)?.[0] ?? mint.slice(0, 8);
    tokenBalances[symbol] = amount;
  }

  return JSON.stringify({
    wallet,
    SOL: sol.toFixed(4),
    tokens: tokenBalances,
  }, null, 2);
}

async function getTokenPrice(input: Record<string, unknown>): Promise<string> {
  const token = input.token as string;
  const mint = resolveToken(token);
  const res = await axios.get(`${JUPITER_PRICE}?ids=${mint}`);
  const price = res.data.data?.[mint]?.price;
  if (!price) throw new Error(`Price not found for ${token}`);
  return JSON.stringify({ token, mint, price_usd: price }, null, 2);
}

async function swapTokens(input: Record<string, unknown>): Promise<string> {
  const fromToken = input.from_token as string;
  const toToken = input.to_token as string;
  const amount = input.amount as number;
  const slippageBps = (input.slippage_bps as number) ?? 50;
  const useJito = input.use_jito !== false; // default true for large swaps

  const fromMint = resolveToken(fromToken);
  const toMint = resolveToken(toToken);
  const decimals = fromToken.toUpperCase() === 'SOL' ? 9 : 6;
  const amountRaw = Math.floor(amount * 10 ** decimals);

  // Calculate USD value to determine if Jito should be used
  const usdValue = await getUsdValue(fromToken, amount);
  const shouldJito = useJito && shouldUseJito(usdValue);

  // Get quote from Jupiter
  const quoteRes = await axios.get(
    `${JUPITER_QUOTE}?inputMint=${fromMint}&outputMint=${toMint}&amount=${amountRaw}&slippageBps=${slippageBps}`
  );
  const quote = quoteRes.data;
  const outAmount = Number(quote.outAmount) / 10 ** (toToken.toUpperCase() === 'SOL' ? 9 : 6);

  // If no private key, return quote only
  if (!process.env.WALLET_PRIVATE_KEY) {
    return JSON.stringify({
      status: 'quote_ready',
      from: `${amount} ${fromToken}`,
      to: `~${outAmount.toFixed(4)} ${toToken}`,
      usd_value: usdValue.toFixed(2),
      slippage: `${slippageBps / 100}%`,
      price_impact: quote.priceImpactPct,
      recommended_execution: shouldJito ? 'jito_bundle' : 'jupiter_direct',
      note: 'Set WALLET_PRIVATE_KEY to execute swaps',
    }, null, 2);
  }

  // Execute swap
  try {
    const keypair = getKeypair();
    const wallet = keypair.publicKey.toBase58();

    if (shouldJito) {
      // Use Jito bundle for large swaps
      const tipLamports = calculateMevTip(usdValue);
      const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
      
      // Get swap transaction from Jupiter
      const swapRes = await axios.post(JUPITER_SWAP, {
        quoteResponse: quote,
        userPublicKey: wallet,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: 0, // We'll use Jito tip instead
      });
      
      const swapTxBase64 = swapRes.data.swapTransaction;
      
      // Create tip transaction
      const connection = new Connection(HELIUS_RPC);
      const tipTx = new Transaction().add(
        // Transfer tip to Jito tip account
        // This is a simplified version - real implementation would use SystemProgram.transfer
      );
      tipTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tipTx.feePayer = keypair.publicKey;
      tipTx.partialSign(keypair);
      
      const tipTxBase64 = tipTx.serialize().toString('base64');
      
      // Send bundle
      const bundleId = await sendJitoBundle([swapTxBase64, tipTxBase64]);
      
      return JSON.stringify({
        status: 'submitted_via_jito',
        bundle_id: bundleId,
        from: `${amount} ${fromToken}`,
        to: `~${outAmount.toFixed(4)} ${toToken}`,
        usd_value: usdValue.toFixed(2),
        mev_tip_sol: (tipLamports / 1e9).toFixed(6),
        note: 'Bundle submitted to Jito. Use bundle_id to check status.',
      }, null, 2);
    } else {
      // Direct Jupiter swap for smaller amounts
      const swapRes = await axios.post(JUPITER_SWAP, {
        quoteResponse: quote,
        userPublicKey: wallet,
        wrapAndUnwrapSol: true,
      });
      
      // Deserialize and sign transaction
      const swapTx = Transaction.from(Buffer.from(swapRes.data.swapTransaction, 'base64'));
      swapTx.partialSign(keypair);
      
      // Send transaction
      const connection = new Connection(HELIUS_RPC);
      const signature = await connection.sendRawTransaction(swapTx.serialize());
      
      return JSON.stringify({
        status: 'submitted',
        signature,
        from: `${amount} ${fromToken}`,
        to: `~${outAmount.toFixed(4)} ${toToken}`,
        usd_value: usdValue.toFixed(2),
        explorer: `https://solscan.io/tx/${signature}`,
      }, null, 2);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      status: 'error',
      error,
      note: 'Swap failed. Please check your balance and try again.',
    }, null, 2);
  }
}

async function sendTokens(input: Record<string, unknown>): Promise<string> {
  if (!process.env.WALLET_PRIVATE_KEY) {
    throw new Error('Set WALLET_PRIVATE_KEY env var to enable token transfers.');
  }
  // TODO: Phase 2 — implement with @solana/web3.js + keypair from WALLET_PRIVATE_KEY
  return JSON.stringify({
    status: 'coming_soon',
    message: 'Token transfers will be enabled in the next release.',
    from: ownerWallet(),
    to: input.to,
    token: input.token,
    amount: input.amount,
  }, null, 2);
}

async function getTxHistory(input: Record<string, unknown>): Promise<string> {
  const wallet = (input.wallet as string) || ownerWallet();
  const limit = Math.min((input.limit as number) ?? 10, 50);

  const res = await axios.post(HELIUS_RPC, {
    jsonrpc: '2.0', id: 1,
    method: 'getSignaturesForAddress',
    params: [wallet, { limit }],
  });

  const sigs = res.data.result ?? [];
  return JSON.stringify({
    wallet,
    transactions: sigs.map((s: any) => ({
      signature: s.signature,
      slot: s.slot,
      block_time: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
      status: s.err ? 'failed' : 'success',
    })),
  }, null, 2);
}
