# Clawdrop Development Guide

## Quick Start

### Prerequisites
- Node.js 18.12.0+
- npm 8.19.0+
- Git

### Initial Setup
```bash
cd /Users/mac/clawdrop
npm install                    # Install all workspace packages
npm run build                  # Compile TypeScript
```

### Running Locally

**Option 1: MCP Server (for Claude Code)**
```bash
npm run dev
# Server starts on stdio, ready for Claude Code connection
```

**Option 2: HTTP API Server**
```bash
npm run api
# API listens on http://localhost:3000
```

**Option 3: Both Together**
```bash
npm run both
# MCP on stdio + API on port 3000
```

**Option 4: CLI Commands**
```bash
npm run cli list-tiers
npm run cli quote-tier --tier-id treasury-agent-pro --token SOL
npm run cli verify-payment --payment-id pay_123 --tx-hash tx_abc
npm run cli deploy --tier-id treasury-agent-pro --payment-id pay_123 \
  --agent-name my-agent --wallet-address 7qj...
npm run cli status --deployment-id dpl_xyz
```

## Project Layout

```
clawdrop/
├── packages/control-plane/     # Main Clawdrop MCP
│   ├── src/
│   │   ├── index.ts           # Mode selector
│   │   ├── models/            # Data types
│   │   ├── server/
│   │   │   ├── mcp.ts        # MCP protocol
│   │   │   ├── api.ts        # HTTP REST
│   │   │   ├── tools.ts      # Business logic
│   │   │   └── schemas.ts    # Validation
│   │   ├── db/
│   │   │   └── memory.ts     # State store
│   │   ├── integrations/
│   │   │   ├── helius.ts     # Solana payment
│   │   │   └── hfsp.ts       # Provisioner
│   │   └── cli/              # CLI commands
│   └── package.json
│
├── packages/provisioner/       # HFSP Provisioner (TBD)
│   └── package.json
│
├── docs/                       # Shared documentation
├── ARCHITECTURE.md            # System design
└── README.md
```

## Common Tasks

### Testing
```bash
npm test                       # Run all tests
npm run test:watch            # Watch mode
```

### Building
```bash
npm run build                 # Compile TypeScript
```

### Code Style
```bash
npm run lint                  # Check code
```

## Understanding the Code

### Data Flow: User Request → Agent Deployment

```
1. USER REQUEST
   → "Deploy a Treasury Agent Pro tier"

2. CLAWDROP MCP (Control Plane)
   ├─ list_tiers()
   │  └─ Returns available service tiers
   │
   ├─ quote_tier()
   │  └─ Returns SOL/HERD pricing + gas fees
   │
   ├─ verify_payment()
   │  └─ Calls Helius RPC
   │     └─ Checks Solana devnet/mainnet
   │        └─ Confirms transaction
   │
   ├─ deploy_openclaw_instance()
   │  └─ Calls HFSP Provisioner API
   │     └─ Provisions Docker container
   │        └─ Installs capability bundle
   │           └─ Returns endpoint + credentials
   │
   └─ get_deployment_status()
      └─ Polls HFSP for agent status
         └─ Returns uptime, logs, metrics

3. RESPONSE
   → Agent is live on http://endpoint:port
   → Credentials issued to user
```

### Key Files Explained

**`src/server/tools.ts`** - Business Logic
Contains the 5 core tool handlers:
- `handleListTiers()` - Show available tiers
- `handleQuoteTier()` - Calculate pricing
- `handleVerifyPayment()` - Confirm payment via Helius
- `handleDeployOpenclawInstance()` - Start provisioning
- `handleGetDeploymentStatus()` - Monitor agent

**`src/integrations/helius.ts`** - Solana Integration
```typescript
export async function verifyHeliusTransaction(tx_hash: string): Promise<boolean>
```
Queries Solana via Helius RPC to verify payment is confirmed.

**`src/integrations/hfsp.ts`** - Provisioner Integration
```typescript
export async function deployViaHFSP(config): Promise<AgentInfo>
export async function getHFSPStatus(agentId): Promise<StatusInfo>
```
Calls HFSP REST API to provision and monitor agents.

**`src/db/memory.ts`** - State Management
In-memory store for deployments and payments:
```typescript
store.saveDeployment(deployment)
store.getDeployment(deploymentId)
store.updateDeploymentStatus(deploymentId, status)
```

## Testing the System

### Test 1: List Available Tiers
```bash
curl http://localhost:3000/api/tools/list_tiers
# Response: Array of tier objects with pricing
```

### Test 2: Get Price Quote
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"tier_id": "treasury-agent-pro", "token": "SOL"}' \
  http://localhost:3000/api/tools/quote_tier
