# Clawdrop Sprint 2 — Competitive Build Kit
**Source:** Competitive analysis of Frames.ag, Bitte.ai, AgentArc, Project Plutus, Lit Protocol, Coinbase AgentKit  
**Date:** Apr 17 2026  
**Owner split:** Claude (code/MCP) | Kimi (infra/VPS/frontend)

---

## Strategic context

| Competitor | Key insight | What we steal |
|---|---|---|
| Frames.ag | Per-call micropayment marketplace | Credits system + tool billing |
| Bitte.ai | Agent registry + embeddable widget | list_agents + public registry + widget |
| Project Plutus | DexScreener free market data | Real-time Solana token tools |
| AgentArc | CEX integration for trading | Binance/Bybit balance + orders |
| Lit Protocol | MPC key management (enterprise moat) | Roadmap narrative for Enterprise tier |
| Coinbase AgentKit | EVM-only, no hosting | Our positioning: Solana-native, fully hosted |

---

## CLAUDE BUILDS (MCP / TypeScript / control-plane)

### C1 — DexScreener Tools 🟢 HIGHEST ROI
**Package:** `packages/bundles/research/src/tools/dexscreener.ts`  
Add 3 tools to the research bundle:

- **`get_token_info`** — `GET https://api.dexscreener.com/latest/dex/tokens/{address}` → price, volume 24h, liquidity, age, DEX, chain
- **`get_trending_tokens`** — `GET https://api.dexscreener.com/token-boosts/top/v1` → top boosted tokens with socials + links
- **`search_token`** — `GET https://api.dexscreener.com/latest/dex/search?q={query}` → search by name/symbol

All free, no auth. Wire into `handleResearchTool()` and register in `researchTools[]`.  
Also add to OpenClaw tool manifest in `packages/openclaw/src/index.ts`.

**Acceptance:** `curl https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112` returns SOL data ✅

---

### C2 — Per-Call Credits System 🟢 HIGH REVENUE
**Package:** `packages/control-plane/src/services/credits.ts` (new)  
**Package:** `packages/control-plane/src/server/tools.ts` (extend)

Credits are a USDC balance attached to each deployed agent. Premium tool calls deduct credits.

**New file `credits.ts`:**
```typescript
export interface CreditLedger {
  agent_id: string;
  balance_usdc: number;
  total_spent_usdc: number;
  transactions: CreditTransaction[];
}
export interface CreditTransaction {
  tool: string;
  cost_usdc: number;
  timestamp: string;
  tx_ref?: string;
}
export const TOOL_COSTS_USDC: Record<string, number> = {
  web_search: 0.001,        // $0.001 per search (DuckDuckGo free, Brave paid)
  book_flight: 0.50,        // $0.50 per booking (on top of booking fee)
  get_token_info: 0.000,    // free (DexScreener free tier)
  stake_sol: 0.010,         // $0.01 per stake action
};
export function getCredits(agent_id: string): CreditLedger
export function topUpCredits(agent_id: string, amount_usdc: number, tx_hash: string): void
export function deductCredit(agent_id: string, tool: string): { ok: boolean; balance: number; cost: number }
export function getCreditSummary(): { total_agents: number; total_usdc_held: number; total_usdc_spent: number }
```

**New MCP tools to add:**
- `top_up_credits` — user pays SOL→USDC swap → credits added to agent
- `get_credits` — returns balance + recent spend

**Acceptance:** `deductCredit('agent_x', 'web_search')` returns `{ ok: true, balance: 0.099, cost: 0.001 }`

---

### C3 — Agent Registry + list_agents Tool 🟢 KEY UX
**Package:** `packages/control-plane/src/server/tools.ts`  
**Package:** `packages/control-plane/src/db/memory.ts`

Two new MCP tools:

**`list_agents`** — list all agents owned by a wallet:
```typescript
// Input: { owner_wallet: string }
// Output: array of { agent_id, agent_name, tier_id, status, bundles, next_payment_due, warning? }
```

**`make_agent_public`** — mark an agent as publicly discoverable:
```typescript
// Input: { agent_id, owner_wallet, description, tags: string[] }
// Adds to public registry
```

**`browse_registry`** — discover public agent templates:
```typescript
// Input: { tag?: string, bundle?: string, limit?: number }
// Output: public agents with clone instructions
```

Add `is_public`, `public_description`, `tags` fields to `DeployedAgent` type in `memory.ts`.  
Add `listPublicAgents()` function to memory.ts.

---

### C4 — Persistence Hardening 🟡 PROD CRITICAL
**Package:** `packages/control-plane/src/db/memory.ts`

Current: writes JSON backup on change but doesn't reload on startup.

Fix `loadFromDisk()` — call it at module init:
```typescript
// At top of memory.ts:
const data = loadFromDisk(); // reads BACKUP_FILE if exists
const agentStore: Map<string, DeployedAgent> = new Map(Object.entries(data));
```

