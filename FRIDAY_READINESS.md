# Friday Apr 18 — Ready to Test Deploy Chain

## 🎯 Objective

Once Kimi confirms HFSP API is publicly accessible (`0.0.0.0:3001`), execute full deployment chain:

**User Payment TX** → **deploy_agent MCP** → **HFSP API** → **TENANT VPS Docker** → **Agent Running** ✅

---

## 📋 Pre-Test Checklist

Verify before starting (all should be ✅):

```bash
# 1. Check HFSP is listening publicly
curl http://187.124.170.113:3001/health

# 2. Check TENANT VPS is accessible
ssh -i ~/.ssh/id_ed25519_187_124_173_69 root@187.124.173.69 "docker ps"

# 3. Check Duffel token is set
echo $DUFFEL_API_TOKEN

# 4. Verify devnet wallet has SOL (or use mock)
solana balance 5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ --url devnet
```

---

## 🧪 Test Sequence

### Test 1: deploy_agent with Mock Payment (10 min)

**Setup**:
```bash
export TIER_ID="tier_a"
export AGENT_NAME="test-phase2-001"
export OWNER_WALLET="5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ"
export PAYMENT_TX="devnet_test_friday_001"
```

**Execute**:
```bash
curl -X POST http://localhost:3000/api/tools/deploy_agent \
  -H 'Content-Type: application/json' \
  -d "{
    \"tier_id\": \"$TIER_ID\",
    \"agent_name\": \"$AGENT_NAME\",
    \"owner_wallet\": \"$OWNER_WALLET\",
    \"payment_token\": \"SOL\",
    \"payment_tx_hash\": \"$PAYMENT_TX\",
    \"bundles\": [\"travel-crypto-pro\"]
  }"
```

**Expected Response**:
```json
{
  "agent_id": "agent_...",
  "status": "provisioning",
  "endpoint": "...",
  "container_id": "..."
}
```

**Success Criteria**:
- ✅ Returns 200 OK
- ✅ Payment verification passes (using devnet_ mock)
- ✅ agent_id is generated
- ✅ status is "provisioning" or "running"

---

### Test 2: Verify Container on TENANT VPS (5 min)

After deploy_agent completes:

```bash
# SSH to TENANT VPS
ssh -i ~/.ssh/id_ed25519_187_124_173_69 root@187.124.173.69

# Check container is running
docker ps | grep agent

# Check logs
docker logs <container_id> | head -20

# Verify resources are limited
docker stats --no-stream | grep <container_id>
```

**Expected**:
- ✅ Container `agent_...` exists and is running
- ✅ Logs show successful startup
- ✅ Memory usage < 500MB (of 1.5GB limit)
- ✅ CPU < 50% (0.5 vCPU limit enforced)

---

### Test 3: get_deployment_status (5 min)

```bash
curl http://localhost:3000/api/tools/get_deployment_status \
  -H 'Content-Type: application/json' \
  -d "{
    \"agent_id\": \"<agent_id_from_test_1>\",
    \"owner_wallet\": \"5RQnNcYzXdSHr1CiBJ468tApY41KyKgPPr8W4tSeZHFJ\"
  }"
```

**Expected Response**:
```json
{
  "status": "running",
  "uptime_seconds": 123,
  "container_id": "...",
  "vps_ip": "187.124.173.69",
  "logs": [...]
}
```

**Success Criteria**:
- ✅ Returns live agent status
- ✅ Shows container is running
- ✅ Uptime > 0 seconds
- ✅ Logs available

---

### Test 4: Flight Search via Agent (10 min)

Once agent is running, test travel bundle:

```bash
# Call agent at its endpoint (from deploy_agent response)
curl -X POST <agent_endpoint>/tools/search_flights \
  -H 'Content-Type: application/json' \
  -d "{
    \"origin\": \"LAX\",
    \"destination\": \"JFK\",
    \"departure_date\": \"2026-05-15\",
    \"passengers\": 1,
    \"cabin_class\": \"economy\"
  }"
```

**Expected**:
- ✅ Agent responds (should be agent running search_flights tool)
- ✅ Returns 50+ flight offers
- ✅ Includes pricing, airlines, duration
- ✅ Response time < 5 seconds

---

### Test 5: Price Flight (5 min)

```bash
curl -X POST <agent_endpoint>/tools/price_flight \
  -H 'Content-Type: application/json' \
  -d "{
    \"offer_id\": \"<offer_from_test_4>\",
    \"total_amount\": \"599.99\",
    \"currency\": \"USD\"
  }"
```

**Expected**:
- ✅ Returns pricing validity
- ✅ Shows price and currency
- ✅ Includes expiry timestamp

---

## 📊 Success Criteria Summary

| Test | Blocker? | Success = |
|------|----------|-----------|
| 1. deploy_agent | 🟢 NO | Returns agent_id, payment verified |
| 2. Container check | 🔴 YES | Container exists, running, resource limits enforced |
| 3. get_deployment_status | 🟢 NO | Returns live agent info |
| 4. Flight search | 🔴 YES | 50+ offers in < 5s |
| 5. Price flight | 🟢 NO | Pricing returned with validity |

**🔴 Blockers**: If containers 2 or 4 fail, we need to debug immediately.

---

## 🎯 Timeline

- **09:00** - Kimi confirms HFSP is public
- **09:15** - Claude runs tests 1-5 sequentially
- **10:30** - All tests complete, results documented
- **10:45** - Summarize and identify issues (if any)

---

## 📁 Files to Read Before Starting

- `KIMI_TASKS_THURSDAY.md` — Verify Kimi has exposed HFSP
- `PARALLEL_TEST_RESULTS.md` — Review what's been tested already
- `THURSDAY_STATUS.md` — Understand what's ready

---

## 🚨 If Something Fails

| Issue | Check |
|-------|-------|
| HFSP 404 | Is it listening on 0.0.0.0:3001? Try `curl http://187.124.170.113:3001/health` |
| Container won't start | Check: Docker pull, env vars, resource limits |
| Flight search times out | Duffel API rate limit? Token valid? Check logs |
| Payment verification fails | Using `devnet_` prefix? Check NODE_ENV is not production |

---

**Owner**: Claude  
**Date**: 2026-04-17  
**Status**: Fully ready to execute
