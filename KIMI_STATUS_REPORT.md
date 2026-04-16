# Kimi Status Report — 2026-04-16

## VPS Inventory (from Hostinger API)

| Server | IP | Plan | DC | Purpose | Status |
|--------|-----|------|----|---------|--------|
| srv1507296 | 187.124.170.113 | Unknown | ? | **Kimi's main VPS** — not in this Hostinger account | ✅ Running |
| srv1519343 | 187.124.173.69 | KVM 2 (2vCPU/8GB) | 19 | **Docker deployment host** — where tenant agents run | ✅ Running, SSH blocked |
| srv1523425 | 187.124.174.137 | KVM 1 (1vCPU/4GB) | 19 | **Unknown** — created day after VPS 2 | ✅ Running |
| srv1313715 | 72.62.239.63 | KVM 2 (2vCPU/8GB) | 15 | **Unknown** — oldest, different datacenter | ✅ Running |

> ⚠️ Kimi's VPS (187.124.170.113) is NOT in this Hostinger account — different account or billing

---

## Is Kimi Building in the Right Direction?

**YES — and more advanced than expected.** Here's what she built:

### HFSP Storefront Bot (the provisioner — port 3001, localhost)
This is a **production-quality multi-tenant provisioning system**:

- **Encrypted SQLite DB** (AES-256-GCM + scrypt KDF) — secrets never stored in plain text
- **Per-tenant management**: subscription tiers, trial periods, wallet addresses, bot tokens
- **Full Docker lifecycle**: `docker run`, `docker rm -f`, `docker exec` via SSH
- **Per-tenant SSH key generation** — each tenant gets their own keypair
- **REST API** for MCP integration (`POST /api/v1/agents/deploy`, etc.)
- **Openclaw gateway** in containers: Ubuntu 24.04 + Node.js 22 + openclaw npm package

### Tenant Runtime Image (what runs on VPS 2)
```
Ubuntu 24.04 → Node.js 22 → openclaw gateway
├── secrets bind-mounted: anthropic.key, openai.key, telegram.token
├── workspace bind-mounted: /tenant/workspace
└── runs as: non-root clawd user
```

### Clawdrop-MCP (Kimi's version of our control plane)
- Running via `tsx watch src/index.ts` on her VPS
- Has Helius verification + HFSP API wired
- **Problem**: diverging from our new monorepo structure

---

## Blockers Kimi Is Hitting

### 🔴 BLOCKER 1: VPS 2 SSH unreachable
```
HFSP (187.124.170.113) → SSH → 187.124.173.69 → TIMEOUT
```
VPS 2 is `running` per Hostinger API. No Hostinger firewall.
**Root cause**: likely `ufw` blocking port 22, or Kimi's provisioner SSH key 
(`id_ed25519_hfsp_provisioner`) not in `authorized_keys` on VPS 2.

**Fix needed**:
```bash
# From your Mac, add Kimi's provisioner key to VPS 2:
ssh root@187.124.173.69 "mkdir -p /root/.ssh && echo '$(ssh -i ~/.ssh/id_rsa root@187.124.170.113 cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub)' >> /root/.ssh/authorized_keys && ufw allow ssh || true"
```

### 🟡 BLOCKER 2: HFSP API is localhost-only
HFSP listens on `127.0.0.1:3001` — not reachable from our Mac's control plane.
Our `tools.ts` calls `http://187.124.170.113:3001` which won't work.

**Fix options**:
1. SSH tunnel: `ssh -L 3001:localhost:3001 root@187.124.170.113` (dev)
2. Change HFSP to listen on `0.0.0.0:3001` + add API key auth (production)

### 🟡 BLOCKER 3: Codebase divergence
Kimi's clawdrop-mcp is the old flat structure (`src/`).
We refactored to monorepo (`packages/control-plane/`).
Kimi's VPS is running the old version, not our new code.

---

## What Works End-to-End Today
- ✅ HFSP API starts and runs on Kimi's VPS
- ✅ Helius payment verification wired
- ✅ Tenant database (encrypted) working
- ✅ Docker image defined and correct
- ✅ MCP REST endpoints implemented
- ❌ Deploy → VPS 2 → Docker (SSH blocked)
- ❌ Our Mac → HFSP API (localhost-only)
