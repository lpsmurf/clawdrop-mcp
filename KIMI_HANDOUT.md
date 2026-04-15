# Kimi Handout: Phase 1-2 Work Package

**Date**: April 15, 2026  
**Period**: Apr 15 - May 6, 2026  
**Your Role**: Backend infrastructure, HFSP integration, deployment automation  
**Communication**: Daily sync, async updates via commits

---

## Current Status

✅ **What You've Built** (Already running on your VPS):
- HFSP Provisioner (port 3001) - Working
- Basic Clawdrop MCP scaffold - Running
- Core file structure (integrations, services, db)
- MCP server initialization

✅ **What's Working**:
- HFSP Provisioner healthy and responsive
- SSH connectivity to your VPS
- Docker containers can be provisioned

---

## Your Tasks: April 15 - May 6

### PHASE 1 (Apr 15-18): While Claude builds locally, you handle parallel work

#### Task 1.1: Set Up Development Environment (1 day)
**Priority**: 🔴 CRITICAL  
**What to do**:
- [ ] Clone the monorepo to your VPS: `git clone <repo> /home/clawd/.openclaw/workspace/clawdrop-official`
- [ ] Set up `.env` on your VPS with:
  ```
  HELIUS_API_KEY=<your_helius_key>
  CLAWDROP_WALLET_ADDRESS=<your_solana_wallet>
  HFSP_API_URL=http://localhost:3001
  NETWORK=devnet
  ```
- [ ] Install dependencies: `npm install` in control-plane
- [ ] Verify build: `npm run build` (should have no TypeScript errors)
- [ ] Keep your VPS running both HFSP Provisioner and watch for code changes

**Acceptance Criteria**:
- [ ] `npm run build` passes with no errors
- [ ] `.env` configured correctly
- [ ] Can pull latest code from repo

**Time**: ~1 day (Apr 15)

---

#### Task 1.2: HFSP Integration - Real Provisioning (Critical Path)
**Priority**: 🔴 CRITICAL  
**Why**: Blocks all deployment testing in Phase 2  
**What to do**:

Replace mocks in `src/integrations/hfsp.ts` with **real HTTP calls**:

```typescript
// Current (mock):
export async function deployAgent(config) {
  return { agent_id: 'mock_123', status: 'initializing' };
}

// Target (real):
export async function deployAgent(config) {
  const response = await axios.post('http://localhost:3001/agents', {
    agent_name: config.agent_id,
    bundles: config.bundles,
    environment: config.environment
  });
  return {
    agent_id: response.data.agent_id,
    ip: response.data.ip,
    ssh_port: response.data.ssh_port,
    ssh_key: response.data.ssh_key,
    status: response.data.status
  };
}
```

**Specific Implementation**:
1. Create `src/provisioner/hfsp-client.ts` (HTTP wrapper)
   - Constructor: takes HFSP_API_URL from .env
   - Methods:
     - `POST /agents` → Deploy container
     - `GET /agents/:id/status` → Poll status
     - `GET /agents/:id/logs` → Get logs
     - `DELETE /agents/:id` → Terminate

2. Update `src/integrations/hfsp.ts` to use real HTTP client
   - Replace all mock returns with real API calls
   - Add timeout handling (120 seconds)
   - Add error handling and logging

3. Test with real deployment:
   ```bash
   npm run test:tools
   # Should provision a real Docker container on your VPS
   # Verify: docker ps | grep agent
   ```

**Acceptance Criteria**:
- [ ] HTTP client created with all methods
- [ ] Real API calls to HFSP work
- [ ] Docker container actually starts
- [ ] SSH keys returned and accessible
- [ ] Agent logs available
- [ ] Timeout handling works (120s max)
- [ ] Clear error messages on failure

**Files to modify**:
- `src/provisioner/hfsp-client.ts` (NEW)
- `src/integrations/hfsp.ts` (MODIFY)

**Time**: ~2-3 days (Apr 15-17)

---

#### Task 1.3: Capability Bundle Installation (High Priority)
**Priority**: 🟠 HIGH  
**What to do**:

Wire capability bundles into HFSP provisioning. When an agent is deployed with "solana" bundle, the Docker container should have:
- Solana MCPs installed
- Environment variables configured
- Ready to execute on startup

**Implementation**:
1. Update `src/services/catalog.ts` to define bundles:
   ```typescript
   const BUNDLES = {
     solana: {
       mcps: ["mcp-solana", "wallet-provider"],
       env: {
         RPC_URL: "https://api.devnet.solana.com",
         NETWORK: "devnet"
       }
     },
     research: { ... },
     treasury: { ... }
   };
   ```

2. Pass bundle config to HFSP:
   ```typescript
   hfsp.deployAgent({
     agent_id: "agent_123",
     bundles: ["solana"],
     environment: {
       INSTALLED_BUNDLES: "solana",
       RPC_URL: "...",
       NETWORK: "devnet"
     }
   });
   ```

3. Verify MCPs install:
   - SSH into deployed agent
   - Check agent logs: `curl http://localhost:3000/logs`
   - Verify "Solana MCP loaded ✅"

**Acceptance Criteria**:
- [ ] Bundle configs defined in catalog.ts
- [ ] Bundles passed to HFSP API
- [ ] MCPs actually load in agent
- [ ] Env vars set correctly
- [ ] Multiple bundle combinations work

**Files to modify**:
- `src/services/catalog.ts` (EXPAND)
- `src/integrations/hfsp.ts` (wire bundles)

**Time**: ~1 day (Apr 17)

---

### PHASE 2 (Apr 18-25): Real integrations (after Claude's Phase 1)

#### Task 2.1: Real HFSP Provisioning Tests (High Priority)
**Priority**: 🟠 HIGH  
**What to do**:

Create comprehensive integration tests for HFSP:
- Deploy real agent via HFSP
- Verify agent is running
- SSH into agent and confirm MCPs loaded
- Test bundle combinations
- Test error cases (timeout, auth failure)

**Files to create**:
- `tests/hfsp-integration.test.ts` (NEW)

**Time**: ~1 day (Apr 18)

---

#### Task 2.2: Error Handling & Resilience (High Priority)
**Priority**: 🟠 HIGH  
**What to do**:

Handle HFSP failures gracefully:
- HFSP unreachable → Retry 3x with backoff
- Agent timeout > 120s → Mark as failed
- Network errors → Clear error messages
- Partial deployment → Cleanup logic

**Files to modify**:
- `src/integrations/hfsp.ts` (add retry logic)
- `src/provisioner/hfsp-client.ts` (add error handling)

**Time**: ~1 day (Apr 19)

---

#### Task 2.3: Subscription Lifecycle on VPS (Medium Priority)
**Priority**: 🟠 HIGH  
**What to do**:

When Claude builds the subscription service, implement the **agent termination** part on your VPS:

```typescript
// From Claude: subscription expired for agent_123
// Your job: Terminate the agent
hfsp.deleteAgent("agent_123");
// Remove agent SSH keys
// Clean up Docker container
```

This runs in a scheduled task (hourly cron on your VPS).

**Files to create**:
- `scripts/subscription-monitor.ts` (runs hourly via cron)

**Time**: ~1 day (Apr 20)

---

### PARALLEL: Infrastructure & Documentation

#### Task 3.1: HFSP Provisioner Enhancements (Background)
**Priority**: 🟢 MEDIUM  
**What to do** (when you have time between other tasks):

Improve HFSP Provisioner to support:
- [ ] Health check endpoint: `GET /health`
- [ ] Metrics: `GET /metrics` (container count, CPU, memory)
- [ ] Logs endpoint: `GET /agents/:id/logs` (tail last 100 lines)
- [ ] Graceful shutdown: `POST /shutdown`

**Files**:
- Update HFSP Provisioner code (on your VPS)

**Time**: ~1-2 days (whenever)

---

#### Task 3.2: Setup Documentation for Kimi (For yourself)
**Priority**: 🟢 MEDIUM  
**What to do**:

Document your setup for continuity:
- [ ] `.env` setup instructions
- [ ] How to start HFSP Provisioner
- [ ] How to deploy Docker agents manually
- [ ] Common HFSP errors and fixes
- [ ] SSH troubleshooting

