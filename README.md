# Clawdrop — AI Agent Infrastructure for Solana

Deploy Claude agents that hold crypto, book flights, and trade on-chain — in 30 seconds, from one command.

## What it is

Clawdrop provisions persistent AI agents with real Solana wallets. Each agent runs in an isolated container on dedicated VPS infrastructure, reachable via MCP (Claude Code), Telegram, or API. Users never touch wallets, gas, or APIs — they just talk to Claude. Clawdrop handles deployment, billing, and key management underneath.

The control plane is installed as an MCP server. Claude guides the user through tier selection, payment via Phantom, and deployment — automatically.

## Quick Start (30 seconds)

Paste this in your Claude Code terminal:

```
claude mcp add clawdrop -- npx -y github:lpsmurf/clawdrop-mcp
```

Then tell Claude: **"Set up my Clawdrop agent"**

Claude will walk you through:
1. Pick a tier (Explorer / Starter / Professional / Enterprise)
2. Send payment via Phantom wallet
3. Agent deploys to VPS — live in ~60 seconds

**Example tool calls once your agent is running:**

```
"Check my SOL balance"
"Swap 1 SOL to USDC"
"Search flights from JFK to Madrid next Friday, economy"
"What are the top yield opportunities on Solana right now?"
"Search the web for Solana validator APY trends"
"Stake 2 SOL via Marinade"
```

## What your agent can do

| Tool | What it does | Bundle |
|------|-------------|--------|
| `check_balance` | SOL + SPL token balances for any wallet | Solana |
| `swap_tokens` | Token swaps via Jupiter aggregator | Solana |
| `send_tokens` | Send SOL or SPL tokens to any address | Solana |
| `get_token_price` | Live token price in USD via Jupiter | Solana |
| `get_token_info` | Price, 24h change, volume, market cap via DexScreener | Research |
| `get_trending_tokens` | Top trending tokens on DexScreener right now | Research |
| `search_token` | Search DexScreener by symbol or name | Research |
| `web_search` | Web search via Brave / DuckDuckGo | Research |
| `summarize_url` | Fetch and summarize any URL | Research |
| `get_news` | Top news results for any query | Research |
| `stake_sol` | Liquid stake SOL via Marinade (SOL → mSOL) | Treasury |
| `get_staking_positions` | mSOL balance, USD value, yield estimate | Treasury |
| `get_defi_overview` | Full portfolio: SOL + tokens + staking | Treasury |
| `get_yield_opportunities` | Top Solana yield sources with risk ratings | Treasury |
| `search_flights` | Search flights via Duffel API | Travel |
| `book_flight` | Book a flight with passenger details | Travel |
| `search_hotels` | Search hotels by city, dates, budget | Travel |
| `book_hotel` | Book hotel with guest details | Travel |
| `deploy_agent` | Deploy a new Clawdrop agent | Control plane |
| `list_agents` | List your running agents | Control plane |
| `renew_subscription` | Renew an agent subscription | Control plane |
| `get_credits` | Check credit balance for premium tools | Control plane |

**22 tools across 5 bundles.**

## Tiers & Pricing

| Tier | Price/mo | Agents | Runtime | Use case |
|------|----------|--------|---------|----------|
| **Explorer** | $29 | 1 | Shared (512MB, 0.25 vCPU) | Side projects, testing |
| **Starter** | $100 | 1 | Shared (2GB, 1 vCPU) | Indie devs, solo operators |
| **Professional** | $200 | 1 | Dedicated (4GB, 2 vCPU) | Active traders, small DAOs |
| **Enterprise** | $400 | 5 | Custom dedicated | DAOs, protocols, funds |

Pay with SOL, USDC, USDT, or HERD (10% discount for HERD). 3-month upfront: 10% off. Annual: 20% off.

## How it works

```
User (Claude Code / Telegram)
        │
        │  MCP stdio
        ▼
┌──────────────────────┐
│   Control Plane      │  ← deploy_agent, list_agents, renew_subscription
│   (MCP server)       │
└──────────┬───────────┘
           │
           │  HFSP API (HTTP)
           ▼
┌──────────────────────┐
│   Hostinger VPS      │  ← Docker container per agent
│   (tenant infra)     │     Ubuntu 24.04 + Node.js 22
│                      │     Wallet key in OS keychain
│   OpenClaw runtime   │     All bundles preinstalled
└──────────┬───────────┘
           │
           │  Helius RPC + Jupiter + Duffel
           ▼
    Solana Mainnet / Travel APIs
```

Payment is verified on-chain via Helius before any deployment. Agent wallets use OS keychain storage — keys never touch disk as plaintext.

## Fee structure

| Transaction | Fee |
|-------------|-----|
| Token swap (via Jupiter) | 0.35% of swap value |
| Direct SOL / USDC transfer | ~$0.05 flat |
| Flight booking | 0.5–1% of ticket price |
| Hotel booking | 1–2% of booking value |

## For developers (self-hosting)

```bash
git clone git@github.com:lpsmurf/clawdrop-mcp.git
cd clawdrop
npm install

# Configure environment
cp packages/control-plane/.env.example packages/control-plane/.env
# Required env vars:
#   HELIUS_API_KEY       — Helius RPC (mainnet)
#   CLAWDROP_WALLET_ADDR — Solana wallet to receive payments
#   CLAWDROP_WALLET_KEY  — Private key (bs58) for the receiving wallet
#   HFSP_BASE_URL        — Your HFSP deployment endpoint
#   HFSP_API_KEY         — HFSP auth token

# Start control plane (MCP stdio mode)
cd packages/control-plane
npm run dev

# Run type checks across all packages
npm run typecheck
```

Agent containers (OpenClaw runtime) read these vars at startup:

| Variable | Required | Source |
|----------|----------|--------|
| `WALLET_PRIVATE_KEY` | Yes | Auto-generated per agent |
| `ANTHROPIC_API_KEY` | Yes (if Anthropic) | User provides |
| `DUFFEL_API_TOKEN` | Yes (travel) | Platform-injected |
| `HELIUS_API_KEY` | Yes | Platform-injected |
| `TELEGRAM_BOT_TOKEN` | Optional | User provides |
| `BRAVE_API_KEY` | Optional | Enables Brave Search |

## Roadmap

- **Lit Protocol key management** — threshold encryption for agent wallets, no single point of failure
- **Embeddable widget** — drop Clawdrop into any web app with one `<script>` tag
- **CEX integration** — Coinbase, Binance order routing alongside on-chain execution
- **Multi-sig support** — team approval workflows for treasury agents (Enterprise tier)
- **Bundle marketplace** — third-party capability bundles with revenue share
- **Cross-chain** — ETH, Base, and Arbitrum support post-Solana stabilization

---

**GitHub**: [github.com/lpsmurf/clawdrop-mcp](https://github.com/lpsmurf/clawdrop-mcp)  
**Security**: [security@clawdrop.dev](mailto:security@clawdrop.dev) (responsible disclosure)  
**Status**: Phase 1 complete — production deployments open
