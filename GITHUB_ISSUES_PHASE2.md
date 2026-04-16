# Phase 2 GitHub Issues (Ready for Kimi)

These issues are generated from CLAWDROP_IMPLEMENTATION_PLAN.md Phase 2.

---

## 🔴 Critical Path Issues (Block everything else)

### Issue #1: Real Helius Payment Verification
**Label**: `priority:critical`, `phase:2`, `assignee:claude`  
**Title**: Implement real Helius RPC payment verification

**Description**:

As part of Phase 2, Clawdrop must verify payments on the Solana devnet using Helius RPC instead of mocking them.

**Acceptance Criteria**:
- [ ] `verifyPayment(tx_hash)` in `src/integrations/helius.ts` queries real Helius RPC (devnet)
- [ ] Returns `{verified: true/false, amount_sol: N, timestamp: Date}`
- [ ] Handles timeouts with retry logic (3 retries, exponential backoff)
- [ ] Tested with real devnet transaction
- [ ] `getTokenPrice()` fetches live SOL/USDT/HERD prices and caches for 5 minutes
- [ ] Code is well-logged for debugging

**Files to create/modify**:
- `packages/control-plane/src/integrations/helius.ts`

**Depends on**: Phase 1 complete

**Estimated time**: 2 days

---

### Issue #2: Real HFSP Provisioning Integration
**Label**: `priority:critical`, `phase:2`, `assignee:kimi`  
**Title**: Implement real HFSP provisioner HTTP client and integration

**Description**:

Currently, `src/integrations/hfsp.ts` returns mock agent data. This issue replaces mocks with real HTTP calls to the HFSP provisioner running on Kimi's VPS (187.124.170.113:3001).

**Acceptance Criteria**:
- [ ] Create `packages/control-plane/src/provisioner/hfsp-client.ts` HTTP wrapper
  - POST `/agents` to provision new Docker agent
  - GET `/agents/:id/status` to poll status
  - GET `/agents/:id/logs` to fetch logs
  - DELETE `/agents/:id` to terminate agent
  - Includes auth header (Bearer token) and error handling
  
- [ ] Update `src/integrations/hfsp.ts` to use real HTTP client
  - `deployAgent(config)` calls real HFSP API
  - Returns real IP, SSH port, SSH key (base64)
  - Timeout: 120 seconds with clear error messages
  
- [ ] Test with real HFSP provisioner
  - Deploy real Docker agent to test VPS
  - Verify agent is running (SSH + logs)
  - Verify logs show OpenClaw startup
  
- [ ] Error handling for common failures
  - HFSP unreachable → clear error message
  - Timeout > 120s → mark as failed
  - Auth failure → 401 error

**Files to create/modify**:
- `packages/control-plane/src/provisioner/hfsp-client.ts` (NEW)
- `packages/control-plane/src/integrations/hfsp.ts`

**Depends on**: Phase 1 complete, HFSP provisioner running

**Estimated time**: 3 days

---

### Issue #3: Payment Orchestration & Deploy Flow
**Label**: `priority:critical`, `phase:2`, `assignee:claude`  
**Title**: Wire payment verification into deployment flow

**Description**:

Modify `deploy_agent()` tool to require a Solana devnet transaction hash, verify it with Helius, and only proceed with HFSP provisioning if payment is verified.

**Acceptance Criteria**:
- [ ] Modify `deploy_agent(tier_id, tx_hash, capability_bundle)` signature to require `tx_hash`
- [ ] Workflow:
  1. User provides tier_id + devnet tx_hash
  2. Call `verifyPayment(tx_hash)` from Helius integration
  3. If verified: call HFSP to provision agent
  4. Create deployment + payment record in DB
  5. Return agent_id + SSH info
- [ ] If payment not verified: return clear error message
- [ ] Create helper `verify_payment_and_deploy()`
- [ ] Test: full flow with real devnet transaction

**Files to modify**:
- `packages/control-plane/src/server/tools.ts`
- `packages/control-plane/tests/integration.test.ts` (add tests)

**Depends on**: Issues #1, #2 complete

**Estimated time**: 1 day

---

## 🟠 High Priority Issues (Needed for May 6)

### Issue #4: Subscription Lifecycle Management
**Label**: `priority:high`, `phase:2`, `assignee:claude`  
**Title**: Implement subscription lifecycle with grace periods

**Description**:

Agents should live as long as subscriptions are active. Create a subscription management system that:
- Tracks payment renewal dates
- Implements grace periods (7 days) for failed payments
- Auto-terminates agents if subscription expires

**Acceptance Criteria**:
- [ ] Create `packages/control-plane/src/services/subscription.ts` with:
  - `createSubscription(agent_id, tier_id, user_id)` → sets expires_at = now + 30 days
  - `checkExpiredSubscriptions()` → finds expired agents
  - `handleGracePeriod(agent_id)` → 7-day grace, then terminate
  
