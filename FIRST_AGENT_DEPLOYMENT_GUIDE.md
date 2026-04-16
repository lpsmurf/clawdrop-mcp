# First Agent Deployment Guide

**Status**: Ready to execute once VPS 2 SSH is fixed  
**Prerequisite**: Kimi completes MESSAGE_TO_KIMI_FINAL.md tasks

---

## ✅ Pre-Deployment Checklist

### Infrastructure (Verify First)

```bash
# Test Provisioner connectivity
ssh root@187.124.170.113 "curl -s http://localhost:3001/health"
# Should return: {"status": "ok"} or similar

# Test Compute connectivity  
ssh root@187.124.173.69 "docker ps"
# Should list containers (or be empty for first deploy)

# Verify provisioner key in authorized_keys
ssh root@187.124.173.69 "cat ~/.ssh/authorized_keys | grep AAAAC"
# Should show the provisioner public key
```

**Success**: All 3 commands return valid output ✅

---

## 🚀 Step 1: Prepare Docker Environment (5 min)

```bash
# SSH to compute VPS
ssh root@187.124.173.69

# Create agent directory
mkdir -p /srv/agents
mkdir -p /var/log/clawdrop

# Pull OpenClaw image
docker pull ghcr.io/clawdrop/openclaw:latest

# Verify Docker is ready
docker ps
# Should show empty list or existing containers
```

**Success**: `docker ps` works, no errors ✅

---

## 🚀 Step 2: Deploy Agent via HFSP (10 min)

```bash
# From your Mac, call HFSP provisioner API
curl -X POST http://187.124.170.113:3001/api/v1/agents/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent-001",
    "owner_wallet": "YOUR_SOLANA_WALLET",
    "bundles": ["solana", "travel-crypto-pro"],
    "tier": "tier_b",
    "environment": {
      "DUFFEL_API_TOKEN": "DUFFEL_TEST_TOKEN_REDACTED",
      "HELIUS_API_KEY": "YOUR_HELIUS_KEY",
      "SOLANA_RPC_URL": "https://api.devnet.solana.com"
    }
  }'

# Response should include:
# {
#   "agent_id": "test-agent-001",
#   "container_id": "abcd1234...",
#   "status": "running",
#   "mcp_port": 3001,
#   "created_at": "2026-04-21T..."
# }
```

**Success**: Response shows `"status": "running"` ✅

---

## 🚀 Step 3: Verify Agent Deployment (5 min)

```bash
# Check container is running
ssh root@187.124.173.69 "docker ps | grep openclaw"
# Should show: openclaw_test-agent-001 ... Up X seconds

# Check logs
ssh root@187.124.173.69 "docker logs openclaw_test-agent-001"
# Should show: "OpenClaw runtime started" or similar
# Should NOT show errors

# Verify MCP tools loaded
ssh root@187.124.173.69 "docker exec openclaw_test-agent-001 npm list @clawdrop"
# Should list installed bundles
```

**Success**: Container running, logs show successful startup ✅

---

## 🚀 Step 4: Test MCP Tools (10 min)

### Test 1: Flight Search

```bash
# Call the agent's MCP interface
curl -X POST http://187.124.173.69:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_flights",
    "input": {
      "origin": "LAX",
      "destination": "JFK",
      "departure_date": "2026-05-15",
      "passengers": 1,
      "cabin_class": "economy"
    }
  }'

# Expected response: Array of 50+ flight offers with prices
```

### Test 2: Wallet Operations

```bash
curl -X POST http://187.124.173.69:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "get_balance",
    "input": {
      "wallet": "YOUR_SOLANA_WALLET"
    }
  }'

# Expected response: SOL balance (should be > 0 for devnet)
```

**Success**: Both tools return valid data ✅

---

## 🚀 Step 5: End-to-End Booking Test (15 min)

**Scenario**: User books a $129.99 flight LAX → JFK

