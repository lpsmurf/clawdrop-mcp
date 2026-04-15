# Clawdrop: AI Agent Provisioning Platform

**Turn Claude into an autonomous agent with wallet access and crypto-native capabilities.**

```
┌─────────────────────────────────────────────────┐
│  Claude Desktop / Claude Code                   │
│  "Book me a flight to NYC and transfer $100"    │
└─────────────────┬───────────────────────────────┘
                  │ MCP stdio
                  ↓
┌─────────────────────────────────────────────────┐
│  Clawdrop Agent (Docker Container)              │
│  - Solana wallet (sign, send, swap)             │
│  - Travel tools (search flights, book hotels)   │
│  - Gnosis Pay spend approval                    │
└─────────────────┬───────────────────────────────┘
                  │ SSH
                  ↓
┌─────────────────────────────────────────────────┐
│  Control Plane                                  │
│  - Deploy agents                                │
│  - Manage billing (Solana devnet/mainnet)       │
│  - Route payments                               │
└─────────────────────────────────────────────────┘
```

## Features

✅ **Agent Provisioning**: Deploy Claude agents with Solana wallet in <5 min  
✅ **Wallet Operations**: Sign, send, swap tokens via MCP tools  
✅ **Travel Booking**: Search flights/hotels, Gnosis Pay spend approvals  
✅ **Payment Processing**: Solana devnet/mainnet, fee calculation, subscription billing  
✅ **Modular Bundles**: Solana (core), Research (planned), Treasury (planned), Travel Crypto Pro (done)  
✅ **Security**: Keychain-based key storage, IDOR prevention, secret redaction  
✅ **Type Safety**: Full Zod validation, TypeScript strict mode  

## Getting Started (5 min)

### Prerequisites

```bash
# Node.js 20+
node --version  # v20.x or higher

# Solana wallet with devnet SOL (free)
# https://phantom.app or https://backpack.app
# Faucet: https://faucet.solana.com
```

### 1. Clone & Install

```bash
git clone git@github.com:lpsmurf/clawdrop-mcp.git
cd clawdrop
npm install
```

### 2. Start Control Plane

```bash
cd packages/control-plane
npm run dev

# [info] Control plane listening on 127.0.0.1:3000
```

### 3. Test It

```bash
# In another terminal
curl http://localhost:3000/tiers | jq

# See: Tier A ($100), Tier B ($200), Tier C (custom)
```

See **[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)** for full first deployment.

---

## Documentation

| Doc | Purpose | Audience |
|-----|---------|----------|
| **[MASTER_ARCHITECTURE.md](./MASTER_ARCHITECTURE.md)** | Complete system design, all components | Engineers, architects |
| **[DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)** | Step-by-step first agent deployment | New users, ops |
| **[TRAVEL_BUNDLE_GUIDE.md](./TRAVEL_BUNDLE_GUIDE.md)** | Travel bundle deep dive | Product managers, integrators |
| **[TRAVEL_BUNDLE_SUMMARY.md](./TRAVEL_BUNDLE_SUMMARY.md)** | Travel bundle build summary | Code reviewers |
| **[PHASE_2_3_ROADMAP.md](./PHASE_2_3_ROADMAP.md)** | Future work (production, scale) | Leadership, product |
| **[WALLET_SECURITY.md](./WALLET_SECURITY.md)** | Security model (5 layers) | Security team, users |
| **[KIMI_STATUS_REPORT.md](./KIMI_STATUS_REPORT.md)** | VPS inventory, blockers | Infrastructure team |

---

## Project Structure

