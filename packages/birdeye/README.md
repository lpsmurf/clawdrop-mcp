# @clawdrop/birdeye

Birdeye token analytics integration for Poli autonomous wallet agent.

## Tools

### `get_token_analytics(mint)`
Get detailed analytics for a token including price, liquidity, holder count, and volume.

```json
{
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "symbol": "USDC",
  "name": "USD Coin",
  "price_usd": 1.00,
  "price_change_24h": 0.01,
  "market_cap": 25000000000,
  "liquidity": 1500000000,
  "holder_count": 1500000,
  "volume_24h": 500000000
}
```

### `get_market_overview()`
Get trending tokens on Solana (top 10 by activity).

### `get_wallet_analytics(wallet)`
Analyze a wallet's token holdings and portfolio value.

## Environment Variables

```bash
BIRDEYE_API_KEY=your_api_key_here
```

## Cache Strategy

- Token prices: 5 minutes
- Trending tokens: 10 minutes  
- Wallet holdings: 5 minutes
- Token metadata: 1 hour

## Error Handling

- 521 errors (Cloudflare overload): Auto-retry with exponential backoff
- Missing token: Returns UNKNOWN with zero values
- Rate limits: Uses cached data if available
