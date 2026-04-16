# VPS Nomenclature Audit & Bug Report

**Date**: 2026-04-16  
**Severity**: 🔴 CRITICAL - Hardcoded wrong VPS in code  
**Status**: Active discovery

---

## 🐛 CRITICAL BUG FOUND

### Location: `packages/control-plane/src/integrations/docker-ssh.ts`

```typescript
Line 12:
const VPS_HOST = process.env.VPS_HOST || '187.124.170.113';  // ❌ WRONG!
```

**Problem**: 
- Default points to KIMI VPS (187.124.170.113) - the provisioner
- Should point to Tenant VPS (187.124.173.69) - the Docker compute host
- This will cause all deployments to fail with "SSH not working on KIMI"

**Fix**:
```typescript
const VPS_HOST = process.env.VPS_HOST || '187.124.173.69';  // ✅ CORRECT
```

**Impact**: 
- ❌ Cannot deploy agents to Docker
- ❌ Agent container commands will fail
- ❌ All tests using deployments will fail

---

## 📊 Complete VPS Nomenclature Mapping

### Current State (Inconsistent)

**In Code**:
- `docker-ssh.ts`: Hardcoded as IP (187.124.170.113, wrong)
- `hfsp.ts`: Uses `HFSP_URL` env var (no IP)
- Documentation: Uses names (KIMI, Tenant, Iris, etc.)

**In Docs**:
- KIMI_STATUS_REPORT.md: Mixed names + IPs
- VPS_NAMING_CONVENTION.md: Proposes naming convention
- Multiple files: Inconsistent references

### Proposed Standardized Format

All references should follow this priority:

1. **Preferred**: Environment variable (ROLE_VPS_HOST)
2. **Fallback**: IP address (hardcoded if no env var)
3. **Never**: Nicknames in code

---

## ✅ Standardization Plan

### Step 1: Define Environment Variables

```bash
# .env (or .env.local)

# Provisioner VPS (Deployment Control)
PROVISIONER_VPS_HOST=187.124.170.113
PROVISIONER_VPS_USER=root

# Compute VPS (Agent Docker Host)
COMPUTE_VPS_HOST=187.124.173.69
COMPUTE_VPS_USER=root

# API VPS (API Gateway) - TBD
API_VPS_HOST=187.124.174.137
API_VPS_USER=root

# SSH Configuration
SSH_KEY_PATH=${HOME}/.ssh/id_rsa_provisioner
SSH_TIMEOUT=10000
SSH_STRICT_HOST_CHECK=no

# HFSP Configuration (on provisioner)
HFSP_URL=http://${PROVISIONER_VPS_HOST}:3001
HFSP_API_KEY=xxx
```

### Step 2: Code Standardization

**Current (Bad)**:
```typescript
const VPS_HOST = process.env.VPS_HOST || '187.124.170.113';
```

**Proposed (Good)**:
```typescript
const COMPUTE_VPS_HOST = process.env.COMPUTE_VPS_HOST || '187.124.173.69';
const PROVISIONER_VPS_HOST = process.env.PROVISIONER_VPS_HOST || '187.124.170.113';
```

**Usage**:
```typescript
// When deploying Docker containers:
ssh(`${COMPUTE_VPS_USER}@${COMPUTE_VPS_HOST}`, `docker run ...`)

// When managing provisioning:
http.post(`${HFSP_URL}/deploy`, ...)
```

### Step 3: Documentation Standards

**File naming**:
- ✅ `VPS_INFRASTRUCTURE_AUDIT.md`
- ✅ `VPS_INVENTORY_TRACKER.md`
- ✅ `VPS_NAMING_CONVENTION.md`
- ❌ `KIMI_STATUS_REPORT.md` (too specific)

**Content standards**:
- Always use: IP + proposed name + role
- Example: `Tenant VPS (prod-compute-1, 187.124.173.69)`
- Never: Abbreviations or nicknames alone

### Step 4: File Updates Needed

| File | Change | Severity |
|------|--------|----------|
| `docker-ssh.ts` | Fix VPS_HOST default | 🔴 CRITICAL |
| `.env.template` | Add VPS host vars | 🟡 HIGH |
| `KIMI_STATUS_REPORT.md` | Use consistent naming | 🟡 MEDIUM |
| All docs | Standardize references | 🟡 MEDIUM |
| `hfsp.ts` | Use PROVISIONER_VPS_HOST | 🟡 LOW |

---

## 🗂️ Nomenclature Reference

### Authoritative Mapping

```
NAME              IP              ROLE           ENV VAR              PROPOSED NAME
────────────────────────────────────────────────────────────────────────────────────
KIMI VPS          187.124.170.113 Provisioner    PROVISIONER_VPS_HOST prod-provisioner-1
Tenant VPS        187.124.173.69  Compute        COMPUTE_VPS_HOST     prod-compute-1
Iris VPS          187.124.174.137 ? (API?)       API_VPS_HOST_1       prod-api-1
Piercalito        72.62.239.63    ? (API?)       API_VPS_HOST_2       prod-api-2
Satoshiclerk VPS  76.13.157.84    ? (Staging?)   STAGING_VPS_HOST     staging-api-1
```

### Used In Files

**docker-ssh.ts** (Compute operations):
- Should use: `COMPUTE_VPS_HOST` (187.124.173.69)
- Currently uses: Default 187.124.170.113 ❌

**hfsp.ts** (Provisioning):
- Should use: `PROVISIONER_VPS_HOST` (187.124.170.113)
- Currently uses: `HFSP_URL` env var ✅

**Tools & Commands**:
- Should use: Variables not IPs
- Never hardcode IPs except as env var defaults

---

## 🔧 Action Items

### CRITICAL (Do Today)
- [ ] Fix docker-ssh.ts VPS_HOST default
- [ ] Create .env.template with all VPS vars
- [ ] Test deployment after fix

### HIGH (This Week)
- [ ] Update all code to use env vars
- [ ] Rename documentation to avoid confusion
- [ ] Create VIPS_HOSTS.md as single source of truth

### MEDIUM (Next Week)
- [ ] Update KIMI_STATUS_REPORT.md with new naming
- [ ] Create migration guide for team
- [ ] Audit all IP references in codebase

### LOW (Future)
- [ ] Infrastructure-as-code for VPS definitions
- [ ] Automated inventory sync
- [ ] Network topology diagrams

---

## 📋 Files to Update

```
packages/control-plane/
├── src/
│   ├── integrations/
│   │   ├── docker-ssh.ts          ← FIX VPS_HOST DEFAULT
│   │   └── hfsp.ts                ← Already uses env var ✅
│   └── server/
│       └── tools.ts               ← Verify VPS refs
├── .env.template                  ← CREATE with VPS vars
└── .env.local                      ← User fills in

Root:
├── .env                            ← Reference copy
├── VPS_HOSTS.md                    ← New single source of truth
└── VPS_NOMENCLATURE_AUDIT.md      ← This file
```

---

## ✅ Success Criteria

- [ ] No hardcoded wrong IPs in source code
- [ ] All VPS references use environment variables
- [ ] .env.template documents all VPS settings
- [ ] Single source of truth document (VPS_HOSTS.md)
- [ ] All team members use same naming convention
- [ ] Tests verify correct VPS connectivity

---

**Owner**: Build Team  
**Blocker**: Yes (deployment tests fail without fix)  
**Next Step**: Fix docker-ssh.ts and test deployments
