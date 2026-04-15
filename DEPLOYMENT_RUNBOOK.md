# Deployment Runbook: Launch Your First Clawdrop Agent

**Target Audience**: First user / team evaluating Clawdrop  
**Prerequisites**: Solana devnet wallet (no real money needed)  
**Expected Time**: 15-20 minutes  
**Status**: Phase 1 (MVP ready, VPS 2 SSH needs fixing first)

## Prerequisites Checklist

- [ ] **Solana wallet**: Created with devnet SOL (get free SOL from faucet)
  - Create: https://phantom.app or https://backpack.app
  - Faucet: https://faucet.solana.com (paste wallet address, get 2 SOL)
- [ ] **Terminal access**: Mac/Linux with SSH, bash/zsh
- [ ] **Git**: For cloning the Clawdrop repo
- [ ] **Node.js 20+**: Already installed (check: `node --version`)

## Step 1: Environment Setup (5 min)

### 1.1 Clone the Clawdrop repo

```bash
git clone git@github.com:lpsmurf/clawdrop-mcp.git
cd clawdrop
npm install  # installs monorepo deps
```

### 1.2 Create `.env` file for control plane

```bash
cd packages/control-plane
cat > .env << 'DOTENV'
# ─── Clawdrop Config ───────────────────────────────────────
CLAWDROP_WALLET_ADDRESS=3TyBTeqqN5NpMicX6JXAVAHqUyYLqSNz4EMtQxM34yMw
CLAWDROP_MODE=api

# ─── Solana (Devnet) ───────────────────────────────────────
SOLANA_RPC_URL=https://api.devnet.solana.com
NETWORK=devnet

# ─── Helius RPC (Payment Verification) ──────────────────────
HELIUS_API_KEY=7297b07c-c4d0-46f4-b8f7-242c25005e9c
HELIUS_API_URL=https://api.helius.xyz
HELIUS_DEVNET_RPC=https://devnet.helius-rpc.com/?api-key=7297b07c-c4d0-46f4-b8f7-242c25005e9c

# ─── VPS / HFSP Provisioner ────────────────────────────────
HFSP_API_KEY=test-dev-key-12345
HFSP_API_URL=http://187.124.170.113:3001

# ─── Logging ───────────────────────────────────────────────
LOG_LEVEL=debug
PORT=3000
DOTENV
```

**Note**: Replace these values if you have different credentials.

### 1.3 Install control-plane dependencies

```bash
npm install
# (installs: zod, pino, axios, ts-node, etc.)
```

## Step 2: Test Control Plane (5 min)

### 2.1 Start the MCP server

```bash
# Terminal 1: Start control plane
npm run dev
# Expected output:
# [info] Control plane listening on 127.0.0.1:3000
# [debug] Database loaded: 0 agents
```

### 2.2 Test the tier listing endpoint (in another terminal)

```bash
# Terminal 2: List available tiers
curl -s http://localhost:3000/tiers | jq

# Expected response:
# {
#   "tiers": [
#     {
#       "tier_id": "tier_a",
#       "name": "Tier A - Starter",
#       "price_usd": 100,
#       "vps_type": "shared-docker",
#       "vps_capacity": "2GB RAM, 1 vCPU, Shared",
#       "available_bundles": ["solana", "research", "treasury", "travel-crypto-pro"]
#     },
#     ...
#   ]
# }
```

### 2.3 Test payment quoting

```bash
curl -s -X POST http://localhost:3000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tier_id": "tier_b",
    "payment_token": "SOL"
  }' | jq

# Expected response:
# {
#   "tier_id": "tier_b",
#   "price_usd": 200,
#   "price_in_token": 1.0,  # 200 USD / ~$200 per SOL
#   "payment_token": "SOL",
#   "fee_usd": 0.7,  # 0.35% of $200
#   "bundles_included": ["solana", "research", "treasury", "travel-crypto-pro"]
# }
```

