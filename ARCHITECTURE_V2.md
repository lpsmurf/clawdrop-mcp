# Clawdrop Architecture V2
_Updated: 2026-04-16 — addresses direct deploy, VPS API, and lightweight MCP_

---

## Question 1: Direct Container Deploy (No HFSP Web UI)

### Problem
Routing through `app.hfsp.cloud` or `miniapp.hfsp.cloud` adds a dependency on a
third-party web app we don't control, adds latency, and breaks the direct
Claude Code / terminal workflow.

### Solution: SSH + Docker Engine API

We control the VPS at `187.124.170.113`. Docker exposes a REST API on port 2376
(TLS-secured). We can call it directly from the control plane without touching
any web UI.

#### Option A — SSH + Docker CLI (done in Phase 1.5, works today)
```
Claude Code → SSH → VPS → docker run ghcr.io/clawdrop/openclaw:latest
```
Implementation in `src/integrations/docker-ssh.ts`:
```typescript
import { exec } from 'child_process';
const cmd = `ssh -i ~/.ssh/id_rsa root@187.124.170.113 \
  "docker run -d \
    --name agent_${agentId} \
    -e AGENT_ID=${agentId} \
    -e OWNER_WALLET=${wallet} \
    -e INSTALLED_BUNDLES=${bundles.join(',')} \
    --restart unless-stopped \
    ghcr.io/clawdrop/openclaw:latest"`;
```
Pros: zero new dependencies, works right now
Cons: synchronous, SSH latency

#### Option B — Docker Engine API over TLS (Phase 2, production path)
Expose Docker's REST API with mutual TLS on the VPS:
```bash
# On VPS — one-time setup
dockerd --tlsverify --tlscacert=ca.pem --tlscert=server-cert.pem \
        --tlskey=server-key.pem -H=0.0.0.0:2376
```
Then from the control plane (Node.js):
```typescript
import Dockerode from 'dockerode';
const docker = new Dockerode({
  host: '187.124.170.113', port: 2376,
  ca: fs.readFileSync('ca.pem'),
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem'),
});
await docker.createContainer({
  Image: 'ghcr.io/clawdrop/openclaw:latest',
  name: `agent_${agentId}`,
  Env: [`AGENT_ID=${agentId}`, `OWNER_WALLET=${wallet}`, `INSTALLED_BUNDLES=${bundles}`],
  HostConfig: { RestartPolicy: { Name: 'unless-stopped' } },
});
```
Pros: async, programmatic, no SSH overhead, supports events/logs streaming
Cons: TLS cert management overhead

#### Decision
- **Phase 1 (now)**: SSH + Docker CLI — replace HFSP HTTP client with direct SSH
- **Phase 2**: Docker Engine API over TLS for production robustness
- **HFSP Provisioner is kept** on the VPS as the Docker orchestration daemon,
  but we bypass the web UI entirely and call HFSP's local HTTP API directly
  (`http://localhost:3001` on the VPS, not the public web endpoint)

---

## Question 2: VPS-per-User for Heavy Users (Tier B+)

### Use Cases
- **Treasuries**: need isolated infra, compliance separation
- **DAOs**: multiple agents, different access controls per agent
- **Projects**: production SLAs, dedicated resources, custom domains

### Solution: Hostinger VPS API (already integrated!)

The Hostinger MCP server is connected. We can provision real VPS servers
on-demand using the existing API tools.

#### Full Tier B Deployment Flow
```
User calls deploy_agent(tier_b) →
  1. Control plane: verifyPayment() ← Helius devnet
  2. Control plane: purchaseVPS() ← Hostinger API
  3. Hostinger: creates Ubuntu 22.04 VPS, returns IP
  4. Control plane: runPostInstallScript() ← Docker + OpenClaw install
  5. Control plane: attachSSHKey(owner_wallet_derived_pubkey)
  6. Control plane: saveAgent() ← store IP, subscription
  7. Return: { agent_id, vps_ip, ssh_instructions }
```

#### Hostinger API Tools Available
```typescript
// Purchase new VPS
mcp__hostinger-api-mcp__VPS_purchaseNewVirtualMachineV1({
  plan: 'VPS 2', // 2 vCPU, 8GB RAM ~$10/mo
  location: 'nl', // Netherlands DC
  hostname: `agent-${agentId}.clawdrop.io`,
})

// Auto-install Docker + OpenClaw via post-install script
mcp__hostinger-api-mcp__VPS_createPostInstallScriptV1({
  name: `openclaw-setup-${agentId}`,
  content: `#!/bin/bash
    curl -fsSL https://get.docker.com | sh
    docker pull ghcr.io/clawdrop/openclaw:latest
    docker run -d --name openclaw \
      -e AGENT_ID=${agentId} \
      -e OWNER_WALLET=${wallet} \
      -e INSTALLED_BUNDLES=${bundles} \
      --restart unless-stopped \
      -p 8080:8080 \
      ghcr.io/clawdrop/openclaw:latest
  `,
})

// Attach owner's SSH key
mcp__hostinger-api-mcp__VPS_attachPublicKeyV1({
  virtual_machine_id: vmId,
  public_key: ownerSshKey,
})
```

