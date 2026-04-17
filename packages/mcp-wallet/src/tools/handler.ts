import axios from 'axios';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  calculateSwapFee,
  calculateTransferFee,
  collectFee,
  getFeeSummary,
} from '../../control-plane/src/services/fee-collector.js';

// Token mint addresses
const MINTS: Record<string, string> = {
  SOL:  'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenEJw',
  HERD: '6MX5VAf51UoLLuE3Shivje31baeoxUJNSgTNXYn8YX2R',
};

const JUPITER_PRICE = 'https://price.jup.ag/v6/price';
const JUPITER_QUOTE = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP  = 'https://quote-api.jup.ag/v6/swap';
const HELIUS_RPC = process.env.HELIUS_DEVNET_RPC
  || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || 'demo'}`;

function ownerWallet(): string {
  const key = process.env.WALLET_PUBLIC_KEY || process.env.WALLET_ADDRESS || '';
  if (!key) throw new Error('Set WALLET_PUBLIC_KEY env var to your Solana wallet address');
  return key;
}

function resolveToken(symbol: string): string {
  return MINTS[symbol.toUpperCase()] ?? symbol; // treat as mint address if not known symbol
}

/**
 * Load keypair from WALLET_PRIVATE_KEY env var (bs58-encoded secret key).
 * Returns undefined if the env var is not set.
 */
function loadKeypair(): Keypair | undefined {
  const raw = process.env.WALLET_PRIVATE_KEY;
  if (!raw) return undefined;
  try {
    const secret = bs58.decode(raw);
    return Keypair.fromSecretKey(secret);
  } catch {
    throw new Error('WALLET_PRIVATE_KEY is not a valid bs58-encoded secret key');
  }
}

export async function handleToolCall(toolName: string, input: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'check_balance':           return checkBalance(input);
    case 'get_token_price':         return getTokenPrice(input);
    case 'swap_tokens':             return swapTokens(input);
    case 'send_tokens':             return sendTokens(input);
    case 'get_transaction_history': return getTxHistory(input);
    case 'get_fee_summary':         return JSON.stringify(getFeeSummary(), null, 2);
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
  if (!process.env.WALLET_PRIVATE_KEY) {
    throw new Error(
      'Set WALLET_PRIVATE_KEY env var to enable swaps. ' +
      'Your key stays local — it never leaves your machine.'
    );
  }

  const fromToken = input.from_token as string;
  const toToken = input.to_token as string;
  const amount = input.amount as number;
  const slippageBps = (input.slippage_bps as number) ?? 50;

  const fromMint = resolveToken(fromToken);
  const toMint = resolveToken(toToken);
  const decimals = fromToken.toUpperCase() === 'SOL' ? 9 : 6;
  const amountRaw = Math.floor(amount * 10 ** decimals);

  // ── 1. Get Jupiter quote ──────────────────────────────────────────────────
  const quoteRes = await axios.get(
    `${JUPITER_QUOTE}?inputMint=${fromMint}&outputMint=${toMint}&amount=${amountRaw}&slippageBps=${slippageBps}`
  );
  const quote = quoteRes.data;
  const outAmount = Number(quote.outAmount) / 10 ** (toToken.toUpperCase() === 'SOL' ? 9 : 6);

  // ── 2. Load keypair ───────────────────────────────────────────────────────
  const keypair = loadKeypair()!;

  // ── 3. Get swap transaction from Jupiter ─────────────────────────────────
  const swapRes = await axios.post(JUPITER_SWAP, {
    quoteResponse: quote,
    userPublicKey: keypair.publicKey.toBase58(),
    wrapAndUnwrapSol: true,
  });
  const { swapTransaction } = swapRes.data as { swapTransaction: string };

  // ── 4. Deserialize, sign, and send ───────────────────────────────────────
  const connection = new Connection(HELIUS_RPC, 'confirmed');
  const txBuf = Buffer.from(swapTransaction, 'base64');
  const versionedTx = VersionedTransaction.deserialize(txBuf);
  versionedTx.sign([keypair]);

  const signature = await connection.sendRawTransaction(versionedTx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  // Wait for confirmation
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    'confirmed'
  );

  // ── 5. Collect 0.35% fee (non-blocking) ──────────────────────────────────
  const feeCalc = calculateSwapFee(amount);
  collectFee({
    type: 'swap',
    user_wallet: keypair.publicKey.toBase58(),
    fee_sol: feeCalc.fee_sol,
    fee_usd_estimate: feeCalc.fee_usd_estimate,
    user_keypair: keypair,
    metadata: { from_token: fromToken, to_token: toToken, amount, slippage_bps: slippageBps },
  }).catch(() => { /* fee failure never blocks user */ });

  return JSON.stringify({
    status: 'success',
    from: `${amount} ${fromToken}`,
    to: `~${outAmount.toFixed(4)} ${toToken}`,
    slippage: `${slippageBps / 100}%`,
    price_impact: quote.priceImpactPct,
    signature,
    fee: {
      sol: feeCalc.fee_sol,
      usd_estimate: feeCalc.fee_usd_estimate,
      rate: '0.35%',
    },
    explorer: `https://solscan.io/tx/${signature}`,
  }, null, 2);
}

