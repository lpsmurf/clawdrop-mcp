# Clawdrop: Multi-Phase Implementation Plan

**Based on PRD**: CLAWDROP_PRD.md  
**Prepared**: April 15, 2026  
**Target Completion**: May 6, 2026  

---

## Overview

This plan breaks the Clawdrop PRD into **three phases** using **tracer-bullet vertical slices** — each phase delivers a thin, fully-working slice of the product end-to-end.

**Timeline**:
- **Phase 1** (Apr 15–18, 3 days): Foundation & core MCP — Tier selection, quoting, basic deployment
- **Phase 2** (Apr 18–25, 7 days): Real integrations — Helius payment verification, HFSP provisioning, subscription lifecycle
- **Phase 3** (Apr 25–May 6, 11 days): Polish & production hardening — E2E testing, docs, error recovery, dashboard

---

## Phase 1: Foundation & Core MCP (Apr 15–18)

### Objective

Ship a working Clawdrop MCP that can:
1. List available tiers with pricing
2. Quote deployment cost in SOL
3. Accept tier selection and deployment request
4. Provision a basic agent (mock HFSP initially)
5. Return deployment status

This is the **skeleton** of the system — all the core MCP tools work, but integrations are stubbed.

### Deliverables

#### 1a. MCP Tools (Clawdrop Core)

**File**: `packages/control-plane/src/server/tools.ts`

- ✅ `list_tiers()` tool
  - Returns: `[{id: "a", name: "Solana-Starter", price_sol: 0.5, vps_type: "shared-docker"}, ...]`
  - Source: hardcoded tiers (from CLAWDROP_PRD.md)

- ✅ `quote_tier(tier_id)` tool
  - Input: tier_id
  - Output: `{tier_id, tier_name, price_sol, currency_options: ["SOL", "USDT", "HERD"]}`
  - Uses mock Helius rates (hardcoded)

- ✅ `deploy_agent(tier_id, capability_bundle)` tool
  - Input: tier_id, bundle (e.g., "solana", "research")
  - Output: `{agent_id, status: "provisioning", ssh_info: {host, user, port}, estimated_ready_in: "3 mins"}`
  - Calls mock HFSP provisioner (returns fake agent immediately; no real VPS yet)

- ✅ `get_deployment_status(agent_id)` tool
  - Input: agent_id
  - Output: `{agent_id, status, payment_status, ssh_info, created_at, expires_at}`

- ✅ `cancel_subscription(agent_id)` tool
  - Input: agent_id
  - Output: `{agent_id, status: "cancelled", refund_amount_sol}`

#### 1b. Database Layer (In-Memory)

**File**: `packages/control-plane/src/db/memory.ts`

- ✅ Deployments table: `{agent_id, user_id, tier_id, status, payment_status, created_at, expires_at, ssh_info}`
- ✅ Payments table: `{tx_hash, user_id, amount_sol, verified, created_at}`
- ✅ Tiers table: `{tier_id, name, vps_type, price_sol, capability_bundle}`

CRUD operations:
- `createDeployment()`, `getDeployment()`, `updateDeployment()`, `listDeployments()`
- `createPayment()`, `getPayment()`, `verifyPayment()`
- `listTiers()`

#### 1c. Schemas & Validation

**File**: `packages/control-plane/src/server/schemas.ts`

- ✅ Input schemas: `ListTiersInput`, `QuoteTierInput`, `DeployAgentInput`, `GetStatusInput`, `CancelInput`
- ✅ Output schemas: `TierList`, `QuoteOutput`, `DeploymentOutput`, `StatusOutput`, `CancellationOutput`
- ✅ Zod validation for all inputs/outputs

#### 1d. MCP Server Setup

**File**: `packages/control-plane/src/server/mcp.ts`

- ✅ Initialize stdio MCP server
- ✅ Register all 5 tools with schemas
- ✅ Error handling for each tool

#### 1e. Tests (Unit + Basic Integration)

