# Phase 2 & 3 Roadmap

**Current**: Phase 1 Complete (MVP with core payment, agents, travel bundle)  
**Next**: Phase 2 (Production Readiness) → Phase 3 (Scale & Ecosystem)

## Phase 2: Production Readiness (Q2-Q3 2026)

### Theme: Hardening, Security, Real Payments

| Epic | Priority | Effort | Owner | Status |
|------|----------|--------|-------|--------|
| **Docker Deployment** | Critical | 1 week | Infrastructure | 🔴 Blocked (VPS 2 SSH) |
| **Production Payment** | Critical | 2 weeks | Payment | 🟡 In Progress |
| **Security Audit** | Critical | 2 weeks | Security | 🟡 Planned |
| **Database Persistence** | High | 1 week | Backend | ⚪ Pending |
| **Monitoring & Alerting** | High | 1 week | DevOps | ⚪ Pending |
| **Gnosis Pay Production** | High | 2 weeks | Payment | ⚪ Pending |
| **Team Wallets (Squads)** | Medium | 2 weeks | Product | ⚪ Pending |
| **Duffel Provider** | Medium | 1 week | Travel | ⚪ Pending |
| **Rate Limiting & Quotas** | Medium | 1 week | Backend | ⚪ Pending |

---

## Phase 2 Details

### 1. Docker Deployment (1 week)

**What**: Fix VPS 2 SSH, finish Docker integration in control-plane

**Blockers**
- VPS 2 (187.124.173.69): SSH times out — needs provisioner key + ufw fix
- HFSP API localhost-only — can't reach from Mac control plane

**Tasks**
- [ ] Add Kimi's provisioner public key to VPS 2 `authorized_keys`
- [ ] Disable/configure `ufw` on VPS 2 (allow SSH port 22)
- [ ] Verify Docker installed on VPS 2, test basic `docker run`
- [ ] Update `docker-ssh.ts`: test SSH connectivity on startup
- [ ] Update Docker build: `npm install @clawdrop/mcp` + bundle packages
- [ ] Pass bundle env vars (AMADEUS_CLIENT_ID, etc.) to container
- [ ] Test full deployment flow: `deploy_agent()` → Docker running → MCP responsive

**Success Criteria**
- [ ] First agent deployed to Docker in <5 min
- [ ] Agent container running, MCP server responsive
- [ ] Tools callable via Claude Desktop

---

### 2. Production Payment (2 weeks)

**What**: Real Solana transaction verification, Jupiter swaps for fee payment

**Current**: Helius integration partial (gets signature status)  
**Missing**: Fee calculation for non-SOL tokens, Jupiter swap routing

**Tasks**
- [ ] Wire Helius signature verification into `verifyPayment()`
- [ ] Implement Jupiter swap quote: `amount_usd` → `amount_token`
  - Example: "user paying $100 in USDC" → "quote 100.35 USDC" (includes 0.35% fee)
- [ ] Add payment tracking: record Jupiter swap details in `PaymentRecord`
- [ ] Mainnet migration: update token mints, RPC endpoints
- [ ] Add mainnet wallet funding instructions in docs
- [ ] Test with real SOL/USDT on devnet → confirm Helius verification

**Success Criteria**
- [ ] Full payment flow works: user sends token → control plane verifies → agent deployed
- [ ] Fee calculation correct for all 4 tokens (SOL, USDT, USDC, HERD)
- [ ] Mainnet ready (just flip env vars)

---

### 3. Security Audit (2 weeks)

**What**: Third-party security review + fixes

**Scope**
- [ ] Private key handling (keychain storage, env vars, logging)
- [ ] API authentication (IDOR checks, ownership validation)
- [ ] Solana transaction signing (no exposure of keys, proper serialization)
- [ ] Dependency supply chain (lock files, audit npm packages)
- [ ] Secrets management (env var validation, startup checks)
- [ ] Docker image security (minimal base image, no root)
- [ ] Rate limiting & DDoS protection

**Likely Findings**
- Missing rate limiting on API endpoints
- Need TLS/HTTPS for production
- Docker running as root (should be unprivileged user)
- Secrets logged in debug mode
- Missing permission checks on some operations

**Success Criteria**
- [ ] Third-party audit completed
- [ ] All critical/high findings fixed
- [ ] Security checklist for Phase 3

---

### 4. Database Persistence (1 week)

**What**: Move from in-memory JSON to real database

**Current**: Agents stored in-memory + JSON backup to disk  
**Problem**: Agent data lost on restart, no transaction safety

**Options**
- **PostgreSQL** (recommended): Production-grade, ACID, easy backups
- **SQLite**: Lightweight, file-based, good for < 10k agents
- **Firestore**: Managed, auto-scaling, no DevOps

