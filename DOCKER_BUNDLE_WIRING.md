# Docker Bundle Wiring Guide

**Date**: April 16, 2026  
**Status**: Implementation in progress  
**Owner**: Claude + OpenClaw integration team

## Overview

This document describes how Clawdrop agents deployed in Docker containers install and load capability bundles (wallet, travel, etc.).

## Deployment Flow

### 1. Control Plane → VPS (docker-ssh.ts)

**Control plane** calls `deployViaDocker()` with:
- `agent_id`, `owner_wallet`, `bundles`, `tier_id`
- Example: `bundles: ['solana', 'travel-crypto-pro']`

**Control plane** collects environment variables:
- **Core vars**: `AGENT_ID`, `OWNER_WALLET`, `SOLANA_RPC_URL`
- **Bundle vars**: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` (for travel), `HELIUS_API_KEY` (for solana)
- **Install command**: `npm install @clawdrop/mcp && npm install @clawdrop/travel-crypto-pro`

**Control plane** executes SSH command:
```bash
docker run -d \
  --name openclaw_<agent_id> \
  -e AGENT_ID=<agent_id> \
  -e OWNER_WALLET=<wallet> \
  -e INSTALLED_BUNDLES=solana,travel-crypto-pro \
  -e BUNDLE_INSTALLS="npm install @clawdrop/mcp && npm install @clawdrop/travel-crypto-pro" \
  -e AMADEUS_CLIENT_ID=<key> \
  -e AMADEUS_CLIENT_SECRET=<secret> \
  -e HELIUS_API_KEY=<key> \
  -l clawdrop.agent_id=<agent_id> \
  ghcr.io/clawdrop/openclaw:latest
```

### 2. Docker Container Startup

**OpenClaw** container entrypoint (in Dockerfile):
```bash
#!/bin/bash
set -e

# 1. Run bundle installation (from control plane)
if [ -n "$BUNDLE_INSTALLS" ]; then
  echo "Installing bundles: $BUNDLE_INSTALLS"
  eval "$BUNDLE_INSTALLS"  # e.g. "npm install @clawdrop/mcp && npm install @clawdrop/travel-crypto-pro"
fi

# 2. Initialize npm project (if needed)
if [ ! -f "package.json" ]; then
  npm init -y
  npm install @clawdrop/mcp  # Always installed
fi

# 3. Start OpenClaw runtime
# OpenClaw discovers MCP servers:
# - Loads package.json (finds node_modules/@clawdrop/*)
# - For each @clawdrop/* package, loads its index.ts entry point
# - Extracts MCP tools from exports
# - Registers tools with stdio protocol handler

exec node --loader ts-node/esm /opt/openclaw/runtime.ts
```

### 3. MCP Tool Discovery

**OpenClaw runtime** (pseudocode):
```typescript
// Load installed packages
const packages = fs.readdirSync('node_modules/@clawdrop/');
// Output: ['mcp', 'travel-crypto-pro']

const tools = [];

for (const pkg of packages) {
  // Load package entry point
  const bundle = await import(`@clawdrop/${pkg}`);
  
  // Extract tools from bundle exports
  if (bundle.tools) {
    tools.push(...bundle.tools);
  }
}

// tools = [
//   { name: 'get_balance', handler: ..., schema: ... },    // from @clawdrop/mcp
//   { name: 'send_transaction', ... },
//   { name: 'search_travel_options', ... },                // from @clawdrop/travel-crypto-pro
//   { name: 'book_flight', ... },
// ]

// Register with MCP stdio protocol
mcpServer.registerTools(tools);

// Claude can now call all tools
```

## Bundle Package Structure

Each bundle is an npm package exporting:
```typescript
// @clawdrop/mcp/src/index.ts
export const tools = [
  { name: 'get_balance', handler: getBalance, schema: BalanceSchema },
  { name: 'send_transaction', handler: send, schema: SendSchema },
  // ... 5 wallet tools
];
export const bundleMetadata = { ... };
```

```typescript
// @clawdrop/travel-crypto-pro/src/index.ts
export const tools = [
  { name: 'search_travel_options', handler: search, schema: SearchSchema },
  { name: 'book_flight', handler: book, schema: BookSchema },
  // ... 5 travel tools
];
export const bundleMetadata = { ... };
```

## Environment Variables Flow

### Control Plane → Docker

| Env Var | Source | Value | Used By |
|---------|--------|-------|---------|
| `AGENT_ID` | Control plane | `agent_abc123...` | OpenClaw, agent logging |
| `OWNER_WALLET` | Control plane | User's Solana wallet | IDOR checks, log redaction |
| `INSTALLED_BUNDLES` | Control plane | `solana,travel-crypto-pro` | OpenClaw bundle discovery |
| `BUNDLE_INSTALLS` | Control plane | npm command | Container startup script |
| `AMADEUS_CLIENT_ID` | Control plane (env) | API key | Travel bundle (Amadeus) |
| `AMADEUS_CLIENT_SECRET` | Control plane (env) | API key | Travel bundle (Amadeus) |
| `AMADEUS_ENV` | Control plane (env) | `test` or `production` | Travel bundle |
| `GNOSIS_PAY_SANDBOX` | Control plane (env) | `true` or `false` | Travel bundle (mock mode) |
| `GNOSIS_PAY_API_KEY` | Control plane (env) | API key | Travel bundle (production) |
| `HELIUS_API_KEY` | Control plane (env) | API key | Wallet bundle (Solana RPC) |
| `SOLANA_RPC_URL` | Control plane | `https://api.devnet.solana.com` | Wallet bundle |