**File**: `packages/control-plane/tests/integration.test.ts`

- ✅ `list_tiers()` returns non-empty list
- ✅ `quote_tier()` returns valid SOL price
- ✅ `deploy_agent()` creates deployment in DB
- ✅ `get_deployment_status()` returns correct status
- ✅ `cancel_subscription()` marks deployment as cancelled

**Test count**: 8–12 tests, all passing

### Success Criteria for Phase 1

- [ ] MCP boots successfully: `npm run mcp`
- [ ] All 5 tools callable and return valid output
- [ ] Database persists deployments
- [ ] `list_tiers()` returns tiers with accurate pricing
- [ ] `deploy_agent()` creates deployment and returns fake agent_id + SSH info
- [ ] 8+ tests passing
- [ ] No TypeScript errors; code lints clean

### Work Division

- **Claude**: All of Phase 1 (foundation work)
- **Kimi**: Ready to start Phase 2 (real HFSP integration)

### Estimated Time

- **Days 1–3** (Apr 15–18): 3 days for complete Phase 1

---

## Phase 2: Real Integrations (Apr 18–25)

### Objective

Connect Phase 1 foundation to **real external systems**:
1. Real Helius RPC payment verification
2. Real HFSP provisioner (deploy actual Docker containers on VPS)
3. Subscription lifecycle with payment status
4. Grace period logic for failed payments

After Phase 2, users can perform a **real end-to-end deployment**: tier → payment → agent provisioning → SSH access.

### Deliverables

#### 2a. Helius Integration (Real Payment Verification)

**File**: `packages/control-plane/src/integrations/helius.ts`

- ✅ `verifyPayment(tx_hash)` — Query Helius RPC (devnet) for transaction status
  - Returns: `{verified: true/false, amount_sol: N, timestamp: Date}`
  - Handles timeouts, retries with exponential backoff

- ✅ `getTokenPrice()` — Fetch current SOL/USDT/HERD prices from Helius
  - Returns: `{token: "SOL", price_usd: N, last_updated: Date}`
  - Cache for 5 minutes to avoid rate limits

- ✅ Test with real devnet transaction

#### 2b. HFSP Real Provisioning

**File**: `packages/control-plane/src/integrations/hfsp.ts` + `packages/control-plane/src/provisioner/hfsp-client.ts`

- ✅ `deployAgent(config)` — Real HTTP call to HFSP provisioner
  - Input: `{tier_id, capability_bundle, user_id}`
  - Output: `{agent_id, ip, ssh_port, ssh_key_base64, status}`
  - Timeout: 120 seconds
  - Error handling: clear error messages

- ✅ `getAgentStatus(agent_id)` — Poll HFSP for agent status
  - Returns: `{agent_id, status: "initializing|running|failed", logs: string}`

- ✅ `deleteAgent(agent_id)` — Terminate agent on HFSP

#### 2c. Payment Orchestration

**File**: `packages/control-plane/src/server/tools.ts` (update)

- ✅ Modify `deploy_agent()` to require payment TX hash
  - Workflow: `deploy_agent(tier_id, tx_hash, capability_bundle)`
  - Verify payment via Helius
  - If verified, call HFSP to provision real agent
  - Create deployment + payment record in DB

- ✅ Add `verify_payment_and_deploy()` helper

#### 2d. Subscription Lifecycle

**File**: `packages/control-plane/src/services/` (new)

- ✅ `SubscriptionManager` service
  - `createSubscription(agent_id, tier_id, user_id)` — Set expiry = now + 30 days
  - `checkExpiredSubscriptions()` — Find expired agents, mark for termination
  - `handleGracePeriod(agent_id)` — Give 7 days grace, then terminate if no payment renewal

- ✅ Scheduled task (cron job) to check/update subscriptions hourly

#### 2e. Capability Bundles

**File**: `packages/control-plane/src/services/catalog.ts` (expand)

