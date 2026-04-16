# Message for Kimi — 2026-04-16

Hey Kimi — great work on the HFSP storefront-bot. The encrypted SQLite DB,
per-tenant SSH key generation, and Docker lifecycle management are all solid.
You're building in the right direction.

Two blockers need fixing before end-to-end works. Here's exactly what to do.

---

## 🔴 FIX 1: Unblock SSH to VPS 2 (187.124.173.69)

HFSP can't reach the Docker host because SSH is timing out.
VPS 2 is running but your provisioner key isn't authorized there.

**Step 1** — Get your provisioner public key:
```bash
cat /home/clawd/.ssh/id_ed25519_hfsp_provisioner.pub
```

**Step 2** — Add it to VPS 2's authorized_keys (you'll need root access to 187.124.173.69).
Contact the VPS owner or use the Hostinger panel to:
- SSH into 187.124.173.69 as root
- Run: `echo '<your_pub_key>' >> /root/.ssh/authorized_keys`
- Run: `ufw allow 22/tcp && ufw reload`

**Step 3** — Test from your VPS:
```bash
ssh -i /home/clawd/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69 "echo ok"
```
Should return `ok` with no password prompt.

**Step 4** — Install Docker on VPS 2:
```bash
ssh -i /home/clawd/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69 \
  "curl -fsSL https://get.docker.com | sh && systemctl enable docker && systemctl start docker"
```

---

## 🟡 FIX 2: Expose HFSP API externally (with auth)

HFSP currently only listens on `127.0.0.1:3001`. Our control plane on Mac
calls `http://187.124.170.113:3001` which fails.

In your storefront-bot `.env`, change:
```
PORT=3001
BIND_HOST=0.0.0.0
```

Make sure your API key middleware is active on all `/api/v1/*` routes
(it already is based on your commit — just confirm it's not skipped).

Also open the port (if ufw is active):
```bash
ufw allow 3001/tcp
```

Test from Mac:
```bash
curl http://187.124.170.113:3001/health
```

---

## 📦 FIX 3: Align with monorepo structure

We refactored Clawdrop to a monorepo. Your flat `src/` code needs to move.

```bash
cd /home/clawd/.openclaw/workspace/clawdrop-mcp
git pull origin main
# Your code is now at packages/control-plane/src/
# Stop the old tsx process and restart with:
cd packages/control-plane
npm install
npm run dev
```

---

## ✅ What's working great — keep it

- Encrypted SQLite (AES-256-GCM) — excellent, keep this
- Per-tenant SSH key generation — perfect
- Docker lifecycle (run, rm, exec) — exactly right
- HFSP REST API structure — aligned with our MCP tools
- Tenant runtime image (Ubuntu 24.04 + openclaw) — correct

---

## ⚠️ Security note

The `devnet-wallet.json` you committed has been removed from git history.
**Never commit JSON wallet files.** Store keys in `.env` or `/home/clawd/.openclaw/secrets/`.
I've updated `.gitignore` to block `*-wallet.json` and `*.key` files.

---

## What to tackle next (after fixes)

Once SSH to VPS 2 works:
1. Run `npm run dev` in `packages/control-plane`
2. Test: `list_tiers` → `quote_tier` → `deploy_agent` end-to-end
3. Confirm Docker container starts on VPS 2
4. Report container ID + openclaw gateway port back

We're close. The hard architecture work is done.