async function sendTokens(input: Record<string, unknown>): Promise<string> {
  if (!process.env.WALLET_PRIVATE_KEY) {
    throw new Error('Set WALLET_PRIVATE_KEY env var to enable token transfers.');
  }

  const toAddress = input.to as string;
  const token = (input.token as string).toUpperCase();
  const amount = input.amount as number;
  const memo = input.memo as string | undefined;

  const keypair = loadKeypair()!;
  const connection = new Connection(HELIUS_RPC, 'confirmed');

  if (token === 'SOL') {
    // ── SOL transfer ─────────────────────────────────────────────────────
    const lamports = Math.floor(amount * 1e9);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports,
      })
    );

    if (memo) {
      // Attach memo via the Memo program
      const { TransactionInstruction } = await import('@solana/web3.js');
      tx.add(new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(memo, 'utf8'),
      }));
    }

    const signature = await sendAndConfirmTransaction(connection, tx, [keypair]);

    // ── Collect flat fee (non-blocking) ───────────────────────────────────
    const feeCalc = calculateTransferFee();
    collectFee({
      type: 'transfer',
      user_wallet: keypair.publicKey.toBase58(),
      fee_sol: feeCalc.fee_sol,
      fee_usd_estimate: feeCalc.fee_usd_estimate,
      user_keypair: keypair,
      metadata: { token, amount, to: toAddress, memo },
    }).catch(() => { /* fee failure never blocks user */ });

    return JSON.stringify({
      status: 'success',
      token: 'SOL',
      amount,
      to: toAddress,
      signature,
      fee: {
        sol: feeCalc.fee_sol,
        usd_estimate: feeCalc.fee_usd_estimate,
        rate: 'flat $0.05',
      },
      explorer: `https://solscan.io/tx/${signature}`,
    }, null, 2);

  } else {
    // ── SPL token transfer ────────────────────────────────────────────────
    const mint = resolveToken(token);

    // Dynamically import spl-token to keep bundle size lean for SOL-only users
    const { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } =
      await import('@solana/spl-token').catch(() => {
        throw new Error('@solana/spl-token is not installed. Run: npm install @solana/spl-token');
      });

    const mintPubkey = new PublicKey(mint);
    const toPubkey = new PublicKey(toAddress);

    const [fromAta, toAta] = await Promise.all([
      getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, keypair.publicKey),
      getOrCreateAssociatedTokenAccount(connection, keypair, mintPubkey, toPubkey),
    ]);

    // Assume 6 decimals for SPL tokens (USDC/USDT/most tokens)
    const splDecimals = 6;
    const amountRaw = BigInt(Math.floor(amount * 10 ** splDecimals));

    const tx = new Transaction().add(
      createTransferInstruction(
        fromAta.address,
        toAta.address,
        keypair.publicKey,
        amountRaw,
        [],
        TOKEN_PROGRAM_ID,
      )
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [keypair]);

    // ── Collect flat fee (non-blocking) ───────────────────────────────────
    const feeCalc = calculateTransferFee();
    collectFee({
      type: 'transfer',
      user_wallet: keypair.publicKey.toBase58(),
      fee_sol: feeCalc.fee_sol,
      fee_usd_estimate: feeCalc.fee_usd_estimate,
      user_keypair: keypair,
      metadata: { token, amount, to: toAddress, memo },
    }).catch(() => { /* fee failure never blocks user */ });

    return JSON.stringify({
      status: 'success',
      token,
      amount,
      to: toAddress,
      signature,
      fee: {
        sol: feeCalc.fee_sol,
        usd_estimate: feeCalc.fee_usd_estimate,
        rate: 'flat $0.05',
      },
      explorer: `https://solscan.io/tx/${signature}`,
    }, null, 2);
  }
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
    transactions: sigs.map((s: { signature: string; slot: number; blockTime?: number; err?: unknown }) => ({
      signature: s.signature,
      slot: s.slot,
      block_time: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
      status: s.err ? 'failed' : 'success',
    })),
  }, null, 2);
}