```
packages/
├── control-plane/              # Agent management & billing (MCP server)
│   ├── src/
│   │   ├── db/                 # In-memory + JSON persistence
│   │   ├── services/           # Tier, payment, catalog
│   │   ├── integrations/       # Helius, Docker SSH
│   │   ├── server/             # MCP tools & schemas
│   │   └── utils/              # Logger, key vault
│   └── .env                    # Real credentials (git-ignored)
│
├── mcp-wallet/                 # Solana wallet MCP (deployed in agents)
│   ├── src/
│   │   ├── tools/              # get_balance, send_tx, sign, swap, price
│   │   ├── keystore.ts         # OS keychain storage
│   │   └── setup.ts            # npx setup wizard
│   └── bin/
│       └── clawdrop-mcp        # NPX binary
│
└── bundles/
    └── travel-crypto-pro/      # Flight + hotel booking with Gnosis Pay
        ├── src/
        │   ├── types/          # Shared type definitions
        │   ├── providers/      # Amadeus flights + hotels
        │   ├── payment/        # Gnosis Pay approval + spending
        │   ├── policy/         # Travel policy enforcement
        │   └── tools/          # 5 MCP tools
        └── README.md           # Usage guide
```

---

## Key Concepts

### Tiers & Pricing

| Tier | VPS | Price | Bundles | Best For |
|------|-----|-------|---------|----------|
| **A** | Shared | $100/mo | All | Experiments, prototypes |
| **B** | Dedicated | $200/mo | All | Production agents |
| **C** | Custom | Custom | All | Enterprise customers |

Fees: <$100 = $1 flat, ≥$100 = 0.35%

### Bundles

| Bundle | Purpose | Status | Tools |
|--------|---------|--------|-------|
| **solana** (core) | Wallet operations | ✅ Done | balance, send, sign, swap, price |
| **research** | Web search, analysis | 🔄 Planned | search, summarize, sentiment |
| **treasury** | DAO/team accounting | 🔄 Planned | track, report, audit |
| **travel-crypto-pro** | Flights, hotels, Gnosis Pay | ✅ Done | search, book, approve_spend |

### Payment Flow

```
User (devnet wallet with SOL)
  ↓ sends SOL to Clawdrop wallet
Solana Devnet
  ↓ transaction
Control Plane (Helius RPC verification)
  ↓ checks signature status
  ↓ calculates fees (flat or %)
  ↓ creates agent (Docker)
Docker VPS
  ↓ runs agent container
Agent (MCP server)
  ↓ Claude connects via stdio
Claude Desktop
  ↓ calls tools
```

---

## Core Technologies

| Layer | Stack |
|-------|-------|
| **API** | Node.js 20, TypeScript, MCP stdio protocol |
| **Validation** | Zod schemas (strict input/output types) |
| **Blockchain** | Solana (devnet/mainnet), Helius RPC, Jupiter aggregator |
| **Payments** | SOL, USDT, USDC, HERD (token swaps via Jupiter) |
| **Spending** | Gnosis Pay (Visa card on Gnosis Chain) |
| **Infrastructure** | Docker, SSH, Hostinger VPS |
| **Travel** | Amadeus APIs (flights/hotels), Gnosis Pay (spend) |
| **Logging** | Pino (structured, field redaction) |
| **Security** | OS Keychain (macOS/Win/Linux), Helius for verification |

---

## Current Status

### Phase 1: ✅ Complete (MVP)

- [x] Control plane (5 MCP tools, Zod schemas)
- [x] Wallet MCP (5 wallet tools, keychain storage)
- [x] Travel bundle (Amadeus, Gnosis Pay, 5 tools)
- [x] Payment verification (Helius integration)
- [x] Database (in-memory + JSON backup)
- [x] Security (keychain, IDOR checks, log redaction)

### Phase 2: 🟡 In Progress (Production)

- [ ] **CRITICAL**: Fix VPS 2 SSH (see `MESSAGE_FOR_KIMI_APR16.md`)
- [ ] Docker deployment (full test)
- [ ] Production payment (Jupiter swaps for non-SOL)
- [ ] Security audit (third-party review)
- [ ] Database persistence (PostgreSQL)
- [ ] Monitoring & alerting (Prometheus/Grafana)
- [ ] Gnosis Pay production (business partnership)

### Phase 3: ⚪ Planned (Scale)

- [ ] Bundle marketplace
- [ ] Agent monetization
- [ ] Enterprise SSO
- [ ] Mobile app
- [ ] Mainnet launch

---

## Getting Help

### I want to...

**...deploy my first agent**  
→ See [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) (15 min)

