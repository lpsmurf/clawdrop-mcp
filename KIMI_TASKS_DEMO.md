# Kimi — Demo Tasks (URGENT — Needed Tomorrow)

## 🎯 What We're Building

User pastes ONE line in Claude Code → Claude guides setup → Agent deploys with Telegram + LLM.

**Your job**: Make HFSP accept and pass `telegram_token` + `llm_api_key` to Docker containers.

---

## 🔴 Task 1: Make HFSP Public (Already Requested)

```bash
# In your HFSP server code, change:
app.listen(3001, '127.0.0.1', ...)
# To:
app.listen(3001, '0.0.0.0', ...)
```

Then restart HFSP.

---

## 🔴 Task 2: Accept New Fields in Deploy Endpoint

Our MCP now sends these new fields in the deploy request body:

```json
{
  "deployment_id": "agent_xxx",
  "tier_id": "tier_a",
  "wallet_address": "...",
  "telegram_token": "1234567890:ABCdef...",
  "llm_provider": "anthropic",
  "llm_api_key": "sk-ant-...",
  "capability_bundle": "travel-crypto-pro",
  "payment_verified": true
}
```

In your `POST /api/v1/agents/deploy` handler, extract these fields and pass to Docker:

```javascript
const {
  deployment_id,
  tier_id,
  wallet_address,
  telegram_token,    // NEW
  llm_provider,      // NEW
  llm_api_key,       // NEW
  capability_bundle,
} = req.body;
```

---

## 🔴 Task 3: Pass Secrets to Docker Container

When running `docker run`, add env vars based on `llm_provider`:

```bash
docker run -d \
  --name hfsp_${deployment_id} \
  --memory=1.5g \
  --cpus=0.5 \
  --pids-limit=100 \
  -e AGENT_ID="${deployment_id}" \
  -e OWNER_WALLET="${wallet_address}" \
  -e TELEGRAM_BOT_TOKEN="${telegram_token}" \
  -e ANTHROPIC_API_KEY="${llm_provider === 'anthropic' ? llm_api_key : ''}" \
  -e OPENAI_API_KEY="${llm_provider === 'openai' ? llm_api_key : ''}" \
  -e OPENROUTER_API_KEY="${llm_provider === 'openrouter' ? llm_api_key : ''}" \
  -e LLM_PROVIDER="${llm_provider}" \
  ghcr.io/clawdrop/openclaw:latest
```

**Handle missing fields gracefully** — `telegram_token` and `llm_api_key` may be empty strings if user skipped them.

---

## ✅ Verification

After deploying a test container:

```bash
# Check env vars made it into container
ssh -i /home/clawd/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69 \
  "docker exec hfsp_test-agent-001 env | grep -E 'TELEGRAM|ANTHROPIC|OPENAI|LLM'"
```

Expected output:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic
```

---

## 📋 Summary of Your Tasks

| Task | Time | Status |
|------|------|--------|
| 1. Make HFSP public (0.0.0.0:3001) | 15 min | ⏳ Pending |
| 2. Accept telegram_token + llm_api_key in deploy endpoint | 20 min | ⏳ Pending |
| 3. Pass secrets as Docker env vars | 20 min | ⏳ Pending |
| 4. Test: verify env vars in container | 5 min | ⏳ Pending |

**Total: ~1 hour**

---

## 📣 Report Back When

```bash
# Run this and paste the output:
curl http://187.124.170.113:3001/health

# And this:
ssh -i /home/clawd/.ssh/id_ed25519_hfsp_provisioner root@187.124.173.69 \
  "docker exec <container_id> env | grep -E 'TELEGRAM|LLM|ANTHROPIC'"
```

---

**Deadline**: Tonight — demo is tomorrow
**Files for reference**: See DEMO_ONE_LINER.md for full context
