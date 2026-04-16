# Action Required: Fix VPS 2 SSH Access

**Priority**: 🔴 CRITICAL - Blocks Agent Deployment  
**Estimated Time**: 30 minutes  
**Target Completion**: Today (Apr 16)

---

## Summary

We've completed Phase 1 planning, integrated Duffel for flight bookings, and fixed critical bugs in the provisioning code. **Everything is ready except for one thing: VPS 2 SSH access.**

Currently, the provisioner (KIMI VPS) cannot SSH into the compute host (Tenant VPS). This blocks all agent deployments.

**Your mission**: Fix SSH access to VPS 2 (187.124.173.69) in 30 minutes.

---

## Quick Steps

1. **Log into Hostinger hPanel**
2. **Navigate to VPS → VPS 2** (187.124.173.69)
3. **Click "Console" (VNC)**
4. **Run these commands in order:**

```bash
# Check SSH daemon
sudo systemctl status ssh

# Allow SSH through firewall
sudo ufw allow 22/tcp

# Restart SSH
sudo systemctl restart ssh

# Test from your Mac (later)
ssh root@187.124.173.69 "docker --version"
```

5. **Verify it works** (from your Mac):
```bash
ssh -i ~/.ssh/id_rsa_provisioner root@187.124.173.69 "whoami"
# Should return: root
```

---

## Full Guide

If you need more details, see: **HOSTINGER_VNC_GUIDE.md** in the repo

It has:
- Step-by-step VNC console access
- Firewall troubleshooting
- SSH key configuration
- Testing procedures
- Common issues & fixes

---

## What Happens After

Once SSH is working:
1. ✅ I'll test end-to-end Duffel flight integration
2. ✅ Deploy the first agent to Docker
3. ✅ Run Phase 2 kickoff planning
4. ✅ Everything is ready for first tenant deployment

---

## TL;DR

```bash
# These 3 commands in VPS 2 VNC console:
sudo systemctl status ssh
sudo ufw allow 22/tcp
sudo systemctl restart ssh

# Then test:
ssh root@187.124.173.69 "whoami"
```

**Let me know when it's done!**

---

**Created**: 2026-04-16  
**Owner**: Build Team  
**Blocker**: Yes (agent deployment)
