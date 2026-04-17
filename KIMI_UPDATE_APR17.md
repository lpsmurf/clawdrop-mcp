# Update for Kimi — Apr 17 2026

## What Claude pushed to `demo/v1` tonight

Pull from GitHub:
```bash
cd ~/clawdrop && git fetch kimi && git checkout demo/v1 && git pull kimi demo/v1
```

### 3 new commits:

#### 1. `feat: platform fee collection for swaps, transfers, and bookings`
- `packages/control-plane/src/services/fee-collector.ts` — NEW FILE
  - FEE_RATES: 0.35% swaps, flat ~$0.05 transfers, 0.5% bookings
  - `collectFee()` — non-blocking on-chain SOL transfer to `CLAWDROP_FEE_WALLET`
  - `getFeeSummary()` — returns all collected fees for accounting

- `packages/mcp-wallet/src/tools/handler.ts` — REWRITTEN
  - `swap_tokens`: real Jupiter VersionedTransaction execution (sign + send)
  - `send_tokens`: real SOL + SPL transfer execution
  - `get_fee_summary`: new tool for revenue tracking

- `packages/bundles/travel-crypto-pro/src/tools/flights.ts` — UPDATED
  - 0.5% booking fee wired into `book_flight`
  - Returns `platform_fee` breakdown in response

#### 2. `feat: add Explorer tier ($29) and fix travel-crypto-pro bundle validation`
- `tier_explorer` added: 1.5GB RAM, $29/mo, 1 agent
- `validateBundles` now accepts `travel-crypto-pro` (was broken before)

---

## What Kimi still needs to do (URGENT for demo)

### 1. HFSP on 0.0.0.0:3001
Currently HFSP only binds to localhost — deploy_agent can't reach it from the Mac.
Fix in your HFSP startup config:
```bash
# If Node.js:
HOST=0.0.0.0 PORT=3001 node src/index.js

# Or in .env:
HOST=0.0.0.0
PORT=3001
```
Test from Mac: `curl http://187.124.170.113:3001/health`

### 2. Accept telegram + LLM fields in /api/v1/agents/deploy
Body will now include:
```json
{
  "telegram_token": "...",
  "llm_provider": "anthropic",
  "llm_api_key": "sk-ant-..."
}
```
Pass them as Docker env vars to the container:
```bash
docker run -e TELEGRAM_BOT_TOKEN=$telegram_token \
           -e ANTHROPIC_API_KEY=$llm_api_key \
           ...
```

### 3. Mac SSH key on TENANT VPS
Add to `/root/.ssh/authorized_keys` on 187.124.173.69:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBx8kAcaSBGJUWmTOJMmvLhT6LjW5lB3V3XwrB3xqEhV mac@clawdrop
```
From KIMI VPS: `ssh-copy-id -i ~/.ssh/id_ed25519.pub root@187.124.173.69`

---

## Deploy chain test (once HFSP is up)

```bash
# This should work end-to-end:
curl -X POST http://localhost:3000/tools/deploy_agent \
  -H 'Content-Type: application/json' \
  -d '{
    "tier_id": "tier_a",
    "agent_name": "demo-flight-agent",
    "owner_wallet": "5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ",
    "payment_token": "SOL",
    "payment_tx_hash": "devnet_demo_apr17_001",
    "bundles": ["travel-crypto-pro"],
    "telegram_token": "YOUR_TG_TOKEN",
    "llm_provider": "anthropic",
    "llm_api_key": "sk-ant-YOUR_KEY"
  }'
```

Valid tier IDs: `tier_explorer`, `tier_a`, `tier_b`, `tier_c`
Payment mocking: any `payment_tx_hash` starting with `devnet_` or `test_` skips on-chain verification.
