# VPS 2 SSH Fix (187.124.173.69)

## Problem Diagnosis

**Symptom**: `ssh root@187.124.173.69` hangs and times out

**SSH Debug Output**:
```
debug1: Connection established.
...
Connection timed out during banner exchange
```

**Interpretation**: 
- TCP connection succeeds (socket established)
- SSH daemon is NOT responding with banner (SSH version string)
- This means SSH daemon is either:
  1. Not running
  2. Blocked by firewall (ufw/iptables)
  3. Crashed or misconfigured

---

## Solution Path

### Option A: Direct SSH Access (Preferred)
**If SSH daemon is running but blocked by firewall**

1. Check SSH daemon status via Hostinger VNC console (below)
2. Disable/allow SSH in firewall:
   ```bash
   ufw status                    # see current rules
   ufw allow 22/tcp              # allow SSH
   systemctl restart ssh         # restart SSH daemon
   ```
3. Retry: `ssh root@187.124.173.69`

### Option B: Hostinger VNC Console
**If SSH daemon is not running**

1. Go to Hostinger hPanel: https://hpanel.hostinger.com/
2. Hosting → VPS → VPS 2 (187.124.173.69)
3. Click "Console" or "VNC"
4. Log in with VPS credentials
5. Run commands to fix SSH/firewall

### Option C: Recovery Boot + Firewall Fix
**If VPS is completely unreachable**

1. Hostinger hPanel → VPS 2
2. Click "Power" → "Reboot"
3. Wait 2-3 minutes for boot
4. Try SSH again
5. If still no luck, use VNC console

---

## Quick Fix (Via Hostinger Console)

### Step 1: Check SSH Status
```bash
sudo systemctl status ssh
# If inactive: sudo systemctl start ssh
```

### Step 2: Check Firewall
```bash
sudo ufw status
# If SSH blocked: sudo ufw allow 22/tcp
```

### Step 3: Verify SSH Listening
```bash
sudo ss -tlnp | grep :22
# Should show: tcp LISTEN 0 128 0.0.0.0:22 ...
```

### Step 4: Add Provisioner Key
```bash
# Create .ssh dir if missing
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add provisioner public key from VPS 1 (HFSP server)
# Key location: /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub
# Or paste: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN... (from HFSP)

echo "ssh-ed25519 AAAAC3Nz..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 5: Verify Docker
```bash
docker --version
# Expected: Docker version 20.10+ or similar
```

---

## Testing After Fix

```bash
# From Mac/control plane:
ssh -v root@187.124.173.69 "echo SSH OK"
# Expected: SSH OK

# Test Docker:
ssh root@187.124.173.69 "docker run hello-world"
# Expected: Hello from Docker!
```

---

## Provisioner Key Details

**Location on VPS 1 (HFSP server)**:
```
/home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub
```

**Usage**:
- This is the public key of the HFSP provisioner service
- Allows VPS 1 to SSH into VPS 2 to deploy agents
- Should be in VPS 2's `authorized_keys` file

**To retrieve from VPS 1**:
```bash
ssh root@187.124.170.113
cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub
# Output: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN... provisioner@vps1
```

---

## Current Status

| Component | Status | Action |
|-----------|--------|--------|
| TCP Connection to :22 | ✅ Working | N/A |
| SSH Banner Exchange | ❌ Times out | Fix firewall/SSH daemon |
| Provisioner Key | ❌ Missing | Add to authorized_keys |
| Docker | ? Unknown | Verify after SSH fixed |

---

## Next Steps

1. **Access VPS 2 via Hostinger Console** (VNC)
2. **Check SSH daemon**: `systemctl status ssh`
3. **Check firewall**: `ufw status`
4. **Allow SSH**: `ufw allow 22/tcp` (if blocked)
5. **Add provisioner key**: Paste into `~/.ssh/authorized_keys`
6. **Test from control plane**: `ssh root@187.124.173.69 "docker --version"`
7. **Confirm Docker**: Should return version string

---

## Estimated Time: 15-30 minutes

- 5 min: Access Hostinger Console
- 5 min: Check and fix SSH daemon
- 5 min: Check and fix firewall
- 5 min: Add provisioner key
- 5 min: Test connectivity and Docker

**If SSH still fails after firewall fixes, likely causes**:
- Key rejection (wrong key in authorized_keys)
- SSH config issue (Port changed, PermitRootLogin disabled)
- Firewall still blocking (iptables rules that ufw can't see)

---

**Owner**: Kimi (infrastructure)  
**Blocker For**: Agent deployment to Docker  
**Impact**: Cannot proceed with Option B (Docker wiring) until fixed
