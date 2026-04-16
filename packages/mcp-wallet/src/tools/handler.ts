import axios from 'axios';

// Token mint addresses
const MINTS: Record<string, string> = {
  SOL:  'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenEJw',
  HERD: '6MX5VAf51UoLLuE3Shivje31baeoxUJNSgTNXYn8YX2R',
};

const JUPITER_PRICE = 'https://price.jup.ag/v6/price';
const JUPITER_QUOTE = 'https://quote-api.jup.ag/v6/quote';
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

  // Get quote
  const quoteRes = await axios.get(
    `${JUPITER_QUOTE}?inputMint=${fromMint}&outputMint=${toMint}&amount=${amountRaw}&slippageBps=${slippageBps}`
  );
  const quote = quoteRes.data;
  const outAmount = Number(quote.outAmount) / 10 ** (toToken.toUpperCase() === 'SOL' ? 9 : 6);

  // TODO: Phase 2 — sign and submit with @solana/web3.js
  // For now return the quote so the user can review before executing
  return JSON.stringify({
    status: 'quote_ready',
    from: `${amount} ${fromToken}`,
    to: `~${outAmount.toFixed(4)} ${toToken}`,
    slippage: `${slippageBps / 100}%`,
    price_impact: quote.priceImpactPct,
    note: 'Swap execution coming in next release. Use Phantom to confirm.',
  }, null, 2);
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
