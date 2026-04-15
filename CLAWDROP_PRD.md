# Clawdrop: Production Requirements Document

**Version**: 1.0  
**Date**: April 15, 2026  
**Status**: In Development (Phase 2)  
**Target Launch**: May 6, 2026  

---

## Problem Statement

### The Gap: From Agent Idea to Production Deployment

Users today can prompt an AI and get ideas for agents, but turning that agent into a **real, deployed, production-capable hosted agent** still requires significant manual work:

- **Infrastructure provisioning** — choosing, renting, and configuring servers
- **Runtime setup** — installing OS, dependencies, container runtimes
- **Tool/MCP installation** — wiring in the right capabilities and integrations
- **Wallet & payment integration** — handling crypto transactions and permissions
- **Policy configuration** — setting access controls, rate limits, and safeguards
- **Deployment lifecycle** — managing updates, monitoring, scaling, and recovery

For **crypto-native use cases**, the gap is even worse. There is no simple turnkey path for a user to say:

> "Deploy me an agent that can safely operate with crypto, policies, and domain-specific tools."

...without needing to manually assemble infrastructure, wallets, payment rails, and capability bundles.

### Why Existing Solutions Fall Short

Current solutions are **fragmented and incomplete**:

| Solution Type | What It Does | What It Misses |
|---|---|---|
| **General AI coding tools** | Help write agent code | No hosted deployment; no runtime provisioning |
| **MCP servers** | Provide modular tools | No packaged deployment flows; no hosting |
| **Cloud platforms** | Deploy apps/containers | Not agent-native; no crypto-aware payment |
| **Wallet/payment tooling** | Handle transactions | Don't manage full agent lifecycle |
| **Custom infra stacks** | Possible but manual | Too much work; high barrier |

**What's missing**: A system combining product selection, payment, deployment orchestration, hosted runtime provisioning, capability bundles, and post-deploy usability.

---

## Solution Vision

### Clawdrop: Control Plane MCP for Turnkey Agent Deployment

**Clawdrop** is a hosted control-plane MCP that lets users deploy production-capable, crypto-aware OpenClaw agents in minutes.

#### What a Successful Deployment Looks Like

1. User selects a tier (shared VPS or dedicated VPS)
2. User gets quoted in SOL/USDT/HERD
3. User verifies payment via Clawdrop's payment MCP
4. Clawdrop provisions a Dockerized OpenClaw runtime
5. Capability bundle auto-installs (Solana, research, treasury, etc.)
6. User gets SSH access and connection info
7. Agent runs until subscription lapses; grace period for failed payments

#### Core Architecture

```
Clawdrop MCP (Control Plane)
├── Sales interface
├── Payment orchestration (multi-token)
├── Deployment automation
├── Subscription management
└── Status tracking

User's OpenClaw Instance (Hosted Runtime)
├── Shared Docker or Dedicated VPS
├── Pre-installed capability bundles
├── User-managed config (SSH access)
└── Lives as long as subscription is active

User Access Points
├── Clawdrop CLI
├── Clawdrop MCP
├── SSH to agent VPS
└── Agent MCP/REST endpoints
```

---

## End-User Experience

### Primary User Journey

**Scenario**: Developer wants to deploy a Solana treasury-monitoring agent

```
1. Open Claude Code or terminal
2. Say: "Deploy a Solana treasury agent"
3. Choose tier: A ($50/mo shared) or B ($150/mo dedicated)
4. Get quote: "0.5 SOL"
5. Sign transaction (SOL, USDT, or HERD)
6. Agent deploys in < 5 minutes
7. Receive SSH info and agent endpoint
8. SSH in, configure policies, start using immediately
```

### Target Experience

- ✅ Deploy in **under 5 minutes**
- ✅ Make only **1–3 decisions**
- ✅ **No Docker/cloud/MCP wiring** — pre-packaged
- ✅ **Immediate SSH access**
- ✅ **Start using right away**