**File to create**:
- `docs/KIMI_SETUP.md` (for your own reference)

**Time**: ~0.5 day

---

## Success Criteria for May 6

By May 6, these must be working:

✅ **Real HFSP Deployment**
- [ ] Agent provisions via real HFSP API (not mocks)
- [ ] SSH keys returned and accessible
- [ ] User can SSH in immediately after deploy
- [ ] Docker container actually running

✅ **Capability Bundles**
- [ ] Solana bundle installs and loads
- [ ] MCPs available in agent
- [ ] Multiple bundles can be combined
- [ ] Env vars set correctly

✅ **Error Handling**
- [ ] HFSP timeout → clear error to user
- [ ] HFSP unreachable → retry + clear error
- [ ] Network failure → graceful degradation

✅ **Subscription Lifecycle**
- [ ] Agent terminates when subscription expires
- [ ] Grace period works (7 days)
- [ ] Cleanup happens automatically

---

## Daily Workflow

### Morning (9 AM)
- Check for updates from Claude (new code pushed to repo)
- `git pull` to get latest
- Run `npm run build` to verify no breakage
- Notify Claude of any integration issues

### During Day
- Work on your assigned tasks
- Test HFSP provisioning
- Push commits regularly (small, focused)
- Log any blockers

### Evening (5 PM)
- Sync with Claude (async or meeting)
- Summarize progress
- Identify blockers for next day
- Plan next day's work

---

## Communication Guidelines

### Use Commit Messages for Status
Instead of chat updates, use clear commit messages:
```
✅ feat: real HFSP provisioning with HTTP client
- Implement hfsp-client.ts with all methods
- Replace mocks with real API calls
- Add timeout handling (120s)
- Verified with real Docker deployment

Fixes #2 (from GITHUB_ISSUES_PHASE2.md)
```

### Async Updates (When blocking Claude)
If you hit a blocker or need clarification, tag Claude:
```
BLOCKER: HFSP API expecting different response format
Error: POST /agents returns {error: "..."} but expected {agent_id: "..."}
Question: Should we update HFSP API or our expectation?
```

---

## Files You'll Work On

**Phase 1-2 Critical**:
- `src/provisioner/hfsp-client.ts` (CREATE)
- `src/integrations/hfsp.ts` (MODIFY)
- `src/services/catalog.ts` (EXPAND)
- `tests/hfsp-integration.test.ts` (CREATE)

**Phase 2 Important**:
- `src/services/subscription.ts` (MODIFY - after Claude creates)
- `scripts/subscription-monitor.ts` (CREATE)

**Background**:
- HFSP Provisioner (on your VPS)
- Documentation

---

## Tools & Commands

**Build & Test**:
```bash
npm run build          # TypeScript compilation
npm run dev           # Watch mode (tsx watch)
npm run test          # Run vitest
npm run test:tools    # Quick tool test
npm run lint          # ESLint
```

**HFSP Testing**:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/agents
docker ps            # See deployed containers
```

**Git**:
```bash
git status           # Check changes
git log --oneline -5 # Recent commits
git push origin main # Push to repo
```

---

## Timeline

```
Apr 15 (Mon)  → Task 1.1 (setup) + Task 1.2 start (HFSP integration)
Apr 16 (Tue)  → Task 1.2 continue + testing
Apr 17 (Wed)  → Task 1.2 finish + Task 1.3 (bundles)
Apr 18 (Thu)  → Phase 2 begins: Task 2.1 (HFSP tests)
Apr 19 (Fri)  → Task 2.2 (error handling)
Apr 20 (Sat)  → Task 2.3 (subscription lifecycle)
Apr 21-27     → Testing, fixes, docs
Apr 28-May 6  → Integration testing, production hardening
```

---

## Questions for You

1. ✅ **Can you start Task 1.1 today** (environment setup)?
2. ✅ **Do you have access to Helius API key** for .env?
3. ✅ **Should HFSP use devnet or mainnet** for Phase 1-2?
4. ✅ **Any existing Docker images** for OpenClaw we should use?

---

**Ready to start? Let me know what you need clarification on, and we'll get moving!**