**...understand the architecture**  
→ See [MASTER_ARCHITECTURE.md](./MASTER_ARCHITECTURE.md) (30 min)

**...add a new travel provider (Duffel, Booking.com)**  
→ See `packages/bundles/travel-crypto-pro/src/providers/flights.ts` (template)

**...create my own bundle**  
→ Copy `travel-crypto-pro` structure, implement your tools, register in control-plane

**...check what's next**  
→ See [PHASE_2_3_ROADMAP.md](./PHASE_2_3_ROADMAP.md) (1-2 hour read)

**...report a security issue**  
→ Email security@clawdrop.dev (responsible disclosure)

---

## Development

### Environment

```bash
# Use Node 20+
node --version

# Install monorepo dependencies
npm install

# Build all packages
npm run build

# Type check
npm run typecheck

# Start control plane (development mode)
cd packages/control-plane
npm run dev
```

### Testing

```bash
# Test control plane APIs
curl http://localhost:3000/tiers | jq

# Test travel bundle locally
cd packages/bundles/travel-crypto-pro
npm run typecheck
AMADEUS_ENV=test npm run dev

# Test wallet MCP setup
cd packages/mcp-wallet
npx . setup  # launches wizard
```

### Useful Scripts

```bash
# Run all type checks
npm run typecheck

# Format code
npm run format

# Run tests (when available)
npm test
```

---

## Deployment (Production)

### Prerequisites

1. **Solana Mainnet Wallet**: Funded with SOL for gas
2. **VPS Hosting**: Hostinger or similar (we use Tier B dedicated VPS)
3. **SSL Certificate**: For HTTPS (Let's Encrypt)
4. **Database**: PostgreSQL or managed alternative
5. **Monitoring**: Prometheus/Grafana or Datadog

### Checklist

- [ ] Environment variables configured (mainnet RPC, Helius API, etc.)
- [ ] Database running and migrations applied
- [ ] SSL/TLS configured
- [ ] Secrets in vault (not .env files)
- [ ] Monitoring dashboards active
- [ ] Rate limiting enabled
- [ ] Backup automation configured
- [ ] Security audit passed
- [ ] Incident response plan documented

See [PHASE_2_3_ROADMAP.md](./PHASE_2_3_ROADMAP.md) for detailed checklist.

---

## Contributing

We welcome contributions! Areas of active development:

- [ ] Phase 2 epics (Docker, production payment, security audit)
- [ ] New travel providers (Duffel, Booking.com, Viator)
- [ ] New bundles (research, treasury, DeFi, NFT)
- [ ] Mobile companion app
- [ ] Bundle marketplace

See [PHASE_2_3_ROADMAP.md](./PHASE_2_3_ROADMAP.md#phase-2-production-readiness-q2-q3-2026) for task board.

---

## License

(To be determined)

---

## Team

- **Architecture & Core**: Claude (AI Agent)
- **Infrastructure & VPS**: Kimi
- **Travel Bundle**: Claude (AI Agent)

---

## Roadmap at a Glance

```
Phase 1: MVP ✅ (Apr 2026)
Phase 2: Production (May-Aug 2026)
Phase 3: Ecosystem (Aug-Dec 2026)
Phase 4+: Enterprise & Scale (2027+)
```

**Current Blockers**:
1. VPS 2 SSH timeout (infrastructure)
2. Gnosis Pay business approval (travel spending)
3. Security audit (Phase 2)

**Next 2 Weeks**:
1. Fix VPS 2 SSH
2. Complete Docker deployment
3. Run security audit
4. Get Amadeus sandbox credentials
5. Test travel booking end-to-end

---

## Quick Links

- **GitHub**: https://github.com/lpsmurf/clawdrop-mcp
- **Solana Faucet**: https://faucet.solana.com
- **Phantom Wallet**: https://phantom.app
- **Amadeus Developer**: https://developers.amadeus.com
- **Gnosis Pay**: https://gnosispay.com

---

**Status**: Phase 1 Complete, Ready for Phase 2  
**Last Updated**: 2026-04-16  
**Maintained By**: Claude AI Agent (with Kimi on infrastructure)