---

## Business Model & GTM

### Payment Model

- **Recurring monthly subscription**
- **Pay in SOL, USDT, HERD, or other Sol tokens** (via Clawdrop payment MCP)
- **Grace period for failed payments** (e.g., 7 days)
- **Agent terminates if payment not received during grace period**
- **Users can cancel anytime** (prorated)

### Tier Structure

- **Tier A (Shared Docker)**: Multiple agents per VPS; $40–60/mo equivalent
- **Tier B (Dedicated VPS)**: One agent per VPS; $100–200/mo equivalent
- **Tier C (Custom)**: Custom sizing; custom pricing

*(Exact tiers TBD; depend on infrastructure costs)*

### Primary GTM Targets

1. **Solana developers** — Builders needing hosted Solana agents
2. **Grant recipients** — Teams proving agent feasibility
3. **Superteam partners** — Early design partners
4. **Internal dogfooders** — Your team using Clawdrop

### Long-Term Vision (Post-May 6)

- Agent bundle marketplace
- Multi-region deployments, autoscaling
- API for embedded provisioning
- Capability marketplace

---

## User Stories

### Essential (May 6)

1. As a **Solana developer**, I want to deploy an agent with one command, so I can automate operations without managing infrastructure.

2. As a **builder**, I want pre-defined capability bundles (Solana, research, treasury), so I don't wire tools manually.

3. As a **user**, I want to pay with SOL/USDT/HERD, so I use crypto-native flows.

4. As a **user**, I want SSH access immediately, so I can customize right away.

5. As an **operator**, I want my agent to stay alive as long as I pay, so I can rely on it for operations.

6. As a **user**, I want a grace period for failed payment, so temporary issues don't kill my agent.

7. As a **builder**, I want to SSH and customize config, so I adapt it to my workflows.

8. As a **user**, I want to cancel anytime, so I don't pay for experiments forever.

9. As a **Solana developer**, I want pre-installed Solana MCPs, so I use Solana RPCs immediately.

10. As a **user**, I want to see agent status and payment history, so I understand what I'm paying for.

11. As an **operator**, I want clear error messages, so I know what went wrong.

12. As a **user**, I want to know if my agent is healthy, so I trust it for critical tasks.

13. As a **builder**, I want to see logs, so I can debug issues.

14. As an **admin**, I want to restart failed agents, so temporary issues don't require manual fixes.

15. As a **user**, I want to pay with SOL/USDT/HERD, so I use my preferred token.

16. As a **user**, I want on-chain payment verification, so I trust the transaction is real.

17. As a **user**, I want exact SOL pricing before paying, so I make informed decisions.

18. As a **user**, I want clear confirmation after payment, so I know deployment is processing.

### Post-May 6 (Nice to Have)

19. As a **user**, I want to upgrade tiers, so I scale if my agent becomes critical.

20. As an **operator**, I want auto-restart on failure, so temporary crashes don't require intervention.

21. As a **user**, I want to manage multiple agents, so I run different agents for different purposes.

22. As a **platform operator**, I want monitoring/alerting, so I catch issues before users.

23. As a **user**, I want rate limiting, so unexpected traffic doesn't cause runaway costs.

24. As a **user**, I want automated backups, so I can recover if something breaks.

---

## Implementation Decisions

### Deployment Model

**Two-tier model:**

- **Tier A (Shared Docker)**: Multiple agents in one containerized VPS
  - Lower cost, shared resources
  - Simpler orchestration
  - Suitable for lightweight, experimental deployments

- **Tier B (Dedicated VPS)**: One agent per dedicated Hostinger VPS
  - Higher cost, full resource isolation
  - User has complete control
  - Suitable for production, high-load deployments

**Rationale**: Matches infrastructure costs; users choose based on needs.

---

### Payment Orchestration

**Decision**: Use Clawdrop's payment MCP for multi-token SOL transactions

