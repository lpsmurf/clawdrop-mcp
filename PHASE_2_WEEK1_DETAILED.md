# Phase 2 - Week 1 Detailed Plan (Apr 21-27)

**Objective**: Deploy first agent to production, verify end-to-end booking flow

---

## 📅 Daily Breakdown

### **Monday, Apr 21** — VPS 2 Verification & Agent Deploy

**Morning (2 hours)**
- [ ] Verify VPS 2 SSH is working (from Kimi's fix)
- [ ] Run discovery script on all VPS
- [ ] Confirm Docker daemon is running
- [ ] Verify provisioner SSH keys in authorized_keys

**Afternoon (3 hours)**
- [ ] Deploy first test agent to Docker
  ```bash
  ssh root@187.124.173.69 "docker pull ghcr.io/clawdrop/openclaw:latest"
  # Then provision via HFSP API
  ```
- [ ] Verify agent container starts
- [ ] Check MCP tools are loaded
- [ ] Review agent logs

**Success Criteria**:
- ✅ `docker ps` shows openclaw container running
- ✅ `docker logs` shows successful startup
- ✅ Agent is responsive to commands

---

### **Tuesday, Apr 22** — MCP Tool Testing

**Morning (3 hours)**
- [ ] Test each travel bundle MCP tool individually
  ```
  - search_flights (LAX → JFK)
  - get_flight_details
  - price_flight
  - book_flight (mock)
  ```
- [ ] Verify tool parameter validation
- [ ] Test error handling

**Afternoon (2 hours)**
- [ ] Test wallet MCP tools
  - [ ] Check balance
  - [ ] Sign transaction
  - [ ] Verify Solana devnet integration
- [ ] Debug any issues

**Success Criteria**:
- ✅ All tools return correct responses
- ✅ Error handling works (invalid inputs, API failures)
- ✅ Type validation prevents bad requests

---

### **Wednesday, Apr 23** — End-to-End Booking Flow

**Morning (4 hours)**
- [ ] Simulate complete booking workflow:
  ```
  1. Search flights (LAX → JFK, May 15)
  2. Agent selects cheapest option
  3. Price the offer
  4. Book the flight (test)
  5. Return confirmation
  ```
- [ ] Test payment flow (mock Gnosis Pay)
- [ ] Verify confirmation email sent

**Afternoon (2 hours)**
- [ ] Test rollback scenarios
  - Payment fails → Cancel order
  - Offer expires → Search again
  - API timeout → Retry logic
- [ ] Document issues found

**Success Criteria**:
- ✅ Booking flow completes end-to-end
- ✅ Payment verified (mock)
- ✅ Error recovery works

---

### **Thursday, Apr 24** — Load Testing & Optimization

**Morning (3 hours)**
- [ ] Load test with 5 concurrent agents
- [ ] Monitor Docker resource usage
- [ ] Check API rate limits (Duffel)
- [ ] Identify bottlenecks

**Afternoon (3 hours)**
- [ ] Optimize if needed
  - Memory: Add caching to reduce API calls
  - CPU: Parallelize where possible
  - I/O: Batch requests
- [ ] Document performance metrics

**Success Criteria**:
- ✅ 5 agents deploy successfully
- ✅ No resource exhaustion
- ✅ Response times < 5s

---

### **Friday, Apr 25** — Multi-Bundle Testing

**Morning (3 hours)**
- [ ] Deploy agent with multiple bundles:
  - ✅ travel-crypto-pro (flight booking)
  - ✅ @clawdrop/mcp (wallet)
  - 🟡 research (if available)
- [ ] Test bundle coordination
- [ ] Verify environment isolation

**Afternoon (3 hours)**
- [ ] User acceptance testing
  - Have a user test the agent
  - Request flights, book, pay
  - Collect feedback
- [ ] Fix bugs found

**Success Criteria**:
- ✅ Multi-bundle deployment works
- ✅ User can complete booking
- ✅ No cross-bundle interference

---

### **Saturday, Apr 26** — Documentation & Handoff

**All Day (4 hours)**
- [ ] Create deployment runbook
- [ ] Document known issues
- [ ] Write troubleshooting guide
- [ ] Record video walkthrough

**Success Criteria**:
- ✅ New team member can deploy without help
- ✅ All issues documented with fixes

---

### **Sunday, Apr 27** — Buffer & Planning

**Morning (2 hours)**
- [ ] Fix any blocker issues
- [ ] Final testing pass
- [ ] Prepare Phase 2 Week 2 plan

**Afternoon (2 hours)**
- [ ] Team retrospective
- [ ] Wins & learnings
- [ ] Next week priorities

---

## 🎯 Success Metrics for Week 1

| Metric | Target | Status |
|--------|--------|--------|
| First agent deployed | ✅ | Pending SSH fix |
| All MCP tools tested | ✅ | Pass/Fail |
| End-to-end booking | ✅ | Pass/Fail |
| 5 concurrent agents | ✅ | Performance test |
| Multi-bundle support | ✅ | Functional test |
| User acceptance | ✅ | 1 user test |
| Documentation complete | ✅ | Runbooks ready |

---

## 📊 Time Breakdown

```
Monday:    5 hours (Deploy + Verify)
Tuesday:   5 hours (Tool Testing)
Wednesday: 6 hours (E2E Booking)
Thursday:  6 hours (Load Testing)
Friday:    6 hours (Multi-Bundle)
Saturday:  4 hours (Documentation)
Sunday:    4 hours (Buffer)
────────────────────────────
TOTAL:     36 hours (4.5 days work equivalent)
```

---

## 🔴 Known Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| VPS 2 SSH still blocked | Low | Kimi has guide, we have backup plan |
| Docker image pull fails | Low | Pre-pull image, use cache |
| Duffel API rate limits | Low | Cache searches, stagger requests |
| Gnosis Pay integration fails | Medium | Have mock ready, implement later |
| Agent crashes under load | Medium | Memory limits, health checks |

---

## 📋 Deliverables by End of Week

- ✅ First production agent deployed
- ✅ All MCP tools verified working
- ✅ End-to-end booking flow tested
- ✅ Load test results (5 agents)
- ✅ Deployment runbook
- ✅ Known issues documented
- ✅ User acceptance testing complete

---

## 🚀 Week 2 Preview (Apr 28-May 4)

Once Week 1 is complete:
- Tier system implementation
- Subscription management
- Multi-tenant isolation
- Monitoring & alerting setup
- Backup strategies

---

**Owner**: Build Team  
**Created**: 2026-04-16  
**Target Start**: Apr 21, 2026  
**Confidence**: 🟢 HIGH (all components ready)