# Response: Pricing in SOL + gas fees
```

### Test 3: Verify Payment (Mock)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "pay_test", "tx_hash": "5F4eK..."}' \
  http://localhost:3000/api/tools/verify_payment
# Response: Payment status (confirmed/pending/failed)
```

### Test 4: Deploy Agent (Mock)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "tier_id": "treasury-agent-pro",
    "payment_id": "pay_test",
    "agent_name": "my-treasury-agent",
    "wallet_address": "7qj..."
  }' \
  http://localhost:3000/api/tools/deploy_openclaw_instance
# Response: deployment_id, agent_id, status
```

### Test 5: Check Deployment Status
```bash
curl http://localhost:3000/api/tools/get_deployment_status \
  -d '{"deployment_id": "dpl_xyz"}'
# Response: Current agent status, uptime, logs
```

## Critical Issues & Solutions

### Issue 1: HFSP Remote VPS SSH Error 🚨
**Symptom**: HFSP tries to SSH to `187.124.173.69` and fails

**Solution A: Verify SSH Access**
```bash
ssh -i ~/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69
# Should connect without password
```

**Solution B: Use Local Docker**
- Modify HFSP to provision locally instead of remote
- Set `TENANT_VPS_HOST=localhost`

**Solution C: Check VPS Status**
```bash
ping 187.124.173.69
# Should respond
docker ps  # If local
# Should show running containers
```

### Issue 2: Helius API Key Issues
**Symptom**: "Invalid Helius API key" error

**Solution**:
1. Check `.env` has `HELIUS_API_KEY` set
2. Verify key is valid on Solana devnet
3. Check RPC limits not exceeded

### Issue 3: HFSP Connection Failed
**Symptom**: "Cannot reach HFSP provisioner at localhost:3001"

**Solution**:
1. Ensure HFSP is running: `ps aux | grep node`
2. Check port 3001 is open: `lsof -i :3001`
3. Check HFSP logs for errors
4. Verify API key matches in both `.env` files

## Environment Variables

**Control Plane (`.env` in `packages/control-plane/`)**:
```
HFSP_API_KEY=test-dev-key-12345
HFSP_API_URL=http://localhost:3001
SOLANA_RPC_URL=https://api.devnet.solana.com
PORT=3000
LOG_LEVEL=debug
CLAWDROP_MODE=mcp
```

**Provisioner (`.env` in `packages/provisioner/`)**:
```
HFSP_API_KEY=test-dev-key-12345
PORT=3001
DOCKER_SOCKET=/var/run/docker.sock
AGENT_IMAGE=clawdrop/openclaw:latest
```

## Debugging

### Enable Verbose Logging
```bash
LOG_LEVEL=trace npm run dev
```

### Check Network Requests
```bash
# Terminal 1: Start API server with verbose logging
LOG_LEVEL=debug npm run api

# Terminal 2: Make request
curl -v http://localhost:3000/api/tools/list_tiers

# Watch for:
# - Request headers
# - Response status
# - Timing
# - Errors
```

### Inspect In-Memory Database
The memory store is global, so you can inspect state:
```bash
# In src/db/memory.ts, add logging:
console.log('Deployments:', this.deployments);
console.log('Payments:', this.payments);
```

## Performance Tips

1. **Cache tier list** in memory (already done)
2. **Batch Helius requests** for multiple payment verifications
3. **Use connection pooling** for HFSP (HTTP keep-alive)
4. **Implement request timeout** (currently 120s for HFSP)
5. **Monitor deployment latency** (target: <5 minutes)

## Git Workflow for This Team

### Branch Naming
- `feature/FEATURE_NAME` - New features
- `fix/BUG_NAME` - Bug fixes
- `docs/WHAT` - Documentation
- `refactor/WHAT` - Code improvements

### Commit Messages
```
type(scope): subject

body (optional)

footer (optional)
Co-Authored-By: Name <email>
```

Example:
```
feat(helius): add real devnet transaction verification

- Implement verifyHeliusTransaction() with Helius RPC
- Add transaction status tracking
- Return verified flag and confirmation time
- Add integration tests with mock responses

Fixes #42
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Code Review Checklist
- [ ] TypeScript compiles without errors
- [ ] Tests pass (if applicable)
- [ ] No new console.log statements (use pino logger)
- [ ] ENV variables documented
- [ ] Breaking changes noted in PR description
- [ ] Co-authored-by included in commit

## Resources

- **Architecture**: See `ARCHITECTURE.md`
- **API Reference**: `docs/API.md`
- **Solana Docs**: https://docs.solana.com
- **MCP Spec**: https://modelcontextprotocol.io
- **TypeScript**: https://www.typescriptlang.org/docs

---

**Need help?** Check `STATUS.md` for current progress and blockers.