- Users pay in SOL, USDT, HERD, or other major Solana tokens
- Verify via Helius RPC (devnet for testing, mainnet for production)
- Subscription stored in DB with payment status and renewal date
- Recurring payments triggered by cron/scheduled task

**Rationale**: Crypto-native payment is core differentiation.

---

### Agent Lifecycle

**Decision**: Agent lifecycle tied to subscription payment

- Agent provisioned when payment confirmed
- Runs as long as subscription is active
- Failed payment triggers grace period (e.g., 7 days)
- Agent terminates if payment not received during grace period
- User can cancel anytime (prorated)

**Rationale**: Simple, aligns incentives.

---

### Configuration & User Control

**Decision**: User manages config via SSH; Clawdrop handles provisioning only

- Clawdrop provisions VPS/Docker and installs base OpenClaw + bundles
- User SSHes in and manages the rest: custom MCPs, policies, scaling, updates
- Clawdrop does not manage agent updates or orchestration
- User responsible for agent security and maintenance

**Rationale**: Keeps scope focused; gives users full control.

---

### Capability Bundles

**Decision**: Pre-defined, tier-specific bundles

- **Solana Bundle**: MCP-Solana, wallet, RPC, transaction verification
- **Research Bundle**: Web search, data aggregation, report generation
- **Treasury Bundle**: Portfolio tracking, DeFi integration, reporting
- **Custom Bundle**: User-specified MCPs

**Rationale**: Reduces decision paralysis.

*(Exact bundles TBD)*

---

### Infrastructure

**Decision**: Hostinger managed VPS + HFSP provisioner