**Key**: Control plane reads from its own `.env` and passes to Docker. Docker does NOT create new env vars; it only receives what control plane sends.

## Implementation Checklist

### Docker Integration (docker-ssh.ts)
- [x] `getBundleEnvVars()` — collect env vars for active bundles
- [x] `generateBundleInstalls()` — create npm install command
- [x] `deployViaDocker()` — updated to pass BUNDLE_INSTALLS and all env vars
- [x] `getDockerLogs()` — new function to retrieve container logs
- [x] `checkSSHConnectivity()` — updated to verify Docker available

### OpenClaw Container
- [ ] **Entrypoint script**: Execute `$BUNDLE_INSTALLS` on startup
- [ ] **Package.json init**: If no package.json, create and install @clawdrop/mcp
- [ ] **Bundle discovery**: Load tools from all installed @clawdrop/* packages
- [ ] **MCP server**: Register all discovered tools
- [ ] **Logging**: Pass env vars to logger (redact AMADEUS_CLIENT_SECRET, HELIUS_API_KEY)

### Bundle Packages
- [x] `@clawdrop/mcp` — core wallet bundle (already done)
- [x] `@clawdrop/travel-crypto-pro` — travel bundle (already done)
- [ ] `@clawdrop/research` — future
- [ ] `@clawdrop/treasury` — future

## Testing Strategy

### Test 1: Bundle Installation
```bash
# Deploy agent with travel bundle
curl -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "tier_id": "tier_b",
    "agent_name": "travel-test",
    "owner_wallet": "9B5X3nZ7kL2mK4pQ7vR1s3tU5wX9yZ1bC3dE5fG7h",
    "bundles": ["solana", "travel-crypto-pro"],
    "payment_tx_hash": "devnet_test_123"
  }'

# Check container logs
ssh root@187.124.173.69 docker logs openclaw_agent_xyz

# Expected: "Installing bundles: npm install @clawdrop/mcp && npm install @clawdrop/travel-crypto-pro"
```

### Test 2: Tool Discovery
```bash
# SSH into container and check node_modules
ssh root@187.124.173.69 docker exec openclaw_agent_xyz ls -la node_modules/@clawdrop/

# Expected output:
# drwxr-xr-x  mcp
# drwxr-xr-x  travel-crypto-pro

# Check if MCP server loaded tools
ssh root@187.124.173.69 docker exec openclaw_agent_xyz ps aux | grep mcp-server
# Should show MCP server running
```

### Test 3: Tool Availability
```bash
# From Claude Desktop with agent connected via MCP stdio
# Call tool from travel bundle
claude> "Search for flights from Madrid to NYC next week"

# Agent should call: search_travel_options(...)
# Returns: 10 flights with prices

# Call tool from wallet bundle
claude> "Check my balance"

# Agent should call: get_balance()
# Returns: { sol: 1.5, tokens: {...} }
```

### Test 4: Environment Variables
```bash
# Check that env vars are passed to container
ssh root@187.124.173.69 docker exec openclaw_agent_xyz env | grep AMADEUS

# Expected:
# AMADEUS_CLIENT_ID=<key>
# AMADEUS_CLIENT_SECRET=<redacted_in_logs>
# AMADEUS_ENV=test
```

## Debugging

### Bundle Installation Failed
```bash
# Check container logs
ssh root@187.124.173.69 docker logs openclaw_agent_xyz

# Look for:
# - "npm ERR!" → package not found
# - "Cannot find module" → dependency missing
# - Permission error → container user doesn't have write access
```

### Tools Not Available
```bash
# Check if bundle packages installed
ssh root@187.124.173.69 docker exec openclaw_agent_xyz npm list @clawdrop/mcp
ssh root@187.124.173.69 docker exec openclaw_agent_xyz npm list @clawdrop/travel-crypto-pro

# Check if OpenClaw can import bundle
ssh root@187.124.173.69 docker exec openclaw_agent_xyz \
  node -e "import('@clawdrop/mcp').then(m => console.log(m.tools))"
```

### Environment Variables Missing
```bash
# Check what vars container received
ssh root@187.124.173.69 docker exec openclaw_agent_xyz env | grep AMADEUS

# If missing:
# 1. Check control plane .env file has the var
# 2. Check docker-ssh.ts actually passed it in envFlags
# 3. Check SSH command for quoting/escaping issues
```

## Future Enhancements

1. **Bundle versioning**: Pin @clawdrop/mcp@1.0.0 instead of latest
2. **Bundle caching**: Docker layer caching for npm install
3. **Bundle size optimization**: Alpine base image, tree-shake unused exports
4. **Bundle marketplace**: Allow third-party bundle installation
5. **Hot reload**: Update bundles without redeploying container

## Success Criteria

- [ ] First agent deployed with travel bundle
- [ ] All 5 wallet tools available in Claude
- [ ] All 5 travel tools available in Claude
- [ ] Environment variables correctly passed (redacted in logs)
- [ ] Full booking flow works: search → build → approve → book
- [ ] Docker logs show successful bundle installation

---

**Next Step**: Update OpenClaw entrypoint script to handle `$BUNDLE_INSTALLS`