- ✅ Define capability bundle contents (MCPs to install per bundle)
  - **Solana Bundle**: MCP-Solana, wallet tooling, Helius RPC
  - **Research Bundle**: Web search, data aggregation
  - **Treasury Bundle**: DeFi protocol integration

- ✅ Pass bundle to HFSP provisioner so it auto-installs

#### 2f. Tests (Integration + E2E)

**File**: `packages/control-plane/tests/integration.test.ts` (expand)

- ✅ Real Helius devnet payment verification
  - Use known devnet transaction hash
  - Verify payment detection works

- ✅ Real HFSP provisioning
  - Deploy a real Docker agent to test VPS
  - Verify agent is running (SSH + logs)
  - Verify capability bundle installed

- ✅ Full flow: tier → payment → deployment → status
  - User selects Solana tier ($0.5 SOL)
  - User provides devnet tx hash
  - System verifies payment + provisions agent
  - Agent returns SSH info
  - User can SSH in

- ✅ Subscription lifecycle
  - Create deployment with 30-day expiry
  - Expire the subscription
  - Verify agent marked for termination
  - Verify grace period logic

**Test count**: 20+ integration + E2E tests

### Success Criteria for Phase 2

- [ ] `verifyPayment()` works with real Helius devnet
- [ ] `deployAgent()` provisions real Docker agent to HFSP VPS
- [ ] Agent SSH info returned and verified accessible
- [ ] Capability bundle installed (check agent logs)
- [ ] Full flow works: tier → payment → deployment → running agent
- [ ] Subscription lifecycle: expiry + grace period work
- [ ] 20+ integration tests passing
- [ ] No console errors; clean logs

### Work Division

**Claude's Phase 2 Tasks**:
- Helius real integration (verifyPayment, getTokenPrice)
- Test framework and E2E tests
- Subscription lifecycle logic
- Documentation (deployment guide, troubleshooting)

**Kimi's Phase 2 Tasks**:
- HFSP real provisioning (deployAgent, getAgentStatus, deleteAgent)
- HFSP integration tests
- Capability bundle setup
- Error handling for HFSP timeouts/failures

### Estimated Time

- **Days 4–11** (Apr 18–25): 7 days for Phase 2

---

## Phase 3: Polish & Production Hardening (Apr 25–May 6)

### Objective

Make Clawdrop **production-credible**:
1. E2E tests exercise full user journey
2. Comprehensive error recovery
3. User documentation (setup, deployment, troubleshooting)
4. Optional: Web dashboard or enhanced CLI
5. Internal dogfood + 1–2 ecosystem partner pilots

### Deliverables

#### 3a. E2E Test Suite

**File**: `packages/control-plane/tests/e2e.test.ts`

- ✅ `e2e.deploy-solana-agent` — Full journey
  1. List tiers
  2. Quote Solana tier
  3. Submit real devnet payment
  4. Deploy agent
  5. Get status
  6. SSH into agent and verify it's running
  7. Cancel subscription

- ✅ `e2e.payment-failure-grace-period`
  1. Deploy agent
  2. Simulate failed payment renewal
  3. Wait for grace period to pass
  4. Verify agent is terminated

- ✅ `e2e.scale-tier-upgrade` (optional, post-MVP)
  1. Deploy on Tier A
  2. Upgrade to Tier B
  3. Verify agent migrated

**Test count**: 5–8 E2E tests

#### 3b. Error Recovery & Resilience

**File**: `packages/control-plane/src/server/tools.ts` (harden)

- ✅ **HFSP unreachable**
  - Retry logic with exponential backoff (3 retries)
  - If all retries fail: return clear error to user
  - Log error; alert admin

- ✅ **Helius RPC timeout**
  - Cache recent tx verifications
  - If cache hit: return cached result
  - If not cached: retry with 5-second backoff
  - Timeout after 30 seconds total

- ✅ **Deployment timeout (> 120 seconds)**
  - Mark agent as "failed"
  - Provide user with error message + troubleshooting steps
  - Log HFSP error for debugging

