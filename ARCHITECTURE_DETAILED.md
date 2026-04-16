# Clawdrop: Detailed Architecture & Data Flows

**Purpose**: Clarify structure, identify issues, and confirm correct flows before Phase 1 implementation

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
├─────────────────────────────────────────────────────────────────────┤
│  Claude Code / MCP  │  CLI (yargs)  │  REST API (HTTP)  │  Web UI   │
│   (stdio protocol)  │  (local CLI)  │   (Express)       │ (React)   │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │
                                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CLAWDROP CONTROL PLANE MCP                        │
│                  (Runs on Kimi's VPS: 187.124.170.113:3002)         │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ MCP SERVER (stdio + HTTP)                                    │   │
│ │ ├── Tool: list_tiers()                                       │   │
│ │ ├── Tool: quote_tier(tier_id)                                │   │
│ │ ├── Tool: deploy_agent(tier_id, tx_hash, bundle)             │   │
│ │ ├── Tool: get_deployment_status(agent_id)                    │   │
│ │ └── Tool: cancel_subscription(agent_id)                      │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ SERVICE LAYER                                                │   │
│ │ ├── TierService (list, quote)                                │   │
│ │ ├── PaymentService (verify transaction, get prices)          │   │
│ │ ├── DeploymentService (provision agents, track status)       │   │
│ │ ├── SubscriptionService (manage lifecycle, grace periods)    │   │
│ │ └── CatalogService (capability bundles)                      │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ INTEGRATIONS                                                 │   │
│ │ ├── Helius RPC (verify SOL payments, get token prices)       │   │
│ │ └── HFSP Provisioner HTTP Client (deploy agents)             │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ DATABASE                                                     │   │
│ │ ├── Deployments (agent_id, tier_id, status, expires_at)      │   │
│ │ ├── Payments (tx_hash, user_id, amount, verified_at)         │   │
│ │ ├── Tiers (tier_id, price_sol, vps_type, bundle)             │   │
│ │ └── Users (user_id, wallet_address) [TBD]                    │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  HFSP PROVISIONER (HTTP API)                        │
│              (Runs on same VPS: 187.124.170.113:3001)              │
├─────────────────────────────────────────────────────────────────────┤
│  POST   /agents               (provision new agent)                  │
│  GET    /agents/:id/status    (check agent status)                   │
│  GET    /agents/:id/logs      (fetch agent logs)                     │
│  DELETE /agents/:id           (terminate agent)                      │
└──────────────────────┬────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│              DEPLOYED AGENTS & INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│  Tier A (Shared Docker)                                              │
│  └── Docker Host on 187.124.170.113                                  │
│      ├── Agent 1 (agent_id_1)                                        │
│      ├── Agent 2 (agent_id_2)                                        │
│      └── Agent N                                                     │
│                                                                      │
│  Tier B (Dedicated VPS)                                              │
│  ├── Agent X on 187.124.173.69                                       │
│  ├── Agent Y on 187.124.173.70                                       │
│  └── Agent Z on 187.124.173.71                                       │
└─────────────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Helius RPC (devnet/mainnet)   - Verify SOL transactions             │
│  Solana Blockchain             - Payment settlement                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Critical Questions & Clarifications

### 1. **Where Should Clawdrop MCP Run?**

**Current Assumption**: Deploy on Kimi's VPS (187.124.170.113:3002)

**Issues to Consider**:
- If MCP runs on Kimi's VPS and Kimi manages it, then Kimi has access to all user data (deployments, payments, wallet info)
- If the MCP crashes, all users are blocked
- If Kimi's VPS goes down, Clawdrop is down

**Questions**:
- ❓ Should the MCP run on YOUR Mac initially (for control)?
- ❓ Or on a separate dedicated Hostinger VPS (for production)?
- ❓ Or both (local for dev, VPS for production)?

**Recommendation**: 
- **Phase 1-2**: Run on YOUR Mac (control + iteration speed)
- **Phase 3**: Deploy to separate Hostinger VPS for production (after proven stable)

---

### 2. **User Authentication & Identification**

**Current Assumption**: None (?)

**Issue**: How does Clawdrop know who the user is?

**Questions**:
- ❓ How do users authenticate?
- ❓ How do we track which user owns which agent?
- ❓ How do we prevent user A from accessing user B's agents?

**Options**:
1. **API Key**: User gets a unique API key; pass in every request
2. **OAuth**: User signs in with GitHub/wallet
3. **Wallet-based**: User's Solana wallet address is their identity
4. **No auth** (MVP): Just for internal testing (simple, but insecure)

**Recommendation for May 6**:
- **MVP (internal testing)**: No authentication; just pass `user_id` in requests
- **Post-May 6 (production)**: Implement wallet-based auth (Solana wallet as identity)

---

### 3. **Payment Flow: Who Creates the Transaction?**

**Current Assumption**: User creates SOL transaction, provides tx_hash to Clawdrop

**Flow**:
```
1. User: "I want to deploy a Solana tier agent"
2. Clawdrop: "That's 0.5 SOL. Send SOL to address X"
3. User: Sends 0.5 SOL from their wallet to address X
4. Clawdrop: Receives tx_hash from user
5. Clawdrop: Verifies tx_hash on Helius RPC
6. Clawdrop: If verified, provisions agent
```

**Critical Questions**:
- ❓ What is "address X"? (who receives the payment?)
- ❓ Who controls that wallet? (you? Hostinger? Clawdrop DAO?)
- ❓ How does user know the payment address?

**Current Issue**: PRD doesn't specify payment address/wallet

**Recommendation for May 6**:
- **Option A (Simple)**: Fixed payment address owned by you (e.g., your Solana wallet)
  - User sends SOL to your wallet address
  - Easy to implement, but centralized
  
- **Option B (Better)**: Use a Clawdrop-specific wallet
  - Create a Solana wallet for Clawdrop
  - Users send SOL there
  - More professional, but requires wallet management

**For MVP**: Use Option A (your wallet), clarify in documentation

---

### 4. **Database: In-Memory vs. Persistent**

**Current Assumption**: In-memory database (all data lost on restart)

**Issue**: Not production-ready

**Options**:
1. **In-memory only** (current)
   - Pros: Simple, fast
   - Cons: Data lost on restart, no persistence

2. **JSON file-based** (SQLite alternative)
   - Pros: Persistent, simple
   - Cons: Not scalable, file locks

3. **PostgreSQL** (production-grade)
   - Pros: Scalable, reliable, production-ready
   - Cons: Overkill for MVP

**Recommendation**:
- **Phase 1-2**: In-memory with JSON file backup
  - Keep current in-memory structure
  - Add periodic write-to-file for safety
  - Simple implementation
  
- **Phase 3**: PostgreSQL
  - Switch to real database for production
  - More reliable, easier scaling

---

### 5. **Deployment Architecture: Where Do Agents Run?**

**Current Assumption**:
- **Tier A**: Multiple agents in shared Docker on Kimi's VPS (187.124.170.113)
- **Tier B**: Dedicated Hostinger VPS (e.g., 187.124.173.69, 187.124.173.70, etc.)

**Critical Questions**:
- ❓ Who provisions the Tier B VPS instances?
- ❓ Are they pre-provisioned or created on-demand?
- ❓ How many spare VPS should we have ready?
- ❓ Who manages VPS lifecycle (billing, termination, updates)?

**Issue**: This is complex. HFSP Provisioner should handle this, but we need clarity.

**Recommendation for May 6**:
- **Focus on Tier A (shared Docker)** only
  - Simpler: all agents on one VPS
  - HFSP just provisions Docker containers
  - Can handle 10+ agents easily
  
- **Tier B (dedicated VPS) post-May 6**
  - Add after proving Tier A works
  - Requires VPS provisioning automation (more complex)

**Updated Deployment Model**:
```
Tier A (May 6): Shared Docker on 187.124.170.113
├── Agent 1
├── Agent 2
└── Agent N
   (HFSP provisions containers)

Tier B (Post-May 6): Dedicated VPS
├── Agent A on new VPS
├── Agent B on new VPS
└── Agent C on new VPS
   (Requires VPS provisioning logic)
```

---

### 6. **Subscription Lifecycle & Grace Periods**

**Current Assumption**:
- Agent deployed with 30-day expiry
- Failed payment → 7-day grace period
- After grace period → terminate agent

**Questions**:
- ❓ Who checks subscription expiry? (scheduled task? cron?)
- ❓ How often? (hourly? daily?)
- ❓ What happens when grace period expires? (who terminates the agent?)

**Recommendation**:
- Add a **scheduled task** that runs hourly
  - Check deployments for expiry
  - Check grace periods
  - Terminate expired agents
- For MVP: Simple in-process scheduler (not a separate service)

---

### 7. **Capability Bundles: How Are They Installed?**

**Current Assumption**: HFSP provisioner installs bundles when deploying agent

**Questions**:
- ❓ How does HFSP know which MCPs to install?
- ❓ Are bundles pre-built Docker images? Or installed post-deployment?
- ❓ How are bundle configurations passed to agents? (env vars? config files?)

**Issue**: Capability bundle installation needs to be defined

**Recommendation**:
- **Simple approach for May 6**:
  - Pass bundle config to HFSP via HTTP request
  - HFSP uses Docker environment variables to configure bundles
  - Example:
    ```
    POST /agents
    {
      "bundle": "solana",
      "config": {
        "RPC_URL": "https://api.devnet.solana.com",
        "WALLET_PATH": "/root/.solana/id.json"
      }
    }
    ```
  - HFSP sets env vars in Docker container
  - OpenClaw reads env vars on startup

---

### 8. **SSH Access & Key Management**

**Current Assumption**: User gets SSH keys to access their agent

**Questions**:
- ❓ Who generates SSH keys?
- ❓ How does user receive their private key?
- ❓ Where are keys stored?

**Recommendation**:
- **HFSP generates SSH keys** when provisioning agent
- **Returns base64-encoded private key** to Clawdrop MCP
- **Clawdrop sends key to user** (via CLI output or API response)
- User decodes and saves locally: `echo <key> | base64 -d > ~/.ssh/agent_key`

---

### 9. **Multi-Interface Integration: CLI, API, MCP**

**Current Assumption**: All interfaces connect to same backend

**Architecture**:
```
┌─────────────────────┬──────────────────┬──────────────────┐
│   Claude MCP        │   CLI (yargs)    │   REST API       │
│   (stdio)           │   (local)        │   (HTTP)         │
└──────────┬──────────┴────────┬─────────┴────────┬─────────┘
           │                   │                  │
           └─────────┬─────────┴──────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ Clawdrop Service Layer     │
        │ (shared business logic)    │
        └────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │ Database (in-memory)       │
        └────────────────────────────┘
```

**All interfaces use same service layer**: Good design ✅

---

## Architecture Summary: What's Right & What Needs Clarification

### ✅ What's Right

1. **Three-layer architecture** (MCP/Services/Database) — Clean separation
2. **Helius RPC integration** — Correct for Solana payment verification
3. **HFSP Provisioner integration** — Correct for agent deployment
4. **Recurring subscription model** — Aligns with VPS cost model
5. **Capability bundles** — Good abstraction for pre-configuring agents

### ❓ What Needs Clarification (Before Phase 1)

1. **MCP deployment location**: Your Mac (local) or VPS?
   - Recommendation: **Start on your Mac**
   - Can deploy to VPS for Phase 3

2. **User authentication**: How do we identify users?
   - Recommendation: **No auth for MVP (internal testing)**
   - Use wallet-based auth post-May 6

3. **Payment wallet**: Who receives SOL payments?
   - Recommendation: **Your wallet for MVP**
   - Clarify in PRD/documentation

4. **Database persistence**: In-memory or file-based?
   - Recommendation: **In-memory + JSON backup**
   - PostgreSQL post-May 6

5. **Deployment tiers**: Focus on Tier A or both A & B?
   - Recommendation: **Tier A only for May 6 (shared Docker)**
   - Tier B (dedicated VPS) post-May 6

6. **Subscription check**: Scheduled task for grace periods?
   - Recommendation: **Simple hourly scheduler**
   - Part of MCP server

---

## Revised Recommendation: Simplified Scope for May 6

To keep Phase 1-2 focused and achievable:

### MCP Deployment
- **Phase 1-2**: Run on your Mac (control, fast iteration)
- **Phase 3**: Deploy to Kimi's VPS or separate VPS

### Authentication
- **MVP (May 6)**: No authentication; pass `user_id` in requests
- **Post-May 6**: Wallet-based auth

### Payment
- **MVP**: Users send SOL to your wallet address (clarify in docs)
- **Post-May 6**: Dedicated Clawdrop payment wallet

### Database
- **Phase 1-2**: In-memory + JSON file backup
- **Phase 3**: PostgreSQL

### Deployment Tiers
- **May 6**: Tier A only (shared Docker on 187.124.170.113)
  - Simpler, proves concept
  - Can handle 10+ agents
- **Post-May 6**: Add Tier B (dedicated VPS)

---

## Next Steps

**Before starting Phase 1, confirm**:

1. ✅ **MCP runs locally on your Mac** (not on Kimi's VPS initially)?
2. ✅ **No user authentication for MVP** (just pass `user_id`)?
3. ✅ **Payment wallet is your SOL address** (clarify where/how user pays)?
4. ✅ **Database: in-memory + JSON backup** (simple but sufficient)?
5. ✅ **Focus on Tier A deployment** (shared Docker only)?
6. ✅ **Capability bundles: passed via env vars** to HFSP?

Once confirmed, Phase 1 can begin with clear direction.