**Tasks (PostgreSQL)**
- [ ] Set up PostgreSQL (local dev, managed prod)
- [ ] Create schema: agents, subscriptions, payments, logs
- [ ] Migrate memory.ts to postgres queries (Prisma or raw pg)
- [ ] Add migrations (flyway or pg-migrate)
- [ ] Implement connection pooling (pg-pool)
- [ ] Add backup automation (daily snapshots, point-in-time recovery)

**Success Criteria**
- [ ] Agent data survives service restart
- [ ] Sub-100ms queries for agent lookups
- [ ] Daily backups automated

---

### 5. Monitoring & Alerting (1 week)

**What**: Real-time visibility into agent health, payment processing, errors

**Metrics to Track**
- Agent uptime % per agent + aggregate
- Tool call success rate (by tool)
- Solana RPC latency
- Docker container health (CPU, memory, disk)
- Payment processing time (SOL → agent deployment)
- Errors (by component: payment, Docker, MCP)

**Tools**
- **Prometheus** + **Grafana** (open-source)
- **Datadog** (SaaS, easier)
- **New Relic** (SaaS, enterprise-grade)

**Tasks**
- [ ] Add Prometheus metrics to control-plane (payment time, deployment time, errors)
- [ ] Add container metrics export (cAdvisor)
- [ ] Build Grafana dashboard: agent uptime, payment SLA, error rate
- [ ] Set up alerts (PagerDuty integration)
- [ ] Health check endpoint: `/health` → { status, uptime, agents_count }

**Success Criteria**
- [ ] Dashboard shows real-time agent status
- [ ] Alerts fire for 99.5% SLA breach
- [ ] Root cause analysis available in logs

---

### 6. Gnosis Pay Production (2 weeks)

**What**: Real Visa card spending (not sandbox mock)

**Current**: Sandbox mode (`GNOSIS_PAY_SANDBOX=true`) — all requests return mocks

**Tasks**
- [ ] Apply for Gnosis Pay partnership (business verification)
- [ ] Get production API credentials
- [ ] Update `gnosis-pay.ts`: remove sandbox check, call real API
- [ ] Implement virtual card issuance (Gnosis → Visa)
- [ ] Add webhook handling for spend notifications
- [ ] Implement refund/chargeback flow
- [ ] Legal: Add Gnosis Pay ToS to Clawdrop terms

**Integration Points**
- Travel bundle: `executeApprovedSpend()` charges Visa card
- Agent wallet: can request spend approvals for any purchase
- Dashboard: users see card balance, spending history

**Success Criteria**
- [ ] Real travel booking charges work (flight → Gnosis Pay → Visa → airline)
- [ ] Spend approvals sync between agent and Gnosis Pay mobile app
- [ ] Wallet reconciliation: Gnosis Pay balance matches agent balance

---

### 7. Team Wallets / Multisig (2 weeks)

**What**: Multiple signers, thresholds (2-of-3, 3-of-5, etc.)

**Tech**: Squads Protocol on Solana (DAO Treasury standard)

**Use Cases**
- DAOs: 3-of-5 multisig for treasury agent
- Teams: 2-of-3 for company spending
- Individuals: 1-of-1 (existing, just Squads-wrapped)

**Tasks**
- [ ] Integrate Squads SDK into agent wallet
- [ ] Update agent creation: allow `multisig: { signers: [...], threshold: 2 }`
- [ ] Update transaction signing: serialize for Squads, collect signatures
- [ ] Add approval flow: other signers see pending tx, approve/reject
- [ ] Support spending limits per signer (approval bypass for <$X)
- [ ] Update schemas, DB, control-plane

**Success Criteria**
- [ ] DAO can create multisig agent
- [ ] Large spends require approval from multiple team members
- [ ] Spending limits work per-signer

---

### 8. Duffel Provider (1 week)

**What**: Add Duffel as second flight provider (richer content)

**Duffel Advantages** (once approved)
- Seat maps, ancillaries (baggage, seat selection)
- Better airline partnerships
- More flexible booking options

**Tasks**
- [ ] Apply for Duffel business approval (takes 1-2 weeks)
- [ ] Implement `FlightProvider` for Duffel SDK
- [ ] Route search requests: Amadeus + Duffel, merge results
- [ ] Add provider selection toggle (default: Amadeus)
- [ ] Update docs

**Success Criteria**
- [ ] Flights from both providers searchable
- [ ] Booking via Duffel works alongside Amadeus

---

### 9. Rate Limiting & Quotas (1 week)

**What**: Prevent abuse, fair usage for all agents

**Limits to Implement**
- API calls: 1000/day per agent (configurable by tier)
- Solana transactions: 100/day per agent
- Spending: Daily/monthly caps per agent + wallet
- Tool calls: 10/min per agent (avoid thrashing)

**Implementation**
- Redis for fast rate limiting (or in-memory with caution)
- Add middleware: check rate limit before each API call
- Return 429 Too Many Requests if exceeded

