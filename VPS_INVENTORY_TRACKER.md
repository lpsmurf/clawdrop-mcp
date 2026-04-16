# VPS Inventory Tracker

**Last Updated**: 2026-04-16  
**Status**: Awaiting detailed audit

---

## 🚀 Quick Inventory

| # | Current Name | IP | Proposed Name | Role | Status | SSH |
|---|---|---|---|---|---|---|
| 1 | KIMI VPS | 187.124.170.113 | prod-provisioner-1 | ✅ CONFIRMED | ✅ Running | ✅ Working |
| 2 | Tenant VPS | 187.124.173.69 | prod-compute-1 | ✅ CONFIRMED | 🔴 SSH blocked | ❌ Blocked |
| 3 | Iris VPS | 187.124.174.137 | prod-api-1? | ❓ Unknown | ✅ Running | ✅ Available |
| 4 | Piercalito | 72.62.239.63 | prod-api-2? | ❓ Unknown | ✅ Running | ✅ Available |
| 5 | Satoshiclerk VPS | 76.13.157.84 | staging-api-1? | ❓ Unknown | ✅ Running | ✅ Available |

---

## 📝 DETAILED AUDIT (Fill This In)

### 1️⃣ KIMI VPS (187.124.170.113)

**Status**: ✅ CONFIRMED - Provisioner

```
Role:           Provisioner (deployment control)
Services:       HFSP provisioner (port 3001)
                clawdrop-mcp control plane (tsx watch)
                
Running on:     Ubuntu 22.04? [VERIFY]
Node version:   v18? v20? [VERIFY]
Docker:         Installed? [VERIFY]

Key directories:
  /home/clawd/.ssh/id_ed25519_hfsp_provisioner
  /home/clawd/hfsp-agent-provisioning/
  /home/clawd/clawdrop-mcp/

Environment vars:
  HFSP_PORT=3001
  CLAWDROP_WALLET_ADDRESS=?
  HELIUS_API_KEY=?

Storage:
  Agent definitions
  SSH keys
  Billing data
  Deployment logs

Backups:
  Strategy: [DOCUMENT]
  Last backup: [DATE]
  Location: [PATH]

Monitoring:
  Uptime required: YES (critical)
  Alert contacts: [LIST]
```

---

### 2️⃣ Tenant VPS (187.124.173.69)

**Status**: 🔴 SSH BLOCKED - Cannot audit yet

```
Role:           Compute (agent runtime)
Services:       Docker daemon
                OpenClaw containers
                
Current issue:  SSH banner timeout
                Likely: ufw blocking port 22 or missing provisioner key

Expected setup:
  OS:             Ubuntu 22.04
  Docker:         Latest
  OpenClaw:       Node.js 22 + openclaw npm package
  
Known facts:
  Plan:           KVM 2 (2vCPU, 8GB RAM)
  Datacenter:     19
  Created:        [DATE]

Blocked tasks:
  ❌ Cannot deploy agents
  ❌ Cannot test connectivity
  ❌ Cannot verify Docker setup

Fix needed:
  [ ] Access via Hostinger VNC
  [ ] Fix SSH daemon / firewall
  [ ] Add provisioner key
  [ ] Test SSH from KIMI
  [ ] See: HOSTINGER_VNC_GUIDE.md
```

---

### 3️⃣ Iris VPS (187.124.174.137)

**Status**: ❓ UNKNOWN - Needs audit

```
Role:           [UNKNOWN] - possibly API server?
Port forwarding: ssh -N -L 18789:127.0.0.1:18789 clawd@187.124.174.137

Questions:
  [ ] What service runs on port 18789?
  [ ] Why port forwarding needed?
  [ ] Is this active/in use?
  [ ] Is there a clawd user for service account?
  [ ] What data/state is stored?
  [ ] Is it production or test?

Run discovery:
  ssh root@187.124.174.137 < scripts/vps-discovery.sh
```

---

### 4️⃣ Piercalito (72.62.239.63)

**Status**: ❓ UNKNOWN - Needs audit

```
Role:           [UNKNOWN] - possibly API server?
Port forwarding: ssh -N -L 18789:127.0.0.1:18789 clawd@72.62.239.63

Questions:
  [ ] What service runs on port 18789?
  [ ] Duplicate of Iris or different service?
  [ ] Is this active/in use?
  [ ] Backup for Iris or independent?
  [ ] Production or test?

Run discovery:
  ssh root@72.62.239.63 < scripts/vps-discovery.sh
```

---

### 5️⃣ Satoshiclerk VPS (76.13.157.84)

**Status**: ❓ UNKNOWN - Needs audit

```
Role:           [UNKNOWN] - possibly staging?
Port forwarding: ssh -N -L 18789:127.0.0.1:18789 clawd@76.13.157.84

Questions:
  [ ] What service runs on port 18789?
  [ ] Why same port as other VPS?
  [ ] Is this active/in use?
  [ ] Is this staging or abandoned?
  [ ] Any data/state stored?

Run discovery:
  ssh root@76.13.157.84 < scripts/vps-discovery.sh
```

---

## 🎯 Action Items

### Immediate (TODAY)
- [ ] Answer questions for Iris, Piercalito, Satoshiclerk
- [ ] Identify actual role of each VPS
- [ ] Confirm if any are abandoned

### Short-term (THIS WEEK)
- [ ] Run discovery script on each VPS
- [ ] Confirm port 18789 usage
- [ ] Document SSH key locations
- [ ] Confirm naming preferences

### Medium-term (NEXT WEEK)
- [ ] Implement naming convention
- [ ] Centralize configuration
- [ ] Set up backup strategy

### Long-term (2 WEEKS)
- [ ] Infrastructure-as-code (Terraform)
- [ ] Automated monitoring
- [ ] Disaster recovery plans

---

## 🔍 Discovery Commands Reference

**Quick inventory of what's running:**
```bash
ssh root@<ip> "
  echo '=== SYSTEM ==='; uname -a; 
  echo '=== SERVICES ==='; systemctl list-units --type=service | grep running | head -10;
  echo '=== DOCKER ==='; docker ps 2>/dev/null || echo 'No Docker';
  echo '=== NODE PROCESSES ==='; ps aux | grep -E 'node|npm|tsx' | grep -v grep;
  echo '=== PORTS ==='; ss -tlnp 2>/dev/null | head -20;
"
```

**Full discovery report:**
```bash
ssh root@<ip> < scripts/vps-discovery.sh
```

---

## 📋 Template for Each VPS

```
SERVER: [name]
IP: [address]
ACCESS: ssh root@[ip]

PURPOSE: [what is it for?]
CRITICALITY: [high/medium/low]

RUNNING SERVICES:
  - [service 1]
  - [service 2]

KEY DIRECTORIES:
  - [path 1]
  - [path 2]

ENVIRONMENT:
  [KEY=value pairs]

BACKUPS:
  Strategy: [how is it backed up?]
  Last: [when?]
  Location: [where?]

NOTES: [anything else important?]
```

---

**Next Review**: After you provide details on Iris, Piercalito, Satoshiclerk

