# @clawdrop/openclaw

OpenClaw is the combined MCP stdio agent runtime image for Clawdrop deployments. It bundles all tool packages into a single container that HFSP (the Clawdrop provisioner) deploys when spinning up an agent.

## Bundled tools

| Bundle | Tools |
|---|---|
| `mcp-wallet` | `check_balance`, `get_token_price`, `swap_tokens`, `send_tokens`, `get_transaction_history`, `get_fee_summary` |
| `travel-crypto-pro` | `search_flights`, `price_flight`, `book_flight` |
| `research` | `web_search`, `summarize_url`, `get_news` |

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `WALLET_PRIVATE_KEY` | For wallet ops | Solana wallet private key (bs58) |
| `DUFFEL_API_TOKEN` | For flight booking | Duffel API token |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for Claude calls |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram notification bot |
| `HELIUS_API_KEY` | For on-chain data | Helius RPC API key |
| `BRAVE_API_KEY` | Optional | Brave Search (web_search falls back to DDG if unset) |

## Build

```bash
# From repo root
docker build -f packages/openclaw/Dockerfile -t clawdrop/openclaw:latest .
```

## Run

```bash
docker run --rm -i \
  -e WALLET_PRIVATE_KEY="..." \
  -e DUFFEL_API_TOKEN="..." \
  -e HELIUS_API_KEY="..." \
  clawdrop/openclaw:latest
```

The container speaks MCP over stdio — pipe it to any MCP host.
