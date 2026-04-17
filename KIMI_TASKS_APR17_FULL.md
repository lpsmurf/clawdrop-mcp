# Kimi Task Package — Apr 17 2026
**From Claude** | Pull from `demo/v1` branch first: `git fetch kimi && git checkout demo/v1 && git pull kimi demo/v1`

---

## TASK 1 — HFSP on 0.0.0.0:3001 ⛔ BLOCKS EVERYTHING

**This is the #1 blocker. Nothing else in the demo works until this is done.**

Claude calls `http://187.124.170.113:3001/api/v1/agents/deploy`. Currently HFSP binds to localhost only, so the call times out.

**Fix:**
```bash
# In HFSP .env or startup config:
HOST=0.0.0.0
PORT=3001

# Or pass at launch:
HOST=0.0.0.0 PORT=3001 node src/index.js
```

**Verify from Claude's Mac:**
```bash
curl http://187.124.170.113:3001/health
# Expected: {"status":"ok"} or similar
```

---

## TASK 2 — HFSP API endpoints Claude is calling

Claude's control-plane calls these exact HFSP endpoints. Kimi needs to implement/confirm all of them:

### POST /api/v1/agents/deploy
**Request body:**
```json
{
  "deployment_id": "agent_1776384417079_kxqohj",
  "tier_id": "tier_a",
  "region": "eu-west",
  "capability_bundle": "travel-crypto-pro",
  "payment_verified": true,
  "wallet_address": "5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ",
  "telegram_token": "123456:ABCdef...",
  "llm_provider": "anthropic",
  "llm_api_key": "sk-ant-...",
  "config": {}
}
```
**Expected response:**
```json
{
  "agent_id": "agent_1776384417079_kxqohj",
  "endpoint": "http://187.124.173.69:PORT",
  "status": "running",
  "error": null
}
```
**What HFSP should do:** run the OpenClaw Docker image (see Task 3) with env vars injected:
```bash
docker run -d \
  --name $deployment_id \
  -e WALLET_PRIVATE_KEY="" \
  -e DUFFEL_API_TOKEN="$DUFFEL_API_TOKEN" \
  -e TELEGRAM_BOT_TOKEN="$telegram_token" \
  -e ANTHROPIC_API_KEY="$llm_api_key" \
  -e HELIUS_API_KEY="$HELIUS_API_KEY" \
  --memory=1.5g --cpus=0.5 \
  clawdrop/openclaw:latest
```

### GET /api/v1/agents/:agent_id
**Expected response:**
```json
{
  "agent_id": "agent_...",
  "status": "running",
  "endpoint": "http://...",
  "uptime_seconds": 3600
}
```

### GET /api/v1/agents/:agent_id/logs
**Expected response:**
```json
{
  "logs": [
    {"timestamp": "2026-04-17T01:00:00Z", "level": "info", "message": "Agent started"},
    ...
  ]
}
```
Implementation: `docker logs $agent_id --tail 50 --timestamps`

### POST /api/v1/agents/:agent_id/stop
**Expected response:** `{ "stopped": true }`
Implementation: `docker stop $agent_id && docker rm $agent_id`

---

## TASK 3 — Build & push OpenClaw Docker image

Claude wrote the Dockerfile at `packages/openclaw/Dockerfile`. Kimi builds it and pushes to a registry.

```bash
cd ~/clawdrop  # wherever demo/v1 is checked out

# Build from repo root (Dockerfile uses COPY packages/... paths)
docker build -f packages/openclaw/Dockerfile -t clawdrop/openclaw:latest .

# Option A: push to Docker Hub
docker tag clawdrop/openclaw:latest lpsmurf/openclaw:latest
docker push lpsmurf/openclaw:latest

# Option B: use local image (simpler for now — no push needed)
# Just build on KIMI VPS and reference by name in docker run
```

**Test the image runs:**
```bash
docker run --rm \
  -e DUFFEL_API_TOKEN="test" \
  -e HELIUS_API_KEY="test" \
  clawdrop/openclaw:latest &
sleep 2
# Should print: "clawdrop-openclaw MCP running (stdio)"
kill %1
```

---

## TASK 4 — Telegram bot in deployed agents

