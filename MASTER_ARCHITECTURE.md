# Clawdrop Master Architecture

**Version**: 1.0 (Phase 1 Complete)  
**Last Updated**: 2026-04-16  
**Status**: ✅ Ready for Phase 2

## System Overview

**Clawdrop** is an AI agent provisioning platform that turns Claude into an autonomous agent with wallet access and crypto-native capabilities.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User/Developer                           │
│                   (CLI, API, Claude Desktop)                     │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ Deploy Agent with Bundles
         ↓
┌─────────────────────────────────────────────────────────────────┐
│               Clawdrop Control Plane (Node.js)                   │
│  packages/control-plane/                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ MCP Server (stdio)                                       │   │
│  │ - 5 tools: list_tiers, quote_tier, deploy_agent,        │   │
│  │           get_deployment_status, cancel_subscription    │   │
│  │ - Zod schemas (validation)                              │   │
│  │ - Ownership checks (IDOR prevention)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Services                                                 │   │
│  │ - Tier Service: list tiers, pricing, bundles            │   │
│  │ - Payment Service: fee calculation, Jupiter quotes      │   │
│  │ - Database: in-memory + JSON backup                     │   │
│  │ - Docker SSH: direct container deploy                  │   │
│  │ - Helius: Solana devnet payment verification           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Config                                                   │   │
│  │ - Real wallet: 3TyBTeqqN5NpMicX6JXAVAHqUyYLqSNz4EMtQxM34yMw   │
│  │ - Helius API key (devnet payment verification)          │   │
│  │ - Token mints (SOL, USDT, USDC, HERD)                  │   │
│  │ - Fee model: <$100 = $1 flat, ≥$100 = 0.35%            │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ Solana RPC (Helius devnet)
         ↓
    [Solana Devnet]
    (payment verification,
     fund wallet, Jupiter swaps)
         │
         │ SSH + Docker commands
         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      VPS Infrastructure                          │
│                                                                  │
│  Tier A: Shared Docker (2GB RAM, 1 vCPU)                        │
│  Tier B: Dedicated VPS (4GB RAM, 2 vCPU) ← most users          │
│  Tier C: Enterprise Custom (contact sales)                      │
│                                                                  │
│  Current: 3 VPS in Hostinger account                           │
│  - VPS 2: 187.124.173.69 (DC19, 4GB/2vCPU, Docker ready)      │
│  - VPS 3: 187.124.174.137 (DC19, unknown config)              │
│  - (One more in different datacenter)                          │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ Agent container (deployed via SSH + Docker)
         ↓
