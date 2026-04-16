# VPS Infrastructure Reference (Normalized)

**Last Updated**: 2026-04-16  
**Source**: User-provided VPS inventory  
**Status**: Normalized with codebase

---

## 🎯 Quick Reference

| Name | IP | Role | User | SSH Key | Status |
|------|-----|------|------|---------|--------|
| **KIMI** | 187.124.170.113 | Provisioner (HFSP + Control) | root | id_ed25519_hfsp_provisioner | ✅ Working |
| **TENANT** | 187.124.173.69 | Compute (Docker agents) | root | id_ed25519_187_124_173_69 | 🔴 SSH auth pending |
| **IRIS** | 187.124.174.137 | API Gateway (optional) | root | TBD | ✅ Available |
| **PIERCALITO** | 72.62.239.63 | API Backup (optional) | root | TBD | ✅ Available |
| **SATOSHICLERK** | 76.13.157.84 | Staging (optional) | root | TBD | ✅ Available |

---

## 📋 Environment Variables

All VPS references should use these normalized variable names:

```bash
# Provisioner (Kimi's VPS)
KIMI_VPS_HOST=187.124.170.113
KIMI_VPS_USER=root
KIMI_VPS_SSH_KEY=${HOME}/.ssh/id_ed25519_hfsp_provisioner

# Compute (Tenant agents)
TENANT_VPS_HOST=187.124.173.69
TENANT_VPS_USER=root
TENANT_VPS_SSH_KEY=${HOME}/.ssh/id_ed25519_187_124_173_69

# API Gateway (optional)
IRIS_VPS_HOST=187.124.174.137
IRIS_VPS_USER=root

# API Backup (optional)
PIERCALITO_VPS_HOST=72.62.239.63
PIERCALITO_VPS_USER=root

# Staging (optional)
SATOSHICLERK_VPS_HOST=76.13.157.84
SATOSHICLERK_VPS_USER=root
```

---

## 🔧 Detailed Configuration

### KIMI VPS (187.124.170.113)

**Role**: Provisioner - Deployment control & orchestration

**Services Running**:
- HFSP Agent Provisioning System (port 3001)
- clawdrop-mcp Control Plane (tsx watch)
- Node.js 22+

**Key Directories**:
```
/home/clawd/.ssh/id_ed25519_hfsp_provisioner     # SSH key for deployments
/home/clawd/hfsp-agent-provisioning/             # HFSP code
/home/clawd/clawdrop-mcp/                        # Control plane code
```

**How It's Used**:
```typescript
// In docker-ssh.ts
const provisioner = '187.124.170.113'; // HFSP provisioner
```

**Connectivity**:
- ✅ SSH access from Mac: `ssh root@187.124.170.113`
- ✅ HFSP API: `http://187.124.170.113:3001/api/v1/agents/deploy`

---

### TENANT VPS (187.124.173.69)

**Role**: Compute - Docker runtime for deployed agents

**Services Running**:
- Docker daemon
- Deployed agent containers (Ubuntu 24.04 + Node.js 22)
- Non-root `clawd` user (optional)

**Docker Setup**:
```
Memory: 1.5GB per agent (--memory=1.5g)
CPU: 0.5 cores per agent (--cpus=0.5)
PID limit: 100 per agent (--pids-limit=100)
Auto-cleanup: Every 6h (removes containers inactive >24h)
```

**How It's Used**:
```typescript
// In docker-ssh.ts
const TENANT_VPS_HOST = process.env.TENANT_VPS_HOST || '187.124.173.69';

// Deploy agent:
ssh root@187.124.173.69 "docker run -d \
  --memory=1.5g --cpus=0.5 \
  -e ANTHROPIC_API_KEY=$KEY \
  ghcr.io/clawdrop/openclaw:latest"
```

**Connectivity**:
- 🔴 SSH needs key setup (awaiting Kimi)
- After setup: `ssh -i ~/.ssh/id_ed25519_187_124_173_69 root@187.124.173.69`

---

### IRIS VPS (187.124.174.137)

**Role**: API Gateway (optional) - External API endpoints

**Status**: Not yet configured  
**Potential Use**: MCP server, API proxy, monitoring endpoints

**Notes**:
- Created Apr 17 (day after Tenant VPS)
- 1vCPU, 4GB RAM
- Available for Phase 2+ deployment

---

### PIERCALITO VPS (72.62.239.63)

**Role**: API Backup (optional) - Redundancy/failover

**Status**: Not yet configured  
**Potential Use**: Backup API gateway, alternate compute

**Notes**:
- 2vCPU, 8GB RAM
- Different datacenter (DC15)
- Can serve as fallback

---