- [ ] Scheduled task (cron job) runs hourly to check subscriptions
- [ ] Database fields: `created_at`, `expires_at`, `grace_period_until`, `status`
- [ ] Tests:
  - Create subscription with 30-day expiry
  - Check expiry at day 31 → marked as expired
  - Grace period: 7 days before termination
  - Verify agent terminated after grace period

**Files to create/modify**:
- `packages/control-plane/src/services/subscription.ts` (NEW)
- `packages/control-plane/src/db/memory.ts` (update schema)
- `packages/control-plane/tests/integration.test.ts`

**Depends on**: Phase 1 complete

**Estimated time**: 2 days

---

### Issue #5: Capability Bundle Definition & Installation
**Label**: `priority:high`, `phase:2`, `assignee:kimi`  
**Title**: Define capability bundles and wire to provisioning

**Description**:

Expand `services/catalog.ts` to define what MCPs go into each capability bundle, then ensure the HFSP provisioner installs them automatically when deploying agents.

**Acceptance Criteria**:
- [ ] Define bundles in `packages/control-plane/src/services/catalog.ts`:
  - **Solana Bundle**: MCP-Solana, wallet tooling, Helius RPC config
  - **Research Bundle**: Web search MCPs, data aggregation
  - **Treasury Bundle**: DeFi protocol integration, portfolio tracking
  
- [ ] Each bundle specifies:
  - List of MCPs to install
  - Configuration files (e.g., Solana RPC URL)
  - Environment variables
  
- [ ] Modify HFSP deployment to pass bundle config
- [ ] Verify bundle MCPs are installed (check agent logs)
- [ ] Test: Deploy agent with Solana bundle, verify MCP-Solana is available

**Files to create/modify**:
- `packages/control-plane/src/services/catalog.ts`
- `packages/control-plane/src/provisioner/hfsp-client.ts` (wire bundles)

**Depends on**: Issue #2 complete

**Estimated time**: 1 day

---

### Issue #6: Integration Tests for Phase 2
**Label**: `priority:high`, `phase:2`, `assignee:both`  
**Title**: Create comprehensive integration tests for real flows

**Description**:

Test the full tier → payment → deployment → running agent flow with real external integrations.

**Acceptance Criteria**:
- [ ] Test: Real Helius payment verification
  - Use known devnet transaction
  - Verify payment detection works
  
- [ ] Test: Real HFSP provisioning
  - Deploy real Docker agent to test VPS
  - Verify agent is running (SSH works)
  - Verify Solana bundle installed (check agent logs)
  
- [ ] Test: Full end-to-end flow
  - Select Solana tier ($0.5 SOL)
  - Provide devnet tx hash
  - Verify payment via Helius
  - Provision agent via HFSP
  - Get SSH info
  - SSH into agent and verify running
  
- [ ] Test: Subscription lifecycle
  - Create deployment with 30-day expiry
  - Expire subscription
  - Verify agent marked for termination
  - Verify grace period logic
  
- [ ] All tests passing, no flakiness

**Files to create/modify**:
- `packages/control-plane/tests/integration.test.ts` (expand to 20+ tests)

**Depends on**: Issues #1, #2, #4 complete

**Estimated time**: 2 days

---

## 🟢 Medium Priority Issues (Polish)

### Issue #7: Error Handling & Resilience
**Label**: `priority:medium`, `phase:2`, `assignee:claude`  
**Title**: Harden error handling for external service failures

**Description**:

When HFSP or Helius are unreachable, Clawdrop should gracefully handle failures and provide clear feedback.

**Acceptance Criteria**:
- [ ] **HFSP unreachable**: Retry with exponential backoff (3 retries, 1s → 2s → 4s)
  - If all retries fail: return clear error to user
  - Log error + alert
  
- [ ] **Helius RPC timeout**: 
  - Cache recent verifications
  - Retry with 5-second backoff
  - Timeout after 30 seconds total
  
- [ ] **Deployment timeout (> 120 seconds)**:
  - Mark agent as "failed"
  - Provide error message + troubleshooting steps
  - Log HFSP error for debugging
  
- [ ] **Payment verification timeout**:
  - Mark deployment as "pending"
  - User can check status later
  - Auto-expire pending after 2 hours
  
- [ ] Tests: Simulate each failure mode

**Files to modify**:
- `packages/control-plane/src/server/tools.ts`
- `packages/control-plane/src/integrations/helius.ts`
- `packages/control-plane/src/integrations/hfsp.ts`

**Depends on**: Issues #1, #2 complete

**Estimated time**: 1 day

---

## 📝 Summary

**Phase 2 has 7 issues**:

- **3 Critical Path** (block Phase 3): #1, #2, #3
- **3 High Priority** (needed for May 6): #4, #5, #6
- **1 Medium Priority** (polish): #7

**Estimated effort**: 
- Claude: Issues #1, #3, #4, #6, #7 = ~8 days
- Kimi: Issues #2, #5, #6 = ~6 days
- **Can run in parallel**, total time: ~7 days (Phase 2 timeline)

**Next step**: Assign issues to Claude and Kimi; begin Apr 18