The OpenClaw image accepts `TELEGRAM_BOT_TOKEN` but doesn't yet poll Telegram. Kimi adds a `bot.ts` module that runs alongside the MCP server.

**Create `packages/openclaw/src/bot.ts`:**

```typescript
/**
 * Telegram bot polling for deployed OpenClaw agents.
 * Reads TELEGRAM_BOT_TOKEN. If not set, silently skips.
 * Routes user messages to Claude via Anthropic API (ANTHROPIC_API_KEY).
 */
import axios from 'axios';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!TOKEN) {
  console.error('[bot] TELEGRAM_BOT_TOKEN not set — Telegram disabled');
  process.exit(0);
}

let lastUpdateId = 0;

async function getUpdates() {
  const res = await axios.get(
    `https://api.telegram.org/bot${TOKEN}/getUpdates`,
    { params: { offset: lastUpdateId + 1, timeout: 30 }, timeout: 35000 }
  );
  return res.data.result as any[];
}

async function sendMessage(chatId: number, text: string) {
  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  });
}

async function askClaude(userMessage: string): Promise<string> {
  if (!ANTHROPIC_KEY) return 'LLM key not configured.';
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: 'You are a Clawdrop AI agent. You can help with Solana transactions, flight search and booking, and web research. Be concise and helpful.',
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  return res.data.content[0].text;
}

async function poll() {
  while (true) {
    try {
      const updates = await getUpdates();
      for (const update of updates) {
        lastUpdateId = update.update_id;
        const msg = update.message;
        if (!msg?.text) continue;
        console.error(`[bot] Message from ${msg.from.username}: ${msg.text}`);
        const reply = await askClaude(msg.text);
        await sendMessage(msg.chat.id, reply);
      }
    } catch (err: any) {
      console.error('[bot] Poll error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll();
```

**Update `packages/openclaw/src/index.ts`** — add at the bottom before `server.connect()`:
```typescript
// Start Telegram bot in background if token is set
if (process.env.TELEGRAM_BOT_TOKEN) {
  import('./bot.js').catch(err => 
    console.error('[openclaw] Telegram bot failed to start:', err.message)
  );
}
```

---

## TASK 5 — TENANT VPS SSH access from Mac

Claude needs to SSH into TENANT VPS (187.124.173.69) to verify Docker containers are running.

**From KIMI VPS, run once:**
```bash
# Add Mac public key to TENANT VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@187.124.173.69

# Or manually:
ssh root@187.124.173.69 "echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBx8kAcaSBGJUWmTOJMmvLhT6LjW5lB3V3XwrB3xqEhV mac@clawdrop' >> ~/.ssh/authorized_keys"
```

**Verify from Mac:**
```bash
ssh root@187.124.173.69 "docker ps"
# Should list running containers
```

---

## TASK 6 — Grace period Telegram notification

When subscription enforcer (runs hourly on Claude's side) puts an agent in grace period, it would be great if the agent's Telegram bot sends a warning to the owner.

Add a webhook endpoint to HFSP:

### POST /api/v1/agents/:agent_id/notify
**Request body:**
```json
{
  "type": "grace_period",
  "message": "⚠️ Your Clawdrop agent expires in 36 hours. Pay to renew.",
  "chat_id": "optional — if not set, use last known chat_id"
}
```

Claude's subscription enforcer will call this when it sets `grace_period_end`.
HFSP should forward the message via the container's TELEGRAM_BOT_TOKEN.

---

## Priority order

1. ✅ Task 1 — HFSP on 0.0.0.0 (BLOCKS DEMO)
2. ✅ Task 2 — HFSP API endpoints
3. ✅ Task 3 — Build OpenClaw Docker image
4. Task 4 — Telegram bot
5. Task 5 — TENANT VPS SSH
6. Task 6 — Grace period notification

---

## How to check Claude's code

All code is on GitHub `demo/v1` branch:
```bash
git fetch kimi && git checkout demo/v1 && git pull kimi demo/v1

# Key files:
packages/openclaw/           ← Docker image to build
packages/openclaw/Dockerfile ← Build instructions
packages/bundles/research/   ← Research bundle (already built)
packages/control-plane/src/integrations/hfsp.ts  ← What Claude calls
KIMI_UPDATE_APR17.md         ← Previous update
```
