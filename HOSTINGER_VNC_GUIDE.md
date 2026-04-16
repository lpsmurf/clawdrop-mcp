# Hostinger VNC Console Access Guide

**Date**: April 16, 2026  
**Purpose**: Step-by-step guide to access VPS 2 via Hostinger VNC console  
**VPS**: 187.124.173.69 (root user)  
**Time**: ~10 minutes to complete

---

## Prerequisites

- ✅ Hostinger hPanel login credentials (you should have these)
- ✅ VPS 2 root password (if needed for VNC)
- ✅ Internet connection
- ✅ Web browser (Chrome, Firefox, Safari)

---

## Step 1: Navigate to Hostinger hPanel

**URL**: https://hpanel.hostinger.com/

**Steps**:
1. Open browser and go to https://hpanel.hostinger.com/
2. Log in with your Hostinger account credentials
3. You should see your dashboard with hosting products listed

**Screenshot location**: Top right shows your account name

---

## Step 2: Access VPS Management

**Location**: Left sidebar menu

**Steps**:
1. In left sidebar, click **"Hosting"** or **"Products"**
2. Look for **"VPS"** section
3. You should see list of VPS instances
4. Find **"VPS 2"** or **"187.124.173.69"**

**Expected to see**:
```
VPS 2
Status: Active (green indicator)
IP: 187.124.173.69
Plan: [whatever plan you have]
```

---

## Step 3: Open VPS Console (VNC)

**Location**: VPS 2 management panel

**Steps**:
1. Click on **"VPS 2"** to open management panel
2. Look for buttons at the top/right of the panel
3. Find button labeled **"Console"** or **"VNC Console"** or **"Remote Console"**
4. Click it to open VNC window

**Alternative locations** (if not obvious):
- Click **"..."** (more options) menu
- Look under **"Tools"** or **"Management"** section
- Check **"Power"** menu (might have console option)

**What opens**: 
- New window/tab with VNC console
- Might show Hostinger logo while loading
- Then shows black terminal/desktop interface

---

## Step 4: Log In to VNC Console

**VNC Login Screen**:
```
Hostinger VNC Console
VPS: 187.124.173.69

Username: [_______]
Password: [_______]
[Login Button]
```

**Credentials**:
- **Username**: `root`
- **Password**: Your VPS root password
  - Check Hostinger email for "VPS Installation Complete"
  - Or check hPanel VPS settings page
  - Or use password reset in hPanel if forgotten

**Steps**:
1. Type `root` in Username field
2. Type root password in Password field
3. Click **"Login"** button
4. Wait 2-3 seconds for connection

**Expected after login**:
```
root@vps2:~#
```

(A command prompt, ready for input)

---

## Step 5: Verify You're Connected

**Test command**:
```bash
whoami
```

**Expected output**:
```
root
```

**Other info commands**:
```bash
hostname                # Should show: vps2 or similar
ip addr show            # Shows IP addresses
uname -a                # Shows OS info
```

---

## Step 6: Basic VNC Console Tips

### Typing
- Type commands normally
- Use Backspace to correct typos
- Press Enter to execute

### Copying/Pasting
- **Copy from browser**: Ctrl+C (normal copy)
- **Paste into console**: Right-click and "Paste" OR Ctrl+V (if supported)
- **If paste doesn't work**: Type commands manually

### Navigation
- Use arrow keys to scroll through command history
- Press Tab for command auto-completion
- Ctrl+C to cancel running command
- Ctrl+D or type `exit` to log out

### If Console Freezes
- Click somewhere in console to regain focus
- Try typing a command
- If completely frozen: Close tab and reconnect

---

## Step 7: Run VPS 2 Diagnostic Commands

**Once logged in, run these to check VPS status**:

### 1. Check SSH Daemon Status
```bash
sudo systemctl status ssh
```

**Expected output (if running)**:
```
● ssh.service - OpenSSH server
     Loaded: loaded (/lib/systemd/system/ssh.service; enabled; ...)
     Active: active (running) since...
```

**If NOT running** (shows "inactive"):
```bash
sudo systemctl start ssh
sudo systemctl enable ssh
```

### 2. Check Firewall Status
```bash
sudo ufw status
```

