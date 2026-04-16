# Kimi's VPS 2 SSH Fix Checklist - Tomorrow Morning

**Date**: April 17, 2026  
**Owner**: Kimi  
**Mission**: Fix VPS 2 SSH connectivity (187.124.173.69)  
**Blockers**: Deployment of first Clawdrop agent  
**Time Estimate**: 25-30 minutes  
**Success Metric**: `ssh root@187.124.173.69 "docker --version"` returns Docker version

---

## Pre-Flight Check (Before Starting)

Before you begin, verify you have:

- [ ] Hostinger hPanel login credentials (email/password)
- [ ] VPS 2 root password (check email from Hostinger)
- [ ] Access to your Mac/terminal for testing
- [ ] HOSTINGER_VNC_GUIDE.md open in browser for reference
- [ ] 30 minutes of uninterrupted time

**If missing any of above**: Ask now before proceeding

---

## Phase 1: Access VPS 2 via Hostinger VNC (5 minutes)

### Step 1.1: Open Hostinger hPanel
- [ ] Open browser
- [ ] Go to https://hpanel.hostinger.com/
- [ ] Enter your Hostinger email and password
- [ ] Click Login
- **Expected**: Dashboard shows your hosting products

### Step 1.2: Navigate to VPS 2
- [ ] In left sidebar, click **"Hosting"** or **"Products"**
- [ ] Find **"VPS"** section
- [ ] Click on **"VPS 2"** (or the one with IP 187.124.173.69)
- **Expected**: VPS management panel opens

### Step 1.3: Open VNC Console
- [ ] Look for **"Console"**, **"VNC Console"**, or **"Remote Console"** button
  - Usually top-right of the panel
  - Or under "Tools" or "Power" menu
  - Or in "..." (more options) menu
- [ ] Click the Console button
- **Expected**: New window opens with VNC login screen

### Step 1.4: Log Into VNC Console
- [ ] VNC login screen appears
- [ ] **Username field**: Type `root`
- [ ] **Password field**: Type your VPS root password
  - (From Hostinger "Installation Complete" email)
  - (Or check hPanel VPS settings)
  - (Or reset password in hPanel if forgotten)
- [ ] Click **Login** button
- [ ] Wait 2-3 seconds for connection
- **Expected**: You see a command prompt `root@vps2:~#`

### Step 1.5: Verify VNC Connection
- [ ] Type command: `whoami`
- [ ] Press Enter
- **Expected output**: `root`
- [ ] If you see `root`, VNC connection is working ✅

---

## Phase 2: Check and Fix SSH (10 minutes)

### Step 2.1: Check SSH Daemon Status
- [ ] Type command: `sudo systemctl status ssh`
- [ ] Press Enter
- [ ] Wait for output
- **Expected**: Shows `● ssh.service - OpenSSH server` with `Active: active (running)`

**If it says "inactive" or "dead"**:
- [ ] Run: `sudo systemctl start ssh`
- [ ] Run: `sudo systemctl enable ssh`
- [ ] Run again: `sudo systemctl status ssh` to verify it's now `active (running)`
- [ ] Take note: SSH was not running, you just fixed it

### Step 2.2: Check Firewall Status
- [ ] Type command: `sudo ufw status`
- [ ] Press Enter
- [ ] Wait for output
- **Expected**: Shows status and list of allowed ports
- [ ] Look for line with `22` in it
- [ ] **Goal**: SSH (port 22) should be listed as `ALLOW`

**If port 22 is NOT listed or shows DENY**:
- [ ] Run: `sudo ufw allow 22/tcp`
- [ ] Run: `sudo ufw allow 22/udp`
- [ ] Run: `sudo ufw reload`
- [ ] Run again: `sudo ufw status` to verify `22/tcp` now shows `ALLOW`
- [ ] Take note: Firewall was blocking SSH, you just fixed it

### Step 2.3: Verify SSH is Listening
- [ ] Type command: `sudo ss -tlnp | grep :22`
- [ ] Press Enter
- **Expected**: Shows line with `tcp   LISTEN 0  128  0.0.0.0:22`
- [ ] If you see this, SSH daemon is properly listening ✅

---

## Phase 3: Add Provisioner Key (5 minutes)

**Purpose**: Allow VPS 1 (control plane) to deploy agents to VPS 2