┌─────────────────────────────────────────────────────────────────┐
│               Deployed Agent (Docker Container)                  │
│                                                                  │
│  Base: Node.js 20, ts-node, ESM                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ OpenClaw Runtime                                         │   │
│  │ (Kimi's agent runtime, manages agent lifecycle)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ MCP Servers (available to Claude)                        │   │
│  │ - @clawdrop/mcp: lightweight wallet MCP                 │   │
│  │   (Solana operations: sign, send, swap, balance)         │   │
│  │ - @clawdrop/travel-crypto-pro: travel bundle (if active) │   │
│  │   (Flight search, hotel booking, Gnosis Pay spends)     │   │
│  │ - <future bundles>: research, treasury, etc.            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Agent Config (env vars)                                  │   │
│  │ - CLAWDROP_AGENT_ID: unique identifier                  │   │
│  │ - CLAWDROP_WALLET_ADDRESS: Solana wallet               │   │
│  │ - CLAWDROP_OWNER_WALLET: user's wallet (for IDOR)      │   │
│  │ - Bundle-specific env: AMADEUS_CLIENT_ID, etc.         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ Claude (via MCP stdio protocol)
         ↓
    ┌─────────────────┐
    │ Claude Desktop  │
    │ or             │
    │ Claude Code    │
    │ (AI agent)     │
    └─────────────────┘
```

## Key Components

### 1. Control Plane (`packages/control-plane/`)

**Purpose**: Deploy, manage, and bill agents

**Tech Stack**: Node.js 20, TypeScript, Zod, Pino, MCP stdio

**Core Services**

| Service | Purpose | Files |
|---------|---------|-------|
| **Tier Service** | List tiers, get pricing, available bundles | `services/tier.ts` |
| **Payment Service** | Fee calculation, Jupiter quotes, token swapping logic | `services/payment.ts` |
| **Database** | In-memory agent store + JSON backup | `db/memory.ts` |
| **Helius** | Verify Solana transactions on devnet | `integrations/helius.ts` |
| **Docker SSH** | Deploy containers via SSH commands | `integrations/docker-ssh.ts` |
| **Logger** | Redact sensitive fields (*key*, *secret*, *password*) before logging | `utils/logger.ts` |
| **Key Vault** | Layered secret retrieval (Vault → env → fail in prod) | `utils/key-vault.ts` |

**MCP Tools (5)**

1. **`list_tiers`** — Get available tiers with pricing and bundles
2. **`quote_tier`** — Get price in user's preferred token (SOL/USDT/USDC/HERD)
3. **`deploy_agent`** — Provision new agent (verify payment → deploy → save subscription)
4. **`get_deployment_status`** — Check agent status, uptime, logs, subscription
5. **`cancel_subscription`** — Stop agent, clean up container, grace period (7 days)

**Data Model**

```typescript
// Agent (deployed instance)
interface DeployedAgent {
  agent_id: string;
  owner_wallet: string;           // IDOR check: must match caller
  agent_name: string;
  tier_id: string;
  bundles: BundleName[];          // 'solana' | 'research' | 'treasury' | 'travel-crypto-pro'
  status: AgentStatus;            // 'provisioning' | 'running' | 'paused' | 'failed' | 'stopped'
  vps_ip?: string;
  console_url?: string;
  deployed_at: Date;
  last_activity: Date;
  subscription: Subscription;     // pricing, payment history, renewal schedule
  logs: Array<{ timestamp, level, message }>;
}

// Subscription (billing)
interface Subscription {
  tier_id: string;
  amount_usd: number;
  payment_token: PaymentToken;    // 'SOL' | 'USDT' | 'USDC' | 'HERD'
  started_at: Date;
  next_payment_due: Date;         // +30 days from start/last payment
  grace_period_end: Date | null;  // +7 days after missed payment
  payment_history: PaymentRecord[];
}
```

**Fee Model**

```typescript
const FLAT_FEE_USD = 1;
const FLAT_FEE_THRESHOLD_USD = 100;
const PERCENT_FEE = 0.0035;  // 0.35%

function calculateFee(tierPriceUsd) {
  if (tierPriceUsd < FLAT_FEE_THRESHOLD_USD) {
    return FLAT_FEE_USD;  // $1 flat for Tier A ($100)
  }
  return tierPriceUsd * PERCENT_FEE;  // 0.35% for Tier B ($200) = $0.70
}
```

### 2. Lightweight Wallet MCP (`packages/mcp-wallet/`)

**Purpose**: Provide wallet operations to deployed agents

**Package**: `@clawdrop/mcp` (NPM installable)

**Tech Stack**: Node.js, TypeScript, Solana SDK, Helius RPC

**Key Features**

- **Private key storage**: OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret) → env var → fail with instructions
- **5 wallet tools**:
  1. `get_balance` — Solana balance in SOL/tokens
  2. `send_transaction` — Transfer SOL or tokens
  3. `sign_transaction` — Sign without broadcasting
  4. `get_price` — Token price via Jupiter
  5. `swap_tokens` — Swap via Jupiter aggregator
- **Helius RPC** for transaction status + signatures

**Setup Wizard**

```bash
npx @clawdrop/mcp setup
# Prompts: private key (stores in OS keychain), Solana RPC endpoint
```

### 3. Travel Bundle (`packages/bundles/travel-crypto-pro/`)

**Purpose**: Add travel booking to agents (flights, hotels, Gnosis Pay)

**Tech Stack**: Node.js, TypeScript, Amadeus APIs, Gnosis Pay SDK

**5 MCP Tools**

1. **`search_travel_options`** — Amadeus flight search
2. **`search_hotels`** — Amadeus hotel search
3. **`build_itinerary`** — Assemble flight + hotel, apply policy
4. **`request_booking_approval`** — Gnosis Pay approval request
5. **`book_flight`** — Execute spend + confirm booking

**Core Abstractions**

- **Provider**: `FlightProvider` (Amadeus + future Duffel) and `HotelProvider` (Amadeus + future Booking.com)
- **Spending**: `checkSpendAvailability()`, `requestSpendApproval()`, `executeApprovedSpend()` (Gnosis Pay)
- **Policy**: `DEFAULT_POLICY` ($5k flights, $400/night hotels, <$2.5k auto-approve) and `ENTERPRISE_POLICY`

**Booking Flow**

```
1. search_travel_options(origin, destination, dates, adults)
   → returns 10 flights with IDs and prices
2. search_hotels(city_code, check_in, check_out, adults)
   → returns 10 hotels with IDs and prices
3. build_itinerary(flight_id, hotel_id)
   → policy check (violations? requires_approval?)
   → returns itinerary_id with status='draft'
4. request_booking_approval(itinerary_id)
   → Gnosis Pay spend request (if trip > $2500)
   → returns approval_request_id
5. book_flight(itinerary_id, approval_request_id, travelers, contact_email)
   → executeApprovedSpend() → provider.bookFlight()
   → returns booking_ref + Gnosis Chain tx
```

## Integration Points

### Control Plane ↔ Deployed Agent

**Deploy Time**
1. User calls `deploy_agent(tier_id, bundles=['solana', 'travel-crypto-pro'])`
2. Control plane:
   - Verifies payment (Solana devnet tx)
   - Allocates VPS IP
   - SSH: Creates Docker container with:
     - Base Node.js image
     - `npm install @clawdrop/mcp` (always)
     - `npm install @clawdrop/travel-crypto-pro` (if in bundles)
     - Env vars (agent_id, wallet, bundle secrets)
   - Waits for container ready (MCP stdio test)
   - Saves subscription + agent record

**Runtime**
- Agent runs OpenClaw (Kimi's orchestration layer)
- OpenClaw loads MCP servers from installed packages
- Claude connects via MCP stdio protocol
- Claude calls tools → MCP handlers → Solana RPC / external APIs

### Solana Integration

**Payment Verification**
- User signs transaction sending SOL/stablecoin to control plane wallet
- Control plane calls Helius: `getSignatureStatuses([tx_hash])`
- Marks payment as confirmed once on-chain

**Agent Wallet Operations**
- Agent (via @clawdrop/mcp) calls Helius RPC to:
  - Get balance
  - Send transactions
  - Verify signatures
  - Query token prices (Jupiter)

### External APIs

| API | Purpose | Auth | Used By |
|-----|---------|------|---------|
| **Helius** | Solana devnet RPC | API key | Control plane (payment verification), MCP wallet (balance/txs) |
| **Jupiter** | Token swaps, price feeds | Free | Control plane (fee quotes), MCP wallet (swap operations) |
| **Amadeus** | Flight & hotel search | Client ID/Secret | Travel bundle (search/booking) |
| **Gnosis Pay** | Spend approval, card charging | API key | Travel bundle (approval requests, executions) |

## Security Architecture

### Layer 1: Keychain-Based Key Storage
- Private keys stored in OS keychain (never touch disk)
- Fallback: env var `WALLET_PRIVATE_KEY` (for headless systems)
- Never logged (logger redacts `*key*`, `*secret*`, `*password*` fields)

### Layer 2: Environment Variable Secrets
- Real secrets from `.env` or system environment
- Dev/test secrets from `.env.local` (git-ignored)
- Validation on startup: fail hard in production if missing

### Layer 3: IDOR Prevention
- Every tool that accesses agent data checks: `agent.owner_wallet === caller_wallet`
- Prevents user A from accessing user B's agent

### Layer 4: HashiCorp Vault (Phase 2)
- Server-side signing: control plane signs on behalf of agent
- Transit Engine: key derivation, encryption-as-a-service
- Audit trail: every key operation logged

### Layer 5: Squads Multisig (Phase 2+)
- Multi-user wallets: DAO treasuries, team accounts
- Threshold signatures: 2-of-3, 3-of-5, etc.
- Approval workflows: large spends require multiple signers

## Deployment Architecture

### Current (Phase 1)

```
Control Plane (Mac laptop)
  ↓ (SSH)
VPS 2 (187.124.173.69, 4GB/2vCPU)
  ↓ (Docker)
Agent Container
  ↓ (MCP stdio)
Claude
```

**Blockers**: 
- VPS 2 SSH times out (firewall/key issue)
- HFSP API on localhost only (can't reach from Mac)

### Target (Phase 2)

```
Control Plane (Cloud server: AWS/GCP)
  ↓ (HTTPS)
Agent API (REST endpoints)
  ↓ (gRPC/WebSocket)
Multiple VPS (auto-scaling, load-balanced)
  ↓ (Docker Swarm or Kubernetes)
Thousands of agent containers
  ↓ (MCP stdio)
Claude (or Anthropic Agents framework)
```

## Metrics & Monitoring

**Agent Lifecycle**

```
deployed_at → provisioning → running → [paused/failed] → [stopped/cancelled]
              (2-5 min)     (30 days+)                   (grace: 7 days)
```

**Subscription Billing**

```
start_date → next_payment_due (+30 days) → [payment received] → next_payment_due
          → [payment failed] → grace_period_end (+7 days) → [auto-stop if not renewed]
```

**Usage Metrics** (collected by OpenClaw)

- Uptime seconds
- Tool calls (count by tool)
- Errors (count by type)
- Solana transactions (count, volume)
- External API calls (count, latency)

## File Structure

```
clawdrop/
├── packages/
│   ├── control-plane/
│   │   ├── src/
│   │   │   ├── db/memory.ts                  # Agent store + persistence
│   │   │   ├── services/
│   │   │   │   ├── tier.ts                   # Tier listing + pricing
│   │   │   │   ├── payment.ts                # Fee calculation
│   │   │   │   └── catalog.ts                # (placeholder)
│   │   │   ├── integrations/
│   │   │   │   ├── helius.ts                 # Payment verification
│   │   │   │   └── docker-ssh.ts             # Container deployment
│   │   │   ├── server/
│   │   │   │   ├── schemas.ts                # Zod + tool definitions
│   │   │   │   ├── tools.ts                  # 5 tool handlers
│   │   │   │   └── index.ts                  # MCP server entry
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts                 # Pino + redaction
│   │   │   │   └── key-vault.ts              # Secret retrieval
│   │   │   ├── config/
│   │   │   │   ├── tokens.ts                 # Token mints + Clawdrop wallet
│   │   │   │   └── index.ts
│   │   │   └── index.ts                      # Entry point (ts-node-esm)
│   │   ├── .env                              # Real credentials (git-ignored)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp-wallet/
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   │   ├── balance.ts
│   │   │   │   ├── send.ts
│   │   │   │   ├── sign.ts
│   │   │   │   ├── price.ts
│   │   │   │   └── swap.ts
│   │   │   ├── keystore.ts                   # OS keychain storage
│   │   │   ├── setup.ts                      # npx setup wizard
│   │   │   └── index.ts                      # MCP server entry
│   │   ├── bin/clawdrop-mcp                  # NPX binary
│   │   ├── package.json                      # name: @clawdrop/mcp
│   │   └── tsconfig.json
│   │
│   ├── bundles/
│   │   └── travel-crypto-pro/
│   │       ├── src/
│   │       │   ├── types/index.ts            # Shared type definitions
│   │       │   ├── providers/
│   │       │   │   ├── flights.ts            # Amadeus flight search + booking
│   │       │   │   └── hotels.ts             # Amadeus hotel search + booking
│   │       │   ├── payment/
│   │       │   │   └── gnosis-pay.ts         # Spend approval + execution
│   │       │   ├── policy/
│   │       │   │   └── travel-policy.ts      # Policy enforcement
│   │       │   ├── tools/
│   │       │   │   └── index.ts              # 5 MCP tools + schemas
│   │       │   └── index.ts                  # Bundle entry point
│   │       ├── package.json                  # name: @clawdrop/travel-crypto-pro
│   │       └── tsconfig.json
│   │
│   └── provisioner/                          # Kimi's VPS management (TODO)
│
├── .gitignore                                # Node modules, *.key, *-wallet.json
├── tsconfig.base.json                        # Monorepo base
├── package.json
│
├── MASTER_ARCHITECTURE.md                    # This file
├── DEPLOYMENT_RUNBOOK.md                     # How to deploy first agent
├── PHASE_2_3_ROADMAP.md                      # Future work
├── TRAVEL_BUNDLE_GUIDE.md                    # Travel bundle details
├── TRAVEL_BUNDLE_SUMMARY.md                  # Build summary
├── WALLET_SECURITY.md                        # Security model (Phase 1-5)
├── KIMI_STATUS_REPORT.md                     # VPS inventory + blockers
├── MESSAGE_FOR_KIMI_APR16.md                 # Action items for Kimi
└── README.md                                 # (root level overview)
```

## Phase 1 Completion Status

| Component | Status | LOC | Notes |
|-----------|--------|-----|-------|
| Control Plane | ✅ Complete | 1,200+ | Tier service, payment, DB, Docker SSH |
| Wallet MCP | ✅ Complete | 400+ | 5 tools, keychain storage, Helius integration |
| Travel Bundle | ✅ Complete | 1,441 | Amadeus, Gnosis Pay, policy, 5 tools |
| Zod Schemas | ✅ Complete | 200+ | All 5 control-plane tools + travel tools |
| Logger | ✅ Complete | 60 | Pino + field redaction + MCP stderr routing |
| Security | ✅ Partial | N/A | Keychain storage, IDOR checks, env validation |
| Testing | ❌ Pending | N/A | Need Amadeus sandbox credentials, mock Gnosis Pay |
| Docker Deployment | ❌ Pending | N/A | Need to fix VPS 2 SSH, update docker-ssh.ts |
| End-to-End | ❌ Pending | N/A | Requires Docker deployment + agent running |

---

**Next**: See `DEPLOYMENT_RUNBOOK.md` for step-by-step first deployment. See `PHASE_2_3_ROADMAP.md` for future work.
