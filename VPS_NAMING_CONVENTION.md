# VPS Naming & Organization Convention

**Purpose**: Standardize naming and establish clear architectural roles  
**Status**: Proposal (awaiting your feedback)

---

## 📋 Proposed Naming Structure

### Format: `{environment}-{role}-{version}`

**Examples**:
- `prod-provisioner-1` (production provisioner)
- `prod-compute-1` (production agent compute)
- `prod-api-1` (production API/MCP endpoint)
- `staging-test-1` (staging test environment)
- `dev-local-1` (development local)

---

## 🏗️ Clear Role Definitions

### **PROVISIONER** (Deployment Control)
- **Purpose**: Deploy agents to compute nodes
- **Runs**: HFSP provisioner + clawdrop-mcp control plane
- **Ports**: 3001 (API), 22 (SSH)
- **Storage**: Agent definitions, SSH keys, billing data
- **Backups**: Critical (encrypted)
- **Monitoring**: Uptime critical
- **Example**: KIMI VPS (187.124.170.113)

### **COMPUTE** (Agent Runtime)
- **Purpose**: Run deployed agent containers
- **Runs**: Docker + OpenClaw containers
- **Ports**: 22 (SSH), 3000+ (per-agent)
- **Storage**: Agent data, logs, volumes
- **Backups**: Important (agent state)
- **Monitoring**: Per-tenant isolation critical
- **Example**: Tenant VPS (187.124.173.69)

### **API** (External Interface)
- **Purpose**: API gateway for external requests
- **Runs**: REST API servers, gateways
- **Ports**: 443 (HTTPS), 80 (HTTP redirect)
- **Storage**: Audit logs, API keys
- **Backups**: Important (transaction logs)
- **Monitoring**: Performance critical
- **Examples**: Iris, Piercalito, Satoshiclerk(?)

### **STORAGE** (Data Persistence)
- **Purpose**: Centralized data storage
- **Runs**: PostgreSQL, Redis, S3-like
- **Ports**: 5432 (DB), 6379 (Redis)
- **Storage**: Database backups, snapshots
- **Backups**: Critical (all data)
- **Monitoring**: Integrity critical
- **Examples**: TBD

### **MONITORING** (Observability)
- **Purpose**: Centralized logging, metrics, alerts
- **Runs**: Prometheus, Grafana, ELK stack
- **Ports**: 9090 (Prometheus), 3000 (Grafana)
- **Storage**: Metrics, logs (long-term)
- **Backups**: Important (historical data)
- **Monitoring**: Self-healing
- **Examples**: TBD

---

## 📊 Proposed New Names

Current → Proposed:

| Current | IP | Proposed | Role |
|---------|-----|----------|------|
| KIMI VPS | 187.124.170.113 | `prod-provisioner-1` | Deployment control |
| Tenant VPS | 187.124.173.69 | `prod-compute-1` | Agent runtime |
| Iris VPS | 187.124.174.137 | `prod-api-1` | API/MCP gateway |
| Piercalito | 72.62.239.63 | `prod-api-2` | API/MCP gateway (backup) |
| Satoshiclerk VPS | 76.13.157.84 | `staging-api-1` | Staging API server |

**Note**: These are proposals. Confirm actual roles first.

---

## 🗂️ Directory Structure (Per Server)

```
/srv/
├── provisioner/         (if provisioner role)
│   ├── hfsp/
│   ├── clawdrop-mcp/
│   └── .env
├── compute/             (if compute role)
│   ├── docker/
│   ├── agents/
│   └── logs/
├── api/                 (if API role)
│   ├── app/
│   ├── config/
│   └── .env
├── storage/             (if storage role)
│   ├── db/
│   ├── backups/
│   └── snapshots/
└── monitoring/          (if monitoring role)
    ├── prometheus/
    ├── grafana/
    └── logs/

/home/
├── clawd/               (service user)
│   ├── .ssh/
│   ├── .env
│   └── projects/
└── root/                (admin user)
    └── .ssh/

/var/log/
├── clawdrop/
├── docker/
└── services/
```

---

## 🔐 SSH Key Management

### Proposed Structure:

**Local (`~/.ssh/`):**
```
id_rsa_provisioner         # Root key for provisioner operations
id_rsa_compute             # Root key for compute nodes
id_rsa_api                 # API server keys
authorized_keys_provisioner # Keys allowed to deploy
```

**Remote per server (`/home/clawd/.ssh/`):**
```
authorized_keys            # Deploy keys from provisioner
id_rsa_service             # Service account key
```

---

## 📋 Configuration Management

### Environment Variables (Centralized)

**Per Role:**
```
# .env.provisioner
ROLE=provisioner
HFSP_PORT=3001
HFSP_SECRET=xxxx

# .env.compute
ROLE=compute
DOCKER_REGISTRY=xxxx
AGENT_ISOLATION=true

# .env.api
ROLE=api
API_PORT=443
API_KEY_VAULT=xxxx
```

### Secrets Management:

1. **Option A**: Git-ignored `.env.local` files
2. **Option B**: HashiCorp Vault (for production)
3. **Option C**: AWS Secrets Manager / Hostinger equivalent

---

## 🎯 Implementation Plan

### Phase 1: Documentation (THIS WEEK)
1. [ ] Audit each VPS to identify actual role
2. [ ] Document what currently runs
3. [ ] Create actual inventory
4. [ ] Confirm naming with team

### Phase 2: Naming & Config (NEXT WEEK)
1. [ ] Rename servers per convention
2. [ ] Update DNS/IP mapping
3. [ ] Centralize configurations
4. [ ] Document in inventory

### Phase 3: Automation (2 WEEKS OUT)
1. [ ] Create Terraform definitions
2. [ ] Set up Ansible playbooks
3. [ ] Automated backup/snapshot strategy
4. [ ] Monitoring & alerting

---

## ✅ Success Criteria

- [ ] All VPS have documented role
- [ ] Naming convention applied
- [ ] Single source of truth for inventory
- [ ] Clear responsibility per server
- [ ] SSH key management documented
- [ ] Disaster recovery plan per server
- [ ] Automated backups in place
- [ ] Monitoring active on all servers

---

## 📞 Questions for You

1. What is Iris VPS actually running?
2. What is Piercalito actually running?
3. What is Satoshiclerk VPS actually running?
4. Are any of these abandoned/redundant?
5. Do you prefer the proposed naming convention?
6. What's the port 18789 used for?
7. Do you have a preferred secrets management solution?

---

**Status**: Awaiting input  
**Next Step**: SSH audit to confirm roles
