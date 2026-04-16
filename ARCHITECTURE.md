# Clawdrop Monorepo Architecture

## Overview

Unified monorepo containing Clawdrop Control Plane (MCP) and HFSP Provisioner for autonomous agent deployment on Solana.

## Structure

```
clawdrop/                          # Root monorepo
├── packages/
│   ├── control-plane/             # Clawdrop MCP Server
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point (MCP/API mode selector)
│   │   │   ├── models/            # Data models (Tier, Payment, Deployment)
│   │   │   ├── server/
│   │   │   │   ├── mcp.ts         # MCP server for Claude Code
│   │   │   │   ├── api.ts         # HTTP REST API
│   │   │   │   ├── tools.ts       # Tool handlers (list, quote, verify, deploy, status)
│   │   │   │   └── schemas.ts     # Zod validation schemas
│   │   │   ├── db/
│   │   │   │   └── memory.ts      # In-memory state store
│   │   │   ├── integrations/
│   │   │   │   ├── helius.ts      # Solana Helius RPC client
│   │   │   │   └── hfsp.ts        # HFSP provisioner client
│   │   │   ├── cli/
│   │   │   │   └── index.ts       # CLI tool (yargs)
│   │   │   └── services/          # Business logic
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   └── provisioner/                # HFSP Agent Provisioner (TBD)
│       └── (Similar structure)
│
├── docs/                           # Shared documentation
│   ├── DEPLOYMENT.md
│   ├── API.md
│   └── SOLANA.md
│
├── architecture/                   # Architecture reference
│   ├── MONOREPO.md
│   ├── DATA_FLOW.md
│   └── DEPLOYMENT_FLOW.md
│
├── scripts/                        # Root-level build/deploy scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── test.sh
│
├── package.json                    # Root monorepo config (workspaces)
├── README.md
└── ARCHITECTURE.md                 # This file
```

## Packages

### Control Plane (`packages/control-plane`)
**Purpose**: Clawdrop MCP server - the orchestration and control layer

**Responsibilities**:
- Expose MCP interface for Claude Code
- Serve REST API for web integration
- Provide CLI for terminal access
- Handle payment verification (Helius)
- Coordinate with HFSP provisioner
- Manage deployment state

**Key Files**:
- `src/index.ts` - Mode selector (MCP, API, or both)
- `src/server/mcp.ts` - MCP protocol implementation
- `src/server/api.ts` - Express REST server
- `src/integrations/helius.ts` - Solana payment verification
- `src/integrations/hfsp.ts` - HFSP client for provisioning

**Modes**:
```bash
npm run dev    # Start MCP server
npm run api    # Start HTTP API
npm run both   # Start both MCP + API
npm run cli    # Use CLI commands
```

### Provisioner (`packages/provisioner`)
**Purpose**: HFSP Agent Provisioner - handles actual agent deployment

**Status**: Structure TBD (will contain HFSP deployment logic)

## Data Flow

```
User Request
    ↓
Claude Code / Web / CLI
    ↓
Clawdrop MCP (Control Plane)
    ├─ list_tiers
    ├─ quote_tier
    ├─ verify_payment → [Helius RPC] → Solana devnet/mainnet
    ├─ deploy_openclaw_instance → [HFSP Provisioner] → Docker containers
    └─ get_deployment_status → [HFSP Provisioner] → Agent metrics
```

## Development Workflow

### 1. Setup
```bash
cd /Users/mac/clawdrop
npm install              # Install all workspace packages
```

### 2. Development
```bash
# Start control plane in MCP mode
npm run dev

# Or start API server
npm run api

# Or both
npm run both

# Or use CLI
npm run cli list-tiers
```

### 3. Testing
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

### 4. Building
```bash
npm run build           # Compile TypeScript
```

## Git Workflow

**Branch Strategy**:
- `main` - Production-ready code
- `dev` - Development branch (default for feature work)
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

**Commits**:
- Atomic commits focused on one change
- Clear commit messages
- Reference issues/PRs when applicable
- Include "Co-Authored-By" for pair work

**Example**:
```bash
git checkout -b feature/add-webhook-support
# ... make changes ...
git commit -m "feat: add webhook support to payment verification

- Listen on /webhooks/payment
- Validate signatures using HMAC
- Update deployment status in real-time
- Add tests for webhook handler

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
git push origin feature/add-webhook-support
# Create PR for review
```

## Testing Strategy

**Unit Tests**: `src/**/*.test.ts`
- Model validation
- Tool handler logic
- Integration client mocks

**Integration Tests**: `tests/integration.test.ts`
- End-to-end workflows
- Actual Helius calls (devnet)
- HFSP mock responses

**Manual Testing**:
- CLI commands
- API endpoints
- MCP with Claude Code

## Deployment

**Control Plane**:
- MCP: Run on local machine connected to Claude Code
- API: Deploy to cloud (Heroku, Railway, etc.)
- CLI: Distribute as npm package

**Provisioner**:
- Run on VPS with Docker access
- Expose REST API for Control Plane calls
- Handle agent lifecycle

## Environment Configuration

**Root `.env`**: Not used (workspaces have their own)

**Control Plane `.env`**:
```
HFSP_API_KEY=test-dev-key-12345
HFSP_API_URL=http://localhost:3001
SOLANA_RPC_URL=https://api.devnet.solana.com
PORT=3000
LOG_LEVEL=debug
CLAWDROP_MODE=mcp
```

**Provisioner `.env`** (TBD):
```
HFSP_API_KEY=test-dev-key-12345
PORT=3001
DOCKER_SOCKET=/var/run/docker.sock
AGENT_IMAGE=clawdrop/openclaw:latest
```

## Critical Issues to Resolve

### 1. HFSP Remote VPS SSH 🚨
**Issue**: HFSP tries to SSH to `187.124.173.69` for Docker provisioning
- [ ] Verify remote VPS is accessible
- [ ] Configure SSH keys for provisioning user
- [ ] Or modify HFSP to use local Docker

### 2. Environment Synchronization
- [ ] Ensure API keys match across control-plane and provisioner
- [ ] Document configuration requirements
- [ ] Add config validation on startup

### 3. Logging & Monitoring
- [ ] Centralized logging (Pino)
- [ ] Request tracing
- [ ] Deployment status dashboard

## Success Metrics

By May 6, 2026:
- ✅ 96%+ autonomous deployment success rate
- ✅ 500+ deployments on Solana mainnet
- ✅ All three interfaces (MCP, API, CLI) working
- ✅ Zero single points of failure
- ✅ Clean, maintainable codebase

## Team Responsibilities

| Role | Responsibility | Status |
|------|----------------|--------|
| Claude (AI) | Control Plane logic, testing, documentation | ✅ Active |
| Kimi (Developer) | HFSP integration, provisioning logic | ✅ Phase 1b done |
| User | Oversight, strategic decisions | ✅ Active |

## Next Steps (Priority Order)

1. **Test Control Plane** with real Helius integration
2. **Fix HFSP provisioning** remote VPS SSH issue
3. **Create HFSP package** structure
4. **End-to-end testing** (payment → provisioning → agent)
5. **Documentation** and deployment guides

---

**Last Updated**: April 15, 2026
**Status**: Monorepo restructuring in progress