### Step 3.1: Get Provisioner Public Key from VPS 1

**Important**: You'll need to do this from your Mac terminal (NOT in VNC console)

- [ ] Open **new Mac terminal window** (or exit VNC console temporarily)
- [ ] Type command: `ssh root@187.124.170.113`
- [ ] When prompted for password, type VPS 1 root password
- [ ] Once connected to VPS 1, type: `cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub`
- [ ] You'll see output like: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN...`
- [ ] **Copy the entire line** (Ctrl+C or select-all)
- [ ] Type `exit` to disconnect from VPS 1

**Key line you copied looks like**:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN4xj5kL2m9pQrStUvWxYz... provisioner@vps1
```

**Save this key somewhere** (notepad, clipboard) - you'll need it in next step

### Step 3.2: Create .ssh Directory on VPS 2

**Back in VNC console (still showing `root@vps2:~#`)**:

- [ ] Type command: `mkdir -p ~/.ssh`
- [ ] Press Enter
- [ ] Type command: `chmod 700 ~/.ssh`
- [ ] Press Enter
- **Expected**: No error messages (command completed silently)

### Step 3.3: Add Provisioner Key to authorized_keys

**Still in VNC console**:

- [ ] Type command: `echo "PASTE_KEY_HERE" >> ~/.ssh/authorized_keys`
  - Replace `PASTE_KEY_HERE` with the actual key from Step 3.1
  - The key starts with `ssh-ed25519 AAAAC3NzaC1...`
  - **Full command example**:
    ```
    echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN4xj5kL2m9pQrStUvWxYz... provisioner@vps1" >> ~/.ssh/authorized_keys
    ```
- [ ] Press Enter
- **Expected**: No error messages, command completes silently

### Step 3.4: Set Permissions on authorized_keys
- [ ] Type command: `chmod 600 ~/.ssh/authorized_keys`
- [ ] Press Enter
- **Expected**: No error messages

### Step 3.5: Verify Key Was Added
- [ ] Type command: `cat ~/.ssh/authorized_keys`
- [ ] Press Enter
- **Expected**: You see the key you just pasted displayed
- [ ] Verify it starts with `ssh-ed25519 AAAAC3NzaC1...`
- **Check**: Key should match the one from Step 3.1 ✅

---

## Phase 4: Close VNC and Test from Mac (5 minutes)

### Step 4.1: Log Out of VNC Console
- [ ] In VNC console, type: `exit`
- [ ] Press Enter
- [ ] VNC window should close or show "disconnected"
- [ ] Close the VNC browser tab/window

### Step 4.2: Test SSH Connectivity
- [ ] Open Mac terminal (or use existing one)
- [ ] Type command: `ssh -v root@187.124.173.69 "echo SSH OK"`
- [ ] Press Enter
- [ ] Wait 5-10 seconds for response

**Expected output**:
```
...debug1: Authentication succeeded...
SSH OK
Connection to 187.124.173.69 closed.
```

**If you see "SSH OK"**: SSH is working! ✅

**If it hangs or times out**:
- [ ] Press Ctrl+C to cancel
- [ ] Go back to VNC console (open it again)
- [ ] Verify provisioner key is in authorized_keys: `cat ~/.ssh/authorized_keys`
- [ ] Verify permissions: `ls -la ~/.ssh/authorized_keys` (should show `-rw-------`)
- [ ] Try SSH test again

### Step 4.3: Test Docker Installation
- [ ] Type command: `ssh root@187.124.173.69 "docker --version"`
- [ ] Press Enter
- [ ] Wait 3-5 seconds for response

**Expected output**:
```
Docker version 20.10.x, build xxxxx
```

**If you see Docker version**: Docker is installed! ✅

**If error "docker: command not found"**:
- [ ] Docker needs to be installed
- [ ] Go back to VNC console
- [ ] Run: `curl -fsSL https://get.docker.com -o get-docker.sh`
- [ ] Run: `sudo sh get-docker.sh`
- [ ] Wait 2-3 minutes for installation
- [ ] Retry: `ssh root@187.124.173.69 "docker --version"`

---

## Phase 5: Final Verification (2 minutes)

**Run all these tests to confirm everything is working**:

### Test 1: SSH Connection
```bash
ssh root@187.124.173.69 "whoami"
```
- [ ] **Expected**: `root`
- [ ] **Status**: ✅ Pass or ❌ Fail

### Test 2: SSH Daemon Status
```bash
ssh root@187.124.173.69 "systemctl is-active ssh"
```
- [ ] **Expected**: `active`
- [ ] **Status**: ✅ Pass or ❌ Fail

### Test 3: Firewall Status
```bash
ssh root@187.124.173.69 "sudo ufw status | grep 22"
```
- [ ] **Expected**: Shows line with `22` (SSH allowed)
- [ ] **Status**: ✅ Pass or ❌ Fail

### Test 4: Docker Version
```bash
ssh root@187.124.173.69 "docker --version"
```
- [ ] **Expected**: `Docker version 20.10.x...`
- [ ] **Status**: ✅ Pass or ❌ Fail

### Test 5: Docker Running
```bash
ssh root@187.124.173.69 "docker ps"
```
- [ ] **Expected**: Shows list of containers (will be empty, that's OK)
- [ ] **Status**: ✅ Pass or ❌ Fail

### Final Status
- [ ] All 5 tests pass: **✅ VPS 2 READY FOR DEPLOYMENT**
- [ ] Any test fails: **❌ Debug with HOSTINGER_VNC_GUIDE.md troubleshooting section**

---

## If Something Goes Wrong

### SSH Still Times Out
- [ ] Go back to VNC console
- [ ] Check: `sudo systemctl status ssh` (should be active)
- [ ] Check: `sudo ufw status` (22 should be listed)
- [ ] Check: `cat ~/.ssh/authorized_keys` (provisioner key should be there)
- [ ] Last resort: Reboot VPS in hPanel and try again

### Docker Not Found
- [ ] Go to VNC console
- [ ] Run: `curl -fsSL https://get.docker.com -o get-docker.sh`
- [ ] Run: `sudo sh get-docker.sh`
- [ ] Wait 2 minutes
- [ ] Retry: `docker --version`

### Permission Denied (publickey)
- [ ] Wrong provisioner key
- [ ] Go to VNC console
- [ ] Run: `cat ~/.ssh/authorized_keys`
- [ ] Verify key matches: `ssh root@187.124.170.113 "cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub"`
- [ ] If different, remove old key and add correct one

### VNC Console Won't Connect
- [ ] Refresh hPanel page
- [ ] Click Console button again
- [ ] If still not working: Reboot VPS (Power → Reboot) and wait 2 minutes
- [ ] Try Console again

---

## Success! What's Next?

Once all tests pass:

1. **Notify Claude/You**: "VPS 2 SSH fix complete!"
2. **Next task**: Deploy first Clawdrop agent (happens tomorrow afternoon)
3. **Expected**: Agent will deploy successfully to VPS 2

---

## Quick Reference

| Component | Expected Status | Fix If Needed |
|-----------|-----------------|---------------|
| SSH Daemon | `active (running)` | `sudo systemctl start ssh` |
| Firewall | Port 22 allowed | `sudo ufw allow 22/tcp` |
| Provisioner Key | In authorized_keys | Paste key into file |
| Docker | Installed (v20.10+) | Run docker.sh script |
| SSH Access | Responds to commands | Check key permissions |

---

## Time Tracking

- [ ] Started at: ___:___ (time)
- [ ] Phase 1 done at: ___:___ (VNC connected)
- [ ] Phase 2 done at: ___:___ (SSH checked/fixed)
- [ ] Phase 3 done at: ___:___ (Key added)
- [ ] Phase 4 done at: ___:___ (SSH tested)
- [ ] Phase 5 done at: ___:___ (Final verification)
- [ ] **Total time**: ___:___ (should be ~25-30 min)

---

## Final Checklist Before Declaring Success

- [ ] All 5 verification tests pass
- [ ] Time: Less than 45 minutes (if longer, something is stuck)
- [ ] SSH connection stable (can run multiple commands)
- [ ] Docker accessible (shows version and can list containers)
- [ ] Provisioner key working (VPS 1 can theoretically deploy to VPS 2)

---

**Owner**: Kimi  
**Status**: Ready for tomorrow  
**Blocker For**: Agent deployment (necessary first step)  
**Next**: After SSH fix is confirmed, we deploy first agent

**Good luck! You got this! 🚀**