- ✅ **Payment verification timeout**
  - Mark deployment as "pending"
  - User can check status later
  - Auto-expire pending after 2 hours

#### 3c. Documentation

**Files**: 
- `SETUP.md` — Installation & environment setup
- `DEPLOYMENT_GUIDE.md` — How to deploy an agent step-by-step
- `TROUBLESHOOTING.md` — Common errors and fixes
- `OPERATOR_RUNBOOK.md` — Running Clawdrop in production, monitoring

Content:
- ✅ Prerequisites (Node.js, .env setup, Hostinger account)
- ✅ Step-by-step deployment flow with screenshots/examples
- ✅ Common errors (HFSP unreachable, payment failed) and solutions
- ✅ How to monitor deployed agents, check logs, SSH in
- ✅ Emergency procedures (agent went down, payment issues)

#### 3d. Web Dashboard (Optional; Post-MVP)

**If time permits**:
- Simple React dashboard at `/clawdrop`
- List deployed agents
- Show payment status + renewal date
- One-click restart/cancel buttons
- View agent logs

**If no time**: Skip; stick with CLI + MCP

#### 3e. CLI Enhancements

**File**: `packages/control-plane/src/cli/index.ts` (expand)

- ✅ Add commands:
  - `clawdrop deploy` — Interactive tier selection + deployment
  - `clawdrop status [agent-id]` — Show agent status
  - `clawdrop list` — List all agents
  - `clawdrop cancel [agent-id]` — Cancel subscription
  - `clawdrop logs [agent-id]` — Show agent logs
  - `clawdrop ssh [agent-id]` — Print SSH command to connect

- ✅ Better formatting: colors, progress bars, spinners

#### 3f. Setup Pre-Commit Hooks

**Using the `setup-pre-commit` skill**:
- ✅ Configure Husky pre-commit hooks
  - Lint: `eslint . --fix`
  - Format: `prettier . --write`
  - Type check: `tsc --noEmit`
  - Tests: `npm test` (only on files that changed)

#### 3g. Internal Dogfood + Partner Testing

- ✅ You deploy Clawdrop MCP locally
- ✅ Deploy a real agent via CLI
- ✅ Verify all steps work without issues
- ✅ Share with 1–2 ecosystem partners
  - Have them deploy independently
  - Collect feedback: pain points, missing features, bugs
- ✅ Fix critical bugs found during testing

#### 3h. Final Testing & QA

- ✅ Run full test suite: `npm test` (20+ tests)
- ✅ E2E test suite: `npm run e2e` (all scenarios pass)
- ✅ Manual smoke test: deploy real agent, verify logs, cancel
- ✅ Code review: TypeScript, no warnings, clean lint
- ✅ Documentation review: all guides complete, no typos

### Success Criteria for Phase 3

- [ ] E2E tests all passing (5+ scenarios)
- [ ] Error recovery tested and working (HFSP timeout, payment failure, etc.)
- [ ] Documentation complete (setup, deployment, troubleshooting, ops)
- [ ] Internal team successfully deploys agent independently
- [ ] 1–2 ecosystem partners deploy and provide feedback
- [ ] CLI is polished and user-friendly
- [ ] Pre-commit hooks configured
- [ ] 30+ tests passing (unit + integration + E2E)
- [ ] No TypeScript errors; code is clean

### Work Division

**Claude**:
- E2E tests
- Error recovery & resilience
- Documentation (all guides)
- CLI enhancements
- Setup pre-commit hooks
- Final QA & testing

**Kimi**:
- Internal dogfood deployment
- Partner coordination
- Bug fixes found during testing

### Estimated Time

- **Days 12–22** (Apr 25–May 6): 11 days for Phase 3

---

## Critical Path & Dependencies

