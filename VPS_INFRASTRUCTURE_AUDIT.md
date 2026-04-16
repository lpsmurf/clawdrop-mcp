# VPS Infrastructure Audit & Organization Plan

**Date**: 2026-04-16  
**Status**: Audit in progress  
**Owner**: Build Team

---

## 🗺️ Complete VPS Inventory

| Name | IP | Role | Specs | Status | Access |
|------|-----|------|-------|--------|--------|
| **Tenant VPS** | 187.124.173.69 | Docker agent compute | ? | 🔴 SSH blocked | root |
| **KIMI VPS** | 187.124.170.113 | Provisioner (HFSP) | ? | ✅ Running | root |
| **Iris VPS** | 187.124.174.137 | Service? | ? | ✅ Running | root + clawd user |
| **Piercalito** | 72.62.239.63 | Service? | ? | ✅ Running | root + clawd user |
| **Satoshiclerk VPS** | 76.13.157.84 | Service? | ? | ✅ Running | root + clawd user |

---

## 🔍 What We Know

### Confirmed Usage

**KIMI VPS (187.124.170.113)** - ✅ Clear purpose
- Runs HFSP provisioner (port 3001, localhost)
- Runs clawdrop-mcp control plane
- Manages agent deployment to Tenant VPS
- Holds provisioner SSH keys

**Tenant VPS (187.124.173.69)** - ✅ Clear purpose (but inaccessible)
- Docker host for deploying agent containers
- Target for HFSP provisioner deployments
- Blocked by SSH firewall/key issue

### Unknown Usage

**Iris VPS, Piercalito, Satoshiclerk** - ❓ Purpose unclear
- All have port forwarding setup for port 18789
- Suggests they run services needing tunnel access
- May be test/staging environments
- May be abandoned

---

## ⚠️ Problems

1. **No documentation** of what runs on Iris, Piercalito, Satoshiclerk
2. **Unclear naming** - no convention (Iris? Piercalito? Satoshiclerk?)
3. **No standardized naming** - mix of nicknames vs descriptions
4. **Potential redundancy** - multiple services port 18789?
5. **No disaster recovery** plan for each
6. **No backup/snapshot** strategy
7. **SSH key management** scattered across servers
8. **No network topology** documentation

---

## 🎯 Organization Goals

### Phase 1: Documentation (NOW)
1. SSH into each server and document what's running
2. Create inventory with actual configs
3. Identify abandoned/redundant services
4. Map network topology

### Phase 2: Naming & Structure (NEXT)
1. Standardize naming convention
2. Create clear role definitions
3. Document responsibilities per server
4. Set up inventory tracking

### Phase 3: Automation & Cleanup (FUTURE)
1. Infrastructure-as-code (Terraform/CloudFormation)
2. Automated backups/snapshots
3. Configuration management (Ansible)
4. Monitoring & alerting

---

## 📋 Data Collection Needed

For each VPS, we need to know:

```
Server: _______________
IP: ____________________
Primary Role: __________
Secondary Roles: _______

What's running:
  - Services (ports, versions): _________________
  - Databases: _________________________________
  - MCP servers: _______________________________
  - Cron jobs: _________________________________
  - Custom code: _______________________________

Networking:
  - Port forwarding (18789?): ___________________
  - Firewall rules: ______________________________
  - SSH keys installed: __________________________

Critical files/configs:
  - .env files: _________________________________
  - Config files: _______________________________
  - Data directories: ___________________________

Backup/Recovery:
  - Last backup: ________________________________
  - Snapshot strategy: __________________________
  - Disaster recovery plan: _____________________
```

---

## 🚀 Next Steps

1. **Collect Information** (run discovery on each VPS)
2. **Create Inventory Document** (with actual data)
3. **Design naming convention** (clear, consistent)
4. **Map architecture** (network diagram)
5. **Implement cleanup** (remove redundancy)
6. **Set up automation** (IaC, monitoring)

---

## 💻 Discovery Commands

Once SSH is accessible, run on each server:

```bash
# System info
hostnamectl
uname -a
free -h
df -h

# Running services
systemctl list-units --type=service --all
ps aux | head -30

# Network
ss -tlnp
cat /etc/ufw/rules.v4 2>/dev/null || echo "UFW not configured"

# Key processes
docker ps 2>/dev/null || echo "No Docker"
pm2 list 2>/dev/null || echo "No PM2"
ps aux | grep -E "node|npm|tsx|python"

# Environment
env | grep -E "MCP|DUFFEL|AMADEUS|GNOSIS|HFSP" | sort

# Cron jobs
crontab -l
ls -la /etc/cron.d/

# Recent activity
journalctl -n 20 --no-pager
```

---

**Status**: Ready for discovery phase  
**Next Review**: After SSH audit complete