#### Tier Mapping
| Tier | Hosting Model | VPS Plan | Monthly Price | Clawdrop Price |
|------|--------------|----------|---------------|----------------|
| Tier A | Shared Docker on our VPS | None (container) | ~$0.50/slot | $50/mo |
| Tier B | Dedicated Hostinger VPS | VPS 2 (2vCPU/8GB) | ~$10/mo | $200/mo |
| Tier C | Custom Hostinger VPS | VPS 4+ | Custom | Custom |

#### Implementation Plan (Tier B)
New file: `src/integrations/vps-provisioner.ts`
```typescript
export async function provisionDedicatedVPS(params: {
  agent_id: string;
  owner_wallet: string;
  bundles: string[];
  ssh_public_key?: string;
}): Promise<{ vps_id: string; ip: string; ssh_user: string }> {
  // 1. Create post-install script
  // 2. Purchase VPS with the script
  // 3. Attach SSH key if provided
  // 4. Poll until running
  // 5. Return IP + credentials
}
```

---

## Question 3: Lightweight MCP (No VPS Required)

### Use Case
Power users who just want wallet/payment capabilities in Claude without
deploying any infrastructure. A single line of code to add to their
Claude Desktop config.

### Solution: `@clawdrop/mcp` NPM Package

```json
// User adds to ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "clawdrop-wallet": {
      "command": "npx",
      "args": ["-y", "@clawdrop/mcp@latest"],
      "env": {
        "WALLET_PRIVATE_KEY": "your_base58_private_key"
      }
    }
  }
}
```

That's it. One line gets them all wallet tools inside Claude.

#### Tools in the Lightweight Package
| Tool | What it does |
|------|-------------|
| `swap_tokens` | Jupiter swap: SOL→USDC, HERD→SOL, etc. |
| `send_tokens` | Send SOL/USDC/HERD to any address |
| `check_balance` | Wallet balance for all tokens |
| `get_token_price` | Live price from Jupiter |
| `pay_with_sol` | Pay for external services via SOL |
| `create_payment_link` | Generate a Solana pay QR/link |
| `get_transaction_history` | Recent tx history via Helius |

#### Package Structure
```
packages/
  mcp-wallet/          ← NEW lightweight package
    src/
      index.ts         ← MCP server entry point
      tools/
        swap.ts        ← Jupiter swap
        send.ts        ← Token transfers
        balance.ts     ← Wallet balance
        price.ts       ← Jupiter price API
    package.json       ← name: "@clawdrop/mcp", bin: "clawdrop-mcp"
    README.md          ← Installation: one-liner
```

#### Key difference from Clawdrop main
- No VPS, no HFSP, no deployment
- User provides their own private key (runs locally, never leaves their machine)
- Pure Solana wallet MCP — the "lite" tier
- Published to NPM, installable via `npx`

#### Privacy model
The private key stays on the user's machine inside the MCP process.
It is never sent to any Clawdrop server. The tool calls sign locally and
broadcast directly to Solana devnet/mainnet.

---

## Security Fixes Applied (2026-04-16)

### Critical — Fixed
1. **IDOR on get_deployment_status + cancel_subscription**
   - Added `owner_wallet` param to both tools
   - Server compares `agent.owner_wallet !== parsed.owner_wallet` → 401
   
2. **Payment bypass accessible in production**
   - `test_`/`devnet_` prefix bypass now gated: `if (NODE_ENV !== 'production')`
   - Production deployments always hit real Helius verification

3. **Solana wallet format validation**
   - `SolanaWalletSchema`: min 32 chars, max 44 chars, base58 alphabet
   - Applied to all `owner_wallet` fields in Zod schemas

### Remaining (Phase 2)
- **Payment amount verification**: confirm tx actually sent correct amount
  to `CLAWDROP_WALLET_ADDRESS` (requires parsing Solana tx data via Helius)
- **Helius API key in URL**: move to `Authorization` header when Helius
  supports it (currently their devnet RPC only accepts query param)

---

## Implementation Priorities

### This week (Phase 1 completion)
1. Replace HFSP HTTP client with SSH+Docker direct calls
2. Build `packages/mcp-wallet` lightweight package
3. Test Tier A deploy end-to-end with real devnet payment

### Next week (Phase 2)
4. Wire Tier B: Hostinger VPS provisioning
5. Payment amount verification via Helius tx parsing
6. Subscription renewal cron job
7. Publish `@clawdrop/mcp` to NPM
