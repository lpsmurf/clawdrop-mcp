# Parallel Work Plan — Kimi + Claude
**Week of Apr 16–22, 2026**  
**Goal**: First paying customer can deploy an agent end-to-end

---

## 👥 Role Split

| Who | Lives On | Owns |
|-----|----------|------|
| **Kimi** | KIMI VPS (187.124.170.113) | Infrastructure, Docker, HFSP API, VPS ops |
| **Claude** | Mac / codebase | MCP tools, Duffel, payment flow, code, docs |

> **Rule**: Kimi never touches the codebase. Claude never SSHes into VPS to fix things.  
> Communication happens through this plan + GitHub commits.

---

## 📅 Day-by-Day

---

### Thursday Apr 17

**Kimi** 🔧
- [ ] Confirm wallet address used for HFSP testing: `8JZnaCTFctkXUxvXSBbXFkbfVr3RX7ethM2zU4miT9eZ`
- [ ] Expose HFSP API publicly (change `127.0.0.1:3001` → `0.0.0.0:3001` + add API key auth)
- [ ] Test HFSP deploy endpoint is reachable: `curl http://187.124.170.113:3001/health`
- [ ] Confirm TENANT VPS container auto-cleanup working (check logs every 6h)

**Claude** 💻
- [ ] Update MCP `tools.ts` to call HFSP at `http://187.124.170.113:3001` (not localhost)
- [ ] Add `travel-crypto-pro` bundle to HFSP tier definitions
- [ ] Write devnet payment mock for testing deploy_agent without real tx
- [ ] Push to GitHub

---

### Friday Apr 18

**Kimi** 🔧
- [ ] Confirm HFSP API is publicly accessible with API key
- [ ] Deploy `live-test-limits-003` via HFSP and share container logs
- [ ] Verify Duffel env var reaches the container (`docker exec ... env | grep DUFFEL`)
- [ ] Test 3 concurrent containers on TENANT VPS → report memory usage

**Claude** 💻
- [ ] Wire Clawdrop MCP `deploy_agent` → HFSP API (real HTTP call, not mock)
- [ ] Test `deploy_agent` MCP tool end-to-end with devnet wallet
- [ ] Test `get_deployment_status` returns live container info
- [ ] Update VPS_HOSTS.md — TENANT is KVM 4 (16GB/4vCPU), not KVM 2

---

### Saturday Apr 19

**Kimi** 🔧
- [ ] Full load test: deploy 5 containers simultaneously
- [ ] Record memory + CPU per container (report: MiB used / 1.5GiB)
- [ ] Confirm cleanup job removes stopped containers after 24h
- [ ] Test SSH key isolation: each tenant key only reaches their container

**Claude** 💻
- [ ] Test Duffel flight search through MCP tool end-to-end
- [ ] Test `search_flights` LAX→JFK returns results in <5s
- [ ] Fix any MCP tool validation errors found
- [ ] Write Phase 2 Week 2 plan

---

### Sunday Apr 20 — Integration Day

**Kimi** 🔧
- [ ] Run full booking flow from KIMI VPS: search → price → mock book
- [ ] Confirm agent container receives booking confirmation
- [ ] Run 24h stability test (1 container, report any crashes)

**Claude** 💻
- [ ] Run full booking flow through MCP: search → price → book
- [ ] Test `cancel_subscription` removes container from TENANT VPS
- [ ] Test error handling: expired offer, payment fail, timeout
- [ ] Update deployment guide with real results

---

### Monday Apr 21 — First Real Deployment

**Together**
- [ ] Deploy first real agent with devnet payment tx
- [ ] User acceptance test: owner books a flight through the agent
- [ ] Document issues found
- [ ] Confirm Phase 2 Week 1 criteria met ✅

---

## 📬 Communication Protocol

- **Kimi → Us**: Post status in chat with table format
- **Us → Kimi**: Post exact commands to run (copy-paste ready)
- **Blockers**: Tag with 🔴 and resolve same day
- **GitHub**: Kimi pushes infra commits to `kimi/main`, Claude pushes to `main`

---

## 🎯 Success Criteria (by Apr 21)

| Metric | Owner | Target |
|--------|-------|--------|
| HFSP API publicly reachable | Kimi | `curl http://187.124.170.113:3001/health` returns 200 |
| MCP deploy_agent works | Claude | Returns container ID via Clawdrop MCP |
| Flight search works | Claude | 50+ results in <5s |
| 5 concurrent agents | Kimi | All running, no resource exhaustion |
| End-to-end booking | Both | Search → Price → Book → Confirmation |
| Container cleanup | Kimi | Inactive containers removed after 24h |

---

## 🔴 Current Blockers

| Blocker | Owner | Fix |
|---------|-------|-----|
| HFSP API is localhost-only | **Kimi** | Change to `0.0.0.0:3001` + API key |
| `deploy_agent` MCP not wired to HFSP | **Claude** | Update tools.ts today |
| `travel-crypto-pro` missing from tiers | **Claude** | Add to HFSP tier config |
| Devnet wallet for MCP testing | ✅ Done | `5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ` |
| Kimi's wallet for HFSP | Confirm | `8JZnaCTFctkXUxvXSBbXFkbfVr3RX7ethM2zU4miT9eZ` |

---

## 🗂️ Wallets Reference

| Wallet | Owner | Network | Address |
|--------|-------|---------|---------|
| HFSP testing wallet | Kimi | Devnet | `8JZnaCTFctkXUxvXSBbXFkbfVr3RX7ethM2zU4miT9eZ` |
| MCP testing wallet | Claude/You | Devnet | `5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ` |

---

**Owner**: Both  
**Created**: 2026-04-16  
**Next sync**: Apr 17 morning