**Expected output (if enabled)**:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere
...
```

**If SSH (port 22) NOT in list** (shows "DENY" or missing):
```bash
sudo ufw allow 22/tcp
sudo ufw allow 22/udp
sudo ufw reload
```

### 3. Verify SSH is Listening
```bash
sudo ss -tlnp | grep :22
```

**Expected output**:
```
tcp   LISTEN 0  128  0.0.0.0:22    0.0.0.0:*  users:(("sshd",pid=1234,...
```

### 4. Check Docker Installation
```bash
docker --version
```

**Expected output**:
```
Docker version 20.10.x, build xxxxx
```

**If Docker not installed**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

## Step 8: Add Provisioner Key (Critical)

**This allows VPS 1 to deploy agents to VPS 2**

### Get the Provisioner Public Key

**From your control plane / VPS 1**:
```bash
# SSH into VPS 1 (from your Mac):
ssh root@187.124.170.113

# Show the provisioner public key:
cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub
```

**You'll see output like**:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN4xj5kL2m9pQrStUvWxYz... provisioner@vps1
```

**Copy this entire line**

### Add to VPS 2 (via VNC Console)

**Steps**:

1. **Create .ssh directory** (if it doesn't exist):
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

2. **Add provisioner key to authorized_keys**:
```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN4xj5kL2m9pQrStUvWxYz... provisioner@vps1" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Replace** `ssh-ed25519 AAAAC3...` with the actual key from Step 1

3. **Verify it was added**:
```bash
cat ~/.ssh/authorized_keys
```

You should see the line you just pasted

---

## Step 9: Test SSH Access from Your Mac

**Close VNC console and test from your Mac**:

```bash
# Test SSH connectivity
ssh -v root@187.124.173.69 "echo SSH OK"
```

**Expected output**:
```
...
debug1: Authentication succeeded...
SSH OK
Connection to 187.124.173.69 closed.
```

**If it hangs**: SSH is still not working, check:
- Is SSH daemon running? (Verify in VNC)
- Is firewall allowing port 22? (Verify with `ufw status`)
- Is provisioner key correct? (Verify with `cat ~/.ssh/authorized_keys`)

---

## Step 10: Test Docker Access from Your Mac

```bash
# Test Docker is running
ssh root@187.124.173.69 "docker --version"

# Expected output:
# Docker version 20.10.x, build xxxxx

# Test Docker can pull images:
ssh root@187.124.173.69 "docker pull ghcr.io/clawdrop/openclaw:latest"

# Expected: Pulls the image successfully
```

---

## Troubleshooting

### Problem: "Connection refused" or "Connection timed out"

**Cause**: SSH daemon not running or firewall blocking

**Solution**:
1. Go back to VNC console
2. Run: `sudo systemctl status ssh`
3. If inactive: `sudo systemctl start ssh`
4. Run: `sudo ufw status`
5. If SSH not listed: `sudo ufw allow 22/tcp`

### Problem: "Permission denied (publickey)"

**Cause**: Wrong provisioner key or key not added correctly

**Solution**:
1. In VNC console, verify key: `cat ~/.ssh/authorized_keys`
2. Compare with key on VPS 1: `cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub`
3. If different, remove wrong key and re-add correct one
4. Make sure permissions are correct: `chmod 600 ~/.ssh/authorized_keys`

### Problem: VNC Console Won't Connect

**Solution**:
1. Refresh the hPanel page
2. Click Console button again
3. If still not working, try Power → Reboot in hPanel
4. Wait 2 minutes for reboot
5. Try Console again

### Problem: Typing is Very Slow in VNC

**Solution**:
1. VNC connection might be slow
2. Try closing and reopening console
3. Use keyboard shortcuts instead of mouse
4. Check internet connection speed

---

## Quick Checklist for VNC Session

**Follow this checklist in order**:

- [ ] Open https://hpanel.hostinger.com/
- [ ] Log in with Hostinger credentials
- [ ] Go to Hosting → VPS
- [ ] Click on VPS 2 (187.124.173.69)
- [ ] Click Console/VNC button
- [ ] Log in with username `root` and root password
- [ ] Run: `whoami` (should show `root`)
- [ ] Run: `sudo systemctl status ssh` (check if running)
- [ ] If not running: `sudo systemctl start ssh`
- [ ] Run: `sudo ufw status` (check firewall)
- [ ] If SSH not listed: `sudo ufw allow 22/tcp`
- [ ] Run: `mkdir -p ~/.ssh && chmod 700 ~/.ssh`
- [ ] Paste provisioner key into `authorized_keys` file
- [ ] Run: `cat ~/.ssh/authorized_keys` (verify key is there)
- [ ] Close VNC console
- [ ] From Mac, run: `ssh -v root@187.124.173.69 "echo SSH OK"`
- [ ] Verify "SSH OK" output
- [ ] Test Docker: `ssh root@187.124.173.69 "docker --version"`

---

## Time Estimate

- 5 min: Navigate to hPanel and find VPS 2
- 3 min: Open VNC console and log in
- 10 min: Check SSH/firewall and fix if needed
- 5 min: Add provisioner key
- 2 min: Test SSH from Mac
- 2 min: Test Docker

**Total: ~25-30 minutes**

---

## Success Criteria

✅ **All of these should work**:
```bash
# 1. VNC console opens and shows prompt
ssh root@187.124.173.69 "whoami"           # Returns: root

# 2. SSH daemon is running
ssh root@187.124.173.69 "systemctl is-active ssh"  # Returns: active

# 3. Firewall allows SSH
ssh root@187.124.173.69 "sudo ufw status | grep 22"  # Shows: 22 allowed

# 4. Docker works
ssh root@187.124.173.69 "docker --version"  # Returns: Docker version...

# 5. Provisioner can deploy
ssh root@187.124.173.69 "docker ps"        # Lists containers (empty is OK)
```

If all 5 return successfully, **VPS 2 is ready for deployment** ✅

---

**Status**: Ready to execute tomorrow  
**Owner**: Kimi  
**Next Step**: Follow KIMI_SSH_FIX_CHECKLIST.md tomorrow morning
