# @clawdrop/mcp

Solana wallet tools for Claude and any MCP-compatible LLM.  
**One line. No VPS. No deployment.**

## Install

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clawdrop-wallet": {
      "command": "npx",
      "args": ["-y", "@clawdrop/mcp@latest"],
      "env": {
        "WALLET_PUBLIC_KEY": "YOUR_SOLANA_WALLET_ADDRESS",
        "WALLET_PRIVATE_KEY": "YOUR_BASE58_PRIVATE_KEY",
        "HELIUS_API_KEY": "your-helius-api-key"
      }
    }
  }
}
```

Restart Claude Desktop. You're done.

## What you get

| Tool | What it does |
|------|-------------|
| `check_balance` | SOL + all token balances |
| `get_token_price` | Live price via Jupiter |
| `swap_tokens` | Best-price swap via Jupiter DEX aggregator |
| `send_tokens` | Send SOL/USDC/USDT/HERD to any address |
| `get_transaction_history` | Recent wallet history |

## Privacy

Your private key stays on your machine inside the MCP process.  
It is **never** sent to any Clawdrop server.

## Need a persistent AI agent?

Use [Clawdrop](https://clawdrop.io) to deploy an always-on OpenClaw agent on a VPS.