**Success Criteria**
- [ ] API limits prevent abuse
- [ ] Tier B can do 1000 API calls/day, Tier A has 500/day
- [ ] Clear error message when limit hit

---

## Phase 3: Scale & Ecosystem (Q3-Q4 2026)

### Theme: Platform Ecosystem, Third-party Integrations, Enterprise

| Epic | Priority | Effort | Owner | Status |
|------|----------|--------|-------|--------|
| **Bundle Marketplace** | High | 3 weeks | Product | ⚪ Pending |
| **Agent Monetization** | High | 2 weeks | Product | ⚪ Pending |
| **Enterprise SSO** | Medium | 2 weeks | Auth | ⚪ Pending |
| **Advanced Analytics** | Medium | 2 weeks | Analytics | ⚪ Pending |
| **Mobile App** | Low | 4 weeks | Mobile | ⚪ Pending |
| **Mainnet Production** | Critical | 1 week | Ops | ⚪ Pending |

---

## Phase 3 Details (High Level)

### 1. Bundle Marketplace
- Developers create bundles (research, treasury, DeFi, etc.)
- Submit to marketplace with pricing (fixed or % revenue share)
- Users discover, install, rate bundles
- Clawdrop takes 30% of bundle revenue

### 2. Agent Monetization
- Agents can earn SOL by providing services to other agents
- Example: "sleep agent" charges others to schedule delayed actions
- Wallet-to-wallet payments, micropayments at scale
- Clawdrop SDK for agent-to-agent communication

### 3. Enterprise SSO
- SAML, OAuth, Okta integration
- Bulk agent provisioning API
- Team/org management dashboard

### 4. Advanced Analytics
- Which bundles are most used?
- Which tools are most profitable?
- Cost per agent, revenue per agent
- Adoption curves, retention metrics

### 5. Mobile App
- React Native app for agent management
- Push notifications for approvals (Gnosis Pay, multisig)
- Wallet management on mobile
- Real-time agent logs

### 6. Mainnet Production
- Move from Solana devnet to mainnet
- Real money, real agents, real risk
- Requires all Phase 2 security completed
- Insurance/liability coverage

---

## Timeline Summary

```
Phase 1: COMPLETE ✅ (Apr 2026)
├── Control plane
├── Wallet MCP
├── Travel bundle
└── MVP ready

Phase 2: Q2-Q3 (May-Aug 2026) — 8 weeks
├── [Week 1] Docker deployment fix
├── [Week 2-3] Production payment (Jupiter swaps)
├── [Week 4-5] Security audit + fixes
├── [Week 6] Database (PostgreSQL)
├── [Week 7] Monitoring (Prometheus + Grafana)
├── [Week 8] Gnosis Pay production
├── [Parallel] Squads multisig
├── [Parallel] Duffel provider
└── [Parallel] Rate limiting

Phase 3: Q3-Q4 (Aug-Dec 2026) — 12 weeks
├── Bundle marketplace
├── Agent monetization
├── Enterprise features
├── Mobile app
└── Mainnet launch
```

## Dependency Graph

```
┌─────────────────┐
│ Phase 1 Done    │
│ (MVP MVP        │
└────────┬────────┘
         │
         ↓
    ┌────────────────────────┐
    │ Docker Deployment      │ ← CRITICAL PATH
    │ (Fix VPS 2 SSH)        │
    └────────┬───────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Production Payment             │
    │ (Jupiter swaps, real txs)      │
    │ Security Audit                 │
    │ Database (PostgreSQL)          │
    │ Monitoring                     │
    │ Gnosis Pay Production          │
    └────────┬──────────────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Mainnet Launch                 │
    │ (All Phase 2 complete)         │
    └────────┬──────────────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Phase 3: Ecosystem             │
    │ (Marketplace, monetization)    │
    └───────────────────────────────┘
```

---

## Success Metrics

**Phase 2 Complete When**
- [ ] 10+ agents deployed and running >7 days uptime
- [ ] $1000+ in fees collected (mainnet)
- [ ] Zero critical security issues
- [ ] <5 min avg agent deployment time
- [ ] 99.5% API uptime

**Phase 3 Complete When**
- [ ] 100+ agents deployed
- [ ] 10+ bundles in marketplace
- [ ] 50% of agents using ≥2 bundles
- [ ] Mobile app launched (iOS + Android)
- [ ] Enterprise customers onboarded

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Solana network outage | High | Use failover RPC, cache prices |
| Security breach | Critical | Audit, insurance, incident response plan |
| Gnosis Pay approval delay | Medium | Keep sandbox for testing, Amadeus fallback |
| Low adoption | Medium | Partner ecosystem (DAOs, teams), marketing |
| Competing platforms | High | Focus on developer experience, NFT rewards |

---

**Owner**: Product team  
**Last Updated**: 2026-04-16  
**Next Review**: 2026-05-16
