# Kimi's Tasks for Thursday Apr 17

## 🎯 Single Critical Blocker

Your one task today: **Make HFSP API publicly accessible**

Currently: HFSP listens on `127.0.0.1:3001` (localhost only)  
Needed: Listen on `0.0.0.0:3001` (publicly accessible)

---

## Step-by-Step on KIMI VPS

### 1. Find HFSP config
```bash
cd /home/clawd/hfsp-agent-provisioning
find . -name "*.ts" -o -name "*.js" | xargs grep -l "3001" | head -3
```
Look for where the server listens. Likely in `src/index.ts` or `src/server.ts`

### 2. Change listen address
Find this line:
```typescript
app.listen(3001, '127.0.0.1')  // or similar
```

Change to:
```typescript
app.listen(3001, '0.0.0.0')
```

Or if using env var:
```bash
export HFSP_HOST=0.0.0.0
```

### 3. Set API key (security)
```bash
export HFSP_API_KEY=$(openssl rand -hex 32)
echo $HFSP_API_KEY  # Save this value
```

### 4. Restart HFSP
```bash
# Stop current process
pkill -f "tsx.*hfsp" || pkill -f "node.*hfsp"

# Restart with new config
cd /home/clawd/hfsp-agent-provisioning
npm run start
# or
tsx src/index.ts
```

---

## Verification (from KIMI VPS)

```bash
# Should return 200 OK
curl http://0.0.0.0:3001/health

# From localhost should still work
curl http://127.0.0.1:3001/health

# From TENANT VPS should now work
ssh -i /home/clawd/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69 \
  "curl http://187.124.170.113:3001/health"
```

---

## Secondary Tasks (if time permits)

- [ ] Confirm wallet: `8JZnaCTFctkXUxvXSBbXFkbfVr3RX7ethM2zU4miT9eZ` (confirm it's correct)
- [ ] Verify TENANT VPS auto-cleanup job is still running (check logs)
- [ ] Confirm Docker can be accessed: `ssh root@187.124.173.69 "docker ps"`

---

## What Happens Next (Friday)

Once HFSP is public:
1. Claude will test deploy_agent MCP with a mock Solana payment
2. This will trigger HFSP to deploy a container on TENANT VPS
3. We'll verify the container is running
4. We'll test the travel booking flow

**You don't need to do anything else** until Friday when we test 3 concurrent containers.

---

## Questions?

- HFSP not starting? Check: `npm install` and `npm run build`
- API key error? Check env var is set: `echo $HFSP_API_KEY`
- Port already in use? Check: `lsof -i :3001` and kill if needed

**Report back when**: HFSP is listening on `0.0.0.0:3001` and the health check passes from TENANT VPS.

---

**Time estimate**: 15 minutes  
**Status**: Ready to start