✅ **Control plane is working!**

## Step 3: Prepare Deployment (5 min)

### 3.1 Get your devnet wallet address

```bash
# From your Phantom/Backpack wallet, copy your devnet address
# Example: 9B5X3nZ7kL2mK4pQ7vR1s3tU5wX9yZ1bC3dE5fG7h
export YOUR_WALLET_ADDRESS="9B5X3nZ7kL2mK4pQ7vR1s3tU5wX9yZ1bC3dE5fG7h"
```

### 3.2 Prepare deployment config

```bash
# Create agent deployment request
cat > /tmp/deploy.json << 'JSON'
{
  "tier_id": "tier_b",
  "agent_name": "my-first-agent",
  "owner_wallet": "YOUR_WALLET_ADDRESS_HERE",
  "payment_token": "SOL",
  "bundles": ["solana"],
  "payment_tx_hash": "devnet_test_mock_tx_123"
}
JSON

# Replace YOUR_WALLET_ADDRESS_HERE with your actual wallet
sed -i "" "s/YOUR_WALLET_ADDRESS_HERE/$YOUR_WALLET_ADDRESS/" /tmp/deploy.json
```

### 3.3 (Sandbox Mode Only) Mock the deployment

```bash
# In sandbox/devnet mode, you can skip actual Solana signatures
# Just send the deployment request with a mock tx hash

curl -s -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d @/tmp/deploy.json | jq

# Expected response:
# {
#   "agent_id": "agent_abc123...",
#   "status": "provisioning",
#   "tier_id": "tier_b",
#   "deployed_at": "2026-04-16T...",
#   "next_payment_due": "2026-05-16T...",
#   "message": "Agent provisioning... (in devnet mode)"
# }
```

✅ **Agent creation is working!**

## Step 4: Full Deployment (when VPS ready)

**⚠️ Blocker**: VPS 2 SSH currently times out. See `MESSAGE_FOR_KIMI_APR16.md` for fixes.

Once VPS 2 is fixed:

### 4.1 Deploy agent to Docker

```bash
# Control plane will:
# 1. SSH to VPS 2 (187.124.173.69)
# 2. Create Docker container: openclaw_<agent_id>
# 3. Install @clawdrop/mcp
# 4. Set env vars (wallet, agent_id)
# 5. Start MCP server on stdio

# This happens automatically when you call:
curl -s -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "tier_id": "tier_b",
    "agent_name": "my-first-agent",
    "owner_wallet": "YOUR_WALLET_ADDRESS",
    "payment_token": "SOL",
    "bundles": ["solana"],
    "payment_tx_hash": "<real-tx-hash-from-devnet>"
  }' | jq

# Response will include:
# {
#   "agent_id": "agent_xyz789...",
#   "vps_ip": "187.124.173.69",
#   "console_url": "http://187.124.173.69:8080",  # logs viewer
#   "status": "running"
# }
```

### 4.2 Connect to agent via Claude Desktop

```bash
# Add to ~/.claude.json MCP config:
{
  "mcpServers": {
    "clawdrop-agent": {
      "command": "ssh",
      "args": ["root@187.124.173.69", "docker exec -i openclaw_agent_xyz789 mcp-wallet"]
    }
  }
}

# Now in Claude Desktop, you can:
# - list_tiers
# - get_balance (from your agent's wallet)
# - send_transaction
# - swap_tokens
# - search_flights (if travel bundle is active)
```

## Step 5: Test Agent Operations (5 min)

### 5.1 Check agent status

```bash
curl -s http://localhost:3000/agent/<agent_id> \
  -H "Authorization: Bearer <your-wallet-address>" | jq

# Response:
# {
#   "agent_id": "agent_xyz789...",
#   "status": "running",
#   "uptime_seconds": 342,
#   "bundles": ["solana"],
#   "subscription": {
#     "tier_id": "tier_b",
#     "amount_usd": 200,
#     "next_payment_due": "2026-05-16T...",
#     "payment_history": [...]
#   }
# }
```