```
Phase 1 (Foundation) ✅
├── MCP tools
├── Database
├── Schemas
└── Unit tests
    ↓
Phase 2 (Real Integrations) ⟵ Depends on Phase 1
├── Helius integration (Claude)
├── HFSP integration (Kimi)
├── Payment orchestration
├── Subscription lifecycle
└── Integration tests
    ↓
Phase 3 (Polish) ⟵ Depends on Phase 2
├── E2E tests
├── Error recovery
├── Documentation
├── CLI enhancements
├── Setup pre-commit
└── Dogfood + partner testing
    ↓
May 6, 2026: Production Ready ✅
```

**Critical path**:
1. Phase 1 (foundation) must complete before Phase 2 starts
2. Helius integration (Claude) and HFSP integration (Kimi) can run in parallel during Phase 2
3. Phase 3 depends on both being complete

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| HFSP provisioner unreachable | Medium | High | Retry logic + fallback; daily connectivity checks |
| Helius RPC rate limits | Low | Medium | Cache pricing; backoff/retry |
| Deployment timeout issues | Medium | Medium | Clear error messages; 120-second timeout with logs |
| Payment verification delays | Low | Medium | Mark as pending; 2-hour auto-expiry |
| Partner feedback reveals critical gaps | Medium | High | Start dogfood week 4; iterate week 5–6 |
| Test infrastructure not ready | Low | High | Use devnet throughout; no mainnet until May 1 |

---

## Success Metrics (May 6)

By May 6:
- ✅ **10+ successful real deployments** (regardless of payment status)
- ✅ **< 5 minutes median deployment time** (from tier selection to SSH info)
- ✅ **90%+ deployment success rate** (9/10 deployments reach running state)
- ✅ **1 production-ready capability bundle** (Solana)
- ✅ **1 demoable use case** (e.g., agent queries Solana wallet balance, reports it)
- ✅ **Complete documentation** (setup, deployment, troubleshooting, ops runbook)
- ✅ **30+ tests passing** (unit + integration + E2E)
- ✅ **Internal + partner deployments successful** (2+ independent users)

---

## Appendix: File Structure After Phase 3

```
clawdrop/
├── README.md                          (overview)
├── CLAWDROP_PRD.md                    (product vision)
├── CLAWDROP_IMPLEMENTATION_PLAN.md    (this file)
├── SETUP.md                           (installation)
├── DEPLOYMENT_GUIDE.md                (user guide)
├── TROUBLESHOOTING.md                 (common errors)
├── OPERATOR_RUNBOOK.md                (operations)
├── package.json                       (dependencies)
├── tsconfig.base.json                 (TypeScript config)
├── .husky/                            (pre-commit hooks)
└── packages/
    └── control-plane/
        ├── src/
        │   ├── index.ts               (entry point)
        │   ├── server/
        │   │   ├── mcp.ts             (MCP server)
        │   │   ├── tools.ts           (5 core tools)
        │   │   ├── schemas.ts         (Zod validation)
        │   │   └── api.ts             (REST API, optional)
        │   ├── integrations/
        │   │   ├── helius.ts          (Solana RPC)
        │   │   └── hfsp.ts            (VPS provisioning)
        │   ├── provisioner/
        │   │   └── hfsp-client.ts     (HTTP wrapper)
        │   ├── db/
        │   │   └── memory.ts          (In-memory DB)
        │   ├── services/
        │   │   ├── catalog.ts         (Capability bundles)
        │   │   ├── policies.ts        (Policies/permissions)
        │   │   └── subscription.ts    (Subscription lifecycle)
        │   ├── cli/
        │   │   └── index.ts           (CLI commands)
        │   ├── utils/
        │   │   └── logger.ts          (Logging)
        │   └── models/                (TypeScript types)
        ├── tests/
        │   ├── integration.test.ts    (20+ tests)
        │   ├── e2e.test.ts            (5+ scenarios)
        │   ├── web-api.test.ts        (API tests)
        │   └── cli.test.ts            (CLI tests)
        ├── package.json               (local dependencies)
        └── tsconfig.json              (local TS config)
```

---

**Plan prepared by**: Claude  
**Next step**: Begin Phase 1 (Foundation & Core MCP) — Apr 15–18  