### SATOSHICLERK VPS (76.13.157.84)

**Role**: Staging (optional) - Pre-production testing

**Status**: Not yet configured  
**Potential Use**: Staging deployment, load testing

**Notes**:
- 2vCPU, 8GB RAM
- Reserved for staging/testing
- Isolated from production

---

## 🔐 SSH Key Management

### Key Locations on Mac

```bash
~/.ssh/id_ed25519_hfsp_provisioner      # KIMI provisioner key
~/.ssh/id_ed25519_187_124_173_69        # TENANT local testing key
```

### Key Files on KIMI VPS

```bash
/home/clawd/.ssh/id_ed25519_hfsp_provisioner      # Private key (KIMI)
/home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub  # Public key (can be shared)
```

### Adding Keys to TENANT VPS

Run this on TENANT VPS (via Hostinger VNC console):

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Add provisioner key (for KIMI → TENANT deployments)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPmZErdYI/K85fSB4ileZcYfk0XfD1BkBIoEB55oqLiN hfsp-provisioner" >> /root/.ssh/authorized_keys

# Add local testing key (for direct Mac access)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI8cFs8W8KJsFWR3U9EtTFKX6CBM7Ba6m6JTo+17+Mpe8" >> /root/.ssh/authorized_keys

chmod 600 /root/.ssh/authorized_keys
```

---

## 📊 Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│ Your Mac / Control Plane                                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ SSH to provisioner (HFSP API)
                  ▼
┌─────────────────────────────────────────────────────────┐
│ KIMI VPS (187.124.170.113) - Provisioner                │
│ - HFSP Agent Provisioning System (port 3001)            │
│ - Receives deployment requests                          │
│ - Manages SSH keys & credentials                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ SSH to compute (deploy Docker)
                  ▼
┌─────────────────────────────────────────────────────────┐
│ TENANT VPS (187.124.173.69) - Compute                   │
│ - Docker daemon running                                 │
│ - Agent containers deployed                             │
│ - Agents connect to Claude API                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Connectivity

### Test KIMI (Provisioner)

```bash
# From Mac
ssh root@187.124.170.113 "systemctl status ssh"

# Check HFSP
curl http://187.124.170.113:3001/health
```

### Test TENANT (Compute) - After SSH Key Setup

```bash
# From Mac (direct)
ssh -i ~/.ssh/id_ed25519_187_124_173_69 root@187.124.173.69 "docker ps"

# From KIMI (provisioner)
ssh root@187.124.170.113 "ssh -i /home/clawd/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69 docker ps"
```

---

## ⚙️ Code References

### Where Each VPS Is Used

**KIMI (187.124.170.113)**:
- `packages/control-plane/src/hfsp.ts` - HFSP API calls
- `.env.template` - KIMI_VPS_HOST=187.124.170.113

**TENANT (187.124.173.69)**:
- `packages/control-plane/src/integrations/docker-ssh.ts` - Docker deployments
- `FIRST_AGENT_DEPLOYMENT_GUIDE.md` - Deployment reference
- `.env.template` - TENANT_VPS_HOST=187.124.173.69

**IRIS, PIERCALITO, SATOSHICLERK**:
- Reserved for Phase 2+ expansion
- Environment variables defined in `.env.template`

---

## 🚨 Troubleshooting

### SSH Timeout to KIMI

```bash
ssh -v root@187.124.170.113
# Should complete handshake quickly
```

If timeout: Check firewall on KIMI VPS, contact infrastructure.

### SSH Timeout to TENANT

Wait for Kimi to add SSH keys to `/root/.ssh/authorized_keys`.

```bash
# Then test:
ssh -i ~/.ssh/id_ed25519_187_124_173_69 root@187.124.173.69 "uname -a"
```

### Docker Commands on TENANT

```bash
# List running containers
ssh root@187.124.173.69 "docker ps"

# View logs
ssh root@187.124.173.69 "docker logs <container_id>"

# Check resource usage
ssh root@187.124.173.69 "docker stats"
```

---

## 📝 Maintenance

### When Adding New VPS

1. Add to this file under "Detailed Configuration"
2. Add environment variables to `.env.template`
3. Update code to reference the new VPS
4. Commit with message: `refactor(infra): Add <VPS_NAME> to infrastructure`

### When Changing VPS Purpose

1. Update this file with new role & services
2. Update code comments & documentation
3. Update `.env.template` description
4. Commit with message: `refactor(infra): Reassign <VPS_NAME> to <new_role>`

---

**Owner**: Infrastructure Team  
**Last Audited**: 2026-04-16  
**Status**: Normalized to user-provided naming convention  
**Next**: Await TENANT SSH key setup, begin Phase 2 deployment