Verify the existing `writeFileSync` backup path, and ensure it reloads correctly on restart.  
**Acceptance:** deploy agent → kill process → restart → `list_agents` still shows the agent.

---

### C5 — Max Agents Enforcement 🟡 BILLING INTEGRITY
**Package:** `packages/control-plane/src/server/tools.ts` in `handleDeployAgent`

Before calling HFSP, check:
```typescript
const agentCount = listAgents(parsed.owner_wallet).filter(a => a.status === 'running').length;
const maxAgents = getMaxAgents(parsed.tier_id);
// But count across all tiers for this wallet
const walletAgents = listAgents(parsed.owner_wallet).filter(a => a.status === 'running').length;
if (walletAgents >= maxAgents) {
  throw new Error(`Max agents reached for ${parsed.tier_id} (${maxAgents} max). Upgrade tier or cancel an existing agent.`);
}
```

Wait — enforcement should be per tier_id per wallet. Explorer = 1 agent max. tier_a = 5 max.

---

## KIMI BUILDS (VPS / Docker / Frontend)

### K1 — HFSP Status Endpoint Auth Fix 🔴 URGENT
The GET `/api/v1/agents/:id` endpoint currently rejects `Authorization: Bearer <key>`.  
It must accept the same Bearer token as the POST `/api/v1/agents/deploy` endpoint.

Test:
```bash
curl http://187.124.170.113:3001/api/v1/agents/agent_confirm_001 \
  -H 'Authorization: Bearer test-dev-key-12345'
# Expected: {"agent_id":"...","status":"running","endpoint":"..."}
```

---

### K2 — OpenClaw Image to Docker Hub 🔴 NEEDED FOR SCALE
Build the OpenClaw image from `demo/v1` and push to Docker Hub so HFSP can pull it on any new container:

```bash
cd ~/clawdrop  # demo/v1 checked out
docker build -f packages/openclaw/Dockerfile -t lpsmurf/openclaw:latest .
docker login
docker push lpsmurf/openclaw:latest
```

HFSP deploy endpoint should use `lpsmurf/openclaw:latest` as the image name.

---

### K3 — Embeddable Chat Widget 🟡 DISTRIBUTION
A `<script>` tag that site owners embed to put their Clawdrop agent on their website.

**Simple implementation:**
```html
<!-- Drop anywhere on a page -->
<script src="https://clawdrop.xyz/widget.js" data-agent-id="agent_xxx"></script>
```

Widget renders a chat bubble (bottom-right), opens a chat window, forwards messages to the agent's Telegram bot or a new HTTP chat endpoint on HFSP.

**HFSP needs:** `POST /api/v1/agents/:id/chat` — takes `{ message: string }`, returns `{ reply: string }` by calling Claude via ANTHROPIC_API_KEY.

Host `widget.js` on KIMI VPS at port 80 or serve from HFSP itself.

---

### K4 — CEX Integration (Binance read-only) 🟡 TREASURY USE CASE
Add read-only Binance API to HFSP environment so treasury bundle can query it.

For now: read-only balance check only (no trading).

```bash
# On TENANT VPS, available as env in containers:
BINANCE_API_KEY=...
BINANCE_API_SECRET=...
```

Claude will add `get_cex_balance` tool to treasury bundle once this is available.

---

### K5 — Agent Logs to Structured JSON 🟡 DEBUGGING
The `GET /api/v1/agents/:id/logs` endpoint currently returns `{"logs":[]}`.  
Wire it to actual Docker container logs:

```bash
docker logs $agent_id --tail 50 --timestamps 2>&1 | \
  awk '{print "{\"timestamp\":\""$1"\",\"level\":\"info\",\"message\":\""substr($0,index($0,$2))"\"}"}' 
```

Return as structured array. Claude's `get_deployment_status` will display them.

---

### K6 — Spending Policy Enforcement in HFSP 🟡 ENTERPRISE
When deploying an agent, HFSP receives a `config.spending_policy` object:
```json
{
  "max_daily_usdc": 10.0,
  "allowed_tools": ["web_search", "search_flights"],
  "blocked_domains": []
}
```

Store per container. Claude's credits system will query this before deducting.  
This enables the enterprise "admin controls" pitch from Frames.ag.

---

## Timeline

| Day | Claude | Kimi |
|---|---|---|
| Today | C1 DexScreener, C3 list_agents, C4 persistence | K1 auth fix, K2 Docker Hub push |
| Tomorrow | C2 credits system, C5 max agents | K3 widget MVP, K5 logs |
| Day 3 | Wire credits + DexScreener into OpenClaw | K4 CEX env, K6 policies |
| Day 4 | Full integration test | Full integration test |

---

## How to pull latest code (Kimi)
```bash
cd ~/clawdrop
git fetch kimi
git checkout demo/v1
git pull kimi demo/v1
```

All Claude's code is already on `demo/v1`. Build OpenClaw from there.