### 5.2 Test wallet operations via agent

```bash
# Claude asks the agent to check balance
# Agent calls: get_balance() via @clawdrop/mcp
# Returns: { sol: 0.5, tokens: {...} }

# Claude asks to send 0.1 SOL somewhere
# Agent calls: send_transaction({ destination, amount })
# Returns: { tx_hash: "...", status: "confirmed" }
```

## Step 6: Deploy with Travel Bundle (Optional)

### 6.1 Get Amadeus sandbox credentials

1. Visit: https://developers.amadeus.com/register
2. Fill form (company: "Personal", use case: "Travel")
3. Approve (instant, 15 minutes)
4. Copy Client ID and Secret

### 6.2 Create agent with travel bundle

```bash
cat > /tmp/deploy_travel.json << 'JSON'
{
  "tier_id": "tier_b",
  "agent_name": "travel-agent",
  "owner_wallet": "YOUR_WALLET_ADDRESS_HERE",
  "payment_token": "SOL",
  "bundles": ["solana", "travel-crypto-pro"],
  "payment_tx_hash": "devnet_test_mock_tx_travel"
}
JSON

# Set Amadeus env vars before deploying
export AMADEUS_CLIENT_ID="your-client-id-here"
export AMADEUS_CLIENT_SECRET="your-client-secret-here"
export AMADEUS_ENV="test"  # sandbox

curl -s -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d @/tmp/deploy_travel.json | jq
```

### 6.3 Test travel tools

```bash
# Claude asks: "Find me a flight from Madrid to NYC next week"
# Agent calls: search_travel_options(...)
# Returns: 10 flights with prices, carriers, times

# Claude asks: "Book the cheapest flight and a 4-star hotel"
# Agent calls: build_itinerary(...) → request_booking_approval(...)
# (Gnosis Pay approval request if >$2500)
# Then: book_flight(...) → payment → booking confirmation
```

## Troubleshooting

### Control Plane Won't Start

```bash
# Check if port 3000 is already in use
lsof -i :3000
# Kill the process if needed: kill -9 <PID>

# Check TypeScript compilation
npm run typecheck
```

### Agent Deployment Fails

```bash
# Check VPS 2 SSH connectivity (currently times out — see MESSAGE_FOR_KIMI_APR16.md)
ssh root@187.124.173.69
# Expected: SSH banner or timeout
# If timeout: firewall is blocking SSH

# Check Docker on VPS
ssh root@187.124.173.69 "docker --version"
```

### MCP Tools Not Found

```bash
# Verify packages installed in container
docker exec openclaw_<agent_id> npm list @clawdrop/mcp

# Check MCP server is running
docker exec openclaw_<agent_id> ps aux | grep mcp
```

## What's Not Ready (Phase 2)

- [ ] **Mainnet deployment**: Currently devnet only
- [ ] **Production payment verification**: Real Solana signatures required (partially working)
- [ ] **Gnosis Pay production**: Requires partnership agreement (currently sandbox mode)
- [ ] **Duffel flights**: Business approval required (Amadeus available now)
- [ ] **Persistent storage**: Approvals currently in-memory
- [ ] **Multi-user/DAOs**: Single wallet per agent (Squads multisig in Phase 2)
- [ ] **Advanced monitoring**: Real-time metrics dashboard (basic uptime tracking available)

## Next Steps

1. **Fix VPS 2 SSH** (MESSAGE_FOR_KIMI_APR16.md) — 30 min
2. **Deploy first agent to Docker** — 10 min (once VPS ready)
3. **Test full booking flow** (search → build → approve → book) — 15 min
4. **Set up monitoring** — 30 min
5. **Onboard first users** — ongoing

---

**Questions?** Check `MASTER_ARCHITECTURE.md` for system design or `TRAVEL_BUNDLE_GUIDE.md` for travel bundle details.