```bash
# Step 1: Agent searches (already done above)
# Response includes: offer_id = "off_0000B5LyX1TmxvIv..."

# Step 2: Agent prices the offer
curl -X POST http://187.124.173.69:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "price_flight",
    "input": {
      "offer_id": "off_0000B5LyX1TmxvIv...",
      "total_amount": "129.99",
      "currency": "USD"
    }
  }'

# Step 3: Agent books the flight
curl -X POST http://187.124.173.69:3001/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "book_flight",
    "input": {
      "offer_id": "off_0000B5LyX1TmxvIv...",
      "given_name": "John",
      "family_name": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "date_of_birth": "1990-01-15",
      "gender": "male"
    }
  }'

# Expected response:
# {
#   "success": true,
#   "order": {
#     "id": "ord_0000...",
#     "confirmation_url": "https://...",
#     "total": "129.99",
#     "currency": "USD"
#   }
# }
```

**Success**: Booking confirms successfully ✅

---

## 📊 Test Results

Create a test results document:

```markdown
# Agent Test Results - test-agent-001

**Date**: 2026-04-21  
**Agent ID**: test-agent-001  
**Owner**: Build Team  

## Deployment
- ✅ Container deployed successfully
- ✅ Startup time: 45 seconds
- ✅ MCP tools loaded: 5/5

## Tool Tests
- ✅ search_flights: 70 offers returned
- ✅ get_flight_details: Working
- ✅ price_flight: Pricing validated
- ✅ book_flight: Booking confirmed
- ✅ get_balance: Balance returned

## E2E Booking
- ✅ Search → Price → Book completed
- ✅ Order confirmation generated
- ✅ Total time: 8.3 seconds

## Load Test (if applicable)
- ✅ 5 concurrent requests: All successful
- ✅ Memory usage: 340 MB
- ✅ CPU usage: 45%
- ✅ Response time: 2.1s average

## Status
🟢 READY FOR PRODUCTION
```

---

## 🔄 Troubleshooting

### Container won't start

```bash
# Check logs
docker logs openclaw_test-agent-001 --tail 50

# Common issues:
# - Missing environment variables → Add to deployment
# - Port already in use → Change port in config
# - Image not found → Run docker pull first
```

### MCP tools not responding

```bash
# Verify tools are installed
docker exec openclaw_test-agent-001 npm list @clawdrop/travel-crypto-pro

# Check if MCP server started
docker exec openclaw_test-agent-001 ps aux | grep mcp

# View recent logs
docker logs openclaw_test-agent-001 --tail 100 --follow
```

### Flight search returns no results

```bash
# Check Duffel API token
docker exec openclaw_test-agent-001 env | grep DUFFEL

# Test directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.duffel.com/air/offer_requests -d '...'

# Verify search parameters are valid IATA codes
```

---

## 📋 Deployment Checklist

```
Pre-Deployment:
  [ ] VPS 2 SSH working
  [ ] .env.local configured with credentials
  [ ] Docker pulling successfully
  [ ] Duffel token valid
  [ ] Solana devnet RPC accessible

Deployment:
  [ ] Agent deployed via HFSP
  [ ] Container running
  [ ] MCP tools responsive
  [ ] Logs show no errors

Testing:
  [ ] Flight search working
  [ ] Tool parameters validated
  [ ] E2E booking completes
  [ ] Error handling works
  [ ] Load test passed (5 agents)

Post-Deployment:
  [ ] Results documented
  [ ] Issues logged
  [ ] Ready for Phase 2 Week 1
```

---

## 🎯 Success Criteria

**All tests PASS** if:
- ✅ Agent container running
- ✅ All MCP tools responding < 5s
- ✅ Flight search returns 50+ results
- ✅ Booking completes end-to-end
- ✅ No error logs in container
- ✅ 5 agents can run concurrently

---

## 📞 Next Steps After Deployment

1. **Week 1 (Apr 21-27)**
   - Multi-bundle testing
   - Load testing at scale
   - User acceptance testing

2. **Week 2 (Apr 28-May 4)**
   - Tier system implementation
   - Subscription management
   - Multi-tenant isolation

3. **Ongoing**
   - Monitoring setup
   - Performance optimization
   - Payment integration (Gnosis Pay)

---

**Status**: Ready to execute  
**Blocker**: VPS 2 SSH fix (Kimi's task)  
**Expected Duration**: 45 minutes (all steps)