- Shared Docker deployments on managed Hostinger VPS
- Dedicated VPS on individual Hostinger instances
- Clawdrop interacts via HFSP provisioner (on Kimi's VPS)
- All deployments are Dockerized

**Rationale**: Managed infrastructure; HFSP abstracts provisioning.

---

### Key Modules & Interfaces

**Clawdrop MCP**
- `list_tiers()` → Available tiers with pricing
- `quote_tier(tier_id)` → Price in SOL
- `deploy_agent(tier_id, payment_tx, capability_bundle)` → Provisions agent, returns SSH info
- `get_deployment_status(agent_id)` → Status, payment, SSH info
- `cancel_subscription(agent_id)` → Stops agent, ends subscription

**Payment MCP**
- `verify_payment(tx_hash)` → On-chain verification via Helius
- `quote_price(amount_in_usd)` → Equivalent in SOL/USDT/HERD

**Database**
- Deployments: `{agent_id, user_id, tier_id, status, payment_status, ssh_info, created_at, expires_at}`
- Payments: `{tx_hash, user_id, amount_sol, verified_at, next_renewal}`
- Tiers: `{tier_id, name, vps_type, price_sol, capability_bundle}`

**HFSP Provisioner**
- HTTP API to provision Docker/VPS
- Receives deployment request, provisions OpenClaw instance
- Returns connection info (IP, SSH key, port)

---

## Testing Strategy

### Philosophy

- Test external behavior, not implementation details
- Integration tests for tier → payment → deployment → running flow
- E2E tests for full user journey
- Mock external services for unit tests; real calls for integration/E2E

### Coverage by Module

**Clawdrop MCP Tools** (Priority: HIGH)
- `list_tiers()` returns all tiers correctly
- `quote_tier()` returns accurate SOL price
- `deploy_agent()` with valid payment succeeds
- `deploy_agent()` with invalid payment fails gracefully
- `get_deployment_status()` returns correct status

**Payment Verification** (Priority: HIGH)
- `verify_payment()` with real devnet tx returns success
- `verify_payment()` with fake tx returns failure
- Grace period logic works correctly
- Payment retry logic functions

**Deployment Provisioning** (Priority: HIGH)
- Real deployment to HFSP provisioner succeeds
- Agent SSH info returned and accessible
- Capability bundle installed correctly
- Agent terminates when subscription expires

**Database & State** (Priority: MEDIUM)
- Deployment records created and persisted
- Payment records linked correctly
- Subscription state transitions correctly

**Error Handling** (Priority: MEDIUM)
- HFSP unreachable → clear error
- Helius timeout → retry with backoff
- Deployment timeout → marked as failed
- Payment verification timeout → agent marked pending

### Test Timeline

**Week 1–2**: Unit & mocked integration (mock Helius, mock HFSP)  
**Week 3–4**: Real integration (real Helius devnet, real HFSP provisioner)  
**Week 5–7**: E2E with real users (real SOL payments, full journey)  

---

## Out of Scope (for May 6)

- **Multi-region deployments** — Single Hostinger region initially
- **Auto-scaling** — Manual resize/redeploy
- **Agent auto-updates** — User manages updates
- **Advanced monitoring** — SSH + logs only; no central dashboard
- **API for third-party provisioning** — User-facing tool, not platform API
- **Capability bundle marketplace** — Fixed bundles only
- **Backup/disaster recovery** — User responsibility
- **Compliance/KYC** — No verification
- **Web UI** — MCP + CLI only
- **Live support** — Docs and runbooks only

---

## Success Metrics

### May 6 Success Criteria

Clawdrop is production-ready when:

1. ✅ **One clear gold-path flow** — tier → payment → deployment → SSH works
2. ✅ **At least one capability bundle** — Solana bundle functional
3. ✅ **Real payment verification** — Helius integration working
4. ✅ **Real provisioning** — HFSP successfully deploys agents
5. ✅ **Persistent records** — Database stores deployments correctly
6. ✅ **Clear docs** — Setup, deployment, troubleshooting guides
7. ✅ **Error recovery** — Handles common failures gracefully
8. ✅ **Independent user testing** — Internal and ecosystem partners deploy without help

### Measurable Targets

By May 6:

- **10+ successful real deployments** (regardless of payment status)
- **< 5 minutes median deployment time**
- **90%+ deployment success rate**
- **1 production-ready capability bundle**
- **1 demoable use case** (e.g., Solana agent querying balances)
- **Complete documentation**

### Verification

**Technical**: Run E2E test suite; deploy 10 agents manually; verify agent can execute operations  
**User**: Have internal team + 1–2 partners deploy independently; collect feedback  

---

## Further Notes

### Design Principles

1. **User control** — Users SSH in and manage; Clawdrop provisions only
2. **Crypto-native** — SOL/tokens; no credit cards
3. **Open ecosystem** — Users can install custom MCPs
4. **Clear economics** — Transparent pricing; subscription aligns with VPS costs
5. **Minimal abstraction** — Don't hide complexity

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| HFSP unreachable | Daily SSH checks; fallback to manual Docker |
| Helius rate limits | Cache pricing; exponential backoff |
| Payment delays | Mark agents "pending"; 2-hour timeout |
| Agent startup failure | Capture logs; provide error + recovery steps |
| User forgets payment | Renewal reminders; grace period |

### Post-May 6 Roadmap

**Phase 2 (May–June)**: Web dashboard, advanced monitoring, multi-region  
**Phase 3 (June–July)**: API for partners, auto-scaling, enterprise SLAs, KYC  

---

## Appendix: Definitions

**Agent**: OpenClaw instance on managed infrastructure with capability bundles.  
**Capability Bundle**: Pre-configured MCPs/integrations (Solana, research, etc.).  
**Clawdrop MCP**: Control-plane interface for deploying/managing agents.  
**HFSP Provisioner**: Infrastructure orchestration service.  
**OpenClaw**: Open-source AI agent framework.  
**Tier**: Deployment option (shared Docker vs. dedicated VPS).  
**Subscription**: Monthly payment for running agent.  

---

**Next step**: Design phase — finalize tier structures, confirm bundles, estimate costs  
