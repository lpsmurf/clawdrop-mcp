# Phase 2 & 3 Detailed Timeline

**Date**: April 16, 2026  
**Status**: Planning Complete  
**Duration**: Phase 2 (8 weeks) + Phase 3 (12 weeks) = 20 weeks total

---

## Executive Summary

```
Phase 1 (NOW)    ✅ Architecture + Travel Bundle
    ↓
Phase 2 (8 wks)  📋 Production Readiness + First Agent
    ├─ Docker deployment working
    ├─ Real Amadeus + Gnosis Pay
    ├─ Database persistence
    └─ Security audit
    ↓
Phase 3 (12 wks) 🚀 Scale + Multi-Provider + Enterprise
    ├─ Kubernetes scaling
    ├─ Duffel flights API
    ├─ Squads multisig
    └─ Advanced analytics
```

---

## Phase 2 Timeline: Production Readiness (8 weeks)

### Week 1-2: Docker Deployment & Testing

**Weeks**: Apr 21 - May 4  
**Owner**: Kimi (VPS), You (Control Plane)  
**Goal**: First agent deployed and working end-to-end

**Tasks**:

1. **VPS 2 SSH Fix** (Kimi)
   - Execute Hostinger VNC console commands
   - Verify SSH connectivity from control plane
   - Test docker pull + docker run
   - Time: 2 hours

2. **OpenClaw Container Entrypoint** (Kimi)
   - Update Dockerfile to execute BUNDLE_INSTALLS
   - Test bundle installation (npm install @clawdrop/travel-crypto-pro)
   - Verify MCP tool discovery
   - Time: 4 hours

3. **First Agent Deployment** (You)
   - Create test agent via control plane API
   - Deploy to VPS 2 with travel bundle
   - Verify container running
   - Get agent stdio endpoint
   - Time: 3 hours

4. **End-to-End Travel Test** (You)
   - Connect Claude to deployed agent
   - Search flights with Amadeus sandbox
   - Search hotels
   - Build itinerary
   - Request approval
   - Execute mock booking
   - Document results
   - Time: 4 hours

**Deliverables**:
- ✅ First working Clawdrop agent
- ✅ Travel bundle functional in production environment
- ✅ Docker deployment pipeline validated
- ✅ Logs verified and accessible

**Metrics**:
- Deployment time: < 30 seconds
- Tool discovery time: < 2 seconds
- Search latency: < 3 seconds

---

### Week 2-3: Amadeus Production Setup

**Weeks**: Apr 28 - May 11  
**Owner**: You  
**Goal**: Real flight/hotel search capability

**Tasks**:

1. **Amadeus Production Credentials** (You)
   - Create production Amadeus app
   - Request approval from Amadeus
   - Wait for approval (1-3 days)
   - Receive CLIENT_ID + SECRET
   - Time: 2 hours (1-3 days waiting)

2. **Update Control Plane** (You)
   - Add production env var handling
   - Implement AMADEUS_ENV switching
   - Add production credential validation
   - Log important deployments to audit trail
   - Time: 3 hours

3. **Test Real Flight/Hotel Data** (You)
   - Search for real flights (not sandbox)
   - Verify pricing accuracy
   - Check availability
   - Document API response examples
   - Time: 2 hours

4. **Production Deployment** (You)
   - Deploy agent with production Amadeus keys
   - Run full booking flow
   - Monitor API usage
   - Check error rates
   - Time: 2 hours

**Deliverables**:
- ✅ Production Amadeus integration
- ✅ Real flight/hotel search working
- ✅ Control plane handles env switching

**Blockers**:
- Amadeus approval (1-3 days)

---

### Week 3-4: Database Persistence

**Weeks**: May 5 - May 18  
**Owner**: You  
**Goal**: Persistence layer for agents + bookings

**Tasks**:

1. **PostgreSQL Setup** (You)
   - Add PostgreSQL to Hostinger VPS 2
   - Create database: clawdrop_prod
   - Create user: clawdrop_app
   - Time: 2 hours

2. **Schema Design** (You)
   - agents table (agent_id, owner_wallet, bundles, status)
   - bookings table (booking_id, agent_id, flights, hotels, cost, approval_status)
   - approvals table (approval_id, agent_id, amount, status, expires_at)
   - transactions table (tx_id, booking_id, hash, amount, status)
   - Time: 3 hours

3. **Prisma Migration** (You)
   - Add Prisma ORM to control plane
   - Generate migrations from schema
   - Test seed data
   - Time: 3 hours

4. **Update Control Plane** (You)
   - Replace in-memory store with Prisma
   - Implement CRUD operations
   - Add transaction logging
   - Time: 4 hours

5. **Integration Testing** (You)
   - Deploy agent → save to DB
   - Create booking → save to DB
   - Query agent history
   - Verify data consistency
   - Time: 2 hours

**Deliverables**:
- ✅ PostgreSQL running
- ✅ Database schema deployed
- ✅ Prisma migrations working
- ✅ Data persistence verified

---

### Week 4-5: Gnosis Pay Production

**Weeks**: May 12 - May 25  
**Owner**: You  
**Goal**: Real payment approval + execution

**Tasks**:

1. **Gnosis Pay Account Setup**
   - Register for production Gnosis Pay
   - Complete KYC verification
   - Set up Gnosis Safe wallet
   - Request Visa card issuance
   - Wait for approval (5-10 days)
   - Time: 4 hours (5-10 days waiting)

2. **Control Plane Integration** (You)
   - Add Gnosis Pay API client
   - Implement checkSpendAvailability() with real API
   - Implement requestSpendApproval() with real amounts
   - Implement executeApprovedSpend() with real Visa charges
   - Time: 5 hours

3. **Policy Engine Hardening** (You)
   - Test DEFAULT_POLICY limits ($5k flights, $400/night, $10k trip)
   - Test ENTERPRISE_POLICY for Tier C
   - Test auto-approve threshold ($100)
   - Test multi-level approval (> $5000 requires manual)
   - Time: 3 hours

4. **Travel Bundle Updates** (You)
   - Replace Gnosis Pay sandbox with production
   - Add real transaction signing
   - Handle payment failures gracefully
   - Add receipt generation
   - Time: 3 hours

5. **Production Testing** (You)
   - Test approval flow with real amounts
   - Test Visa card issuance
   - Test spending limits
   - Monitor Gnosis Safe wallet
   - Time: 3 hours

**Deliverables**:
- ✅ Gnosis Pay production working
- ✅ Real spending approval + execution
- ✅ Policy engine validated with real amounts
- ✅ Visa card successfully issued

**Blockers**:
- Gnosis Pay KYC approval (5-10 days)

---

### Week 5-6: Security Audit

**Weeks**: May 19 - June 1  
**Owner**: External auditor (hire)  
**Goal**: Identify and fix security issues

**Tasks**:

1. **Hiring Security Auditor** (You)
   - Find auditor (Trail of Bits, OpenZeppelin, etc.)
   - Scope audit (code + deployment)
   - Get quote + timeline
   - Sign contract
   - Time: 3 hours

2. **Code Preparation** (You)
   - Ensure all code is in GitHub
   - Document architecture
   - Provide deployment guides
   - List known issues
   - Time: 2 hours

3. **Audit Execution** (Auditor)
   - Review control plane code
   - Review bundle implementations
   - Test deployment pipeline
   - Check credential handling
   - Test payment flows
   - Time: 40 hours

4. **Issue Remediation** (You)
   - Critical issues: fix before Phase 2 complete
   - High issues: fix before Phase 3 start
   - Medium/Low: backlog for Phase 3
   - Time: 10 hours

5. **Audit Report** (Auditor)
   - Final report with findings
   - Remediation checklist
   - Post-audit recommendations
   - Time: 5 hours

**Deliverables**:
- ✅ Security audit report
- ✅ All critical issues fixed
- ✅ Audit-ready deployment

**Cost**: $5k-$15k

---

### Week 6-7: API Versioning & Breaking Changes

**Weeks**: May 26 - June 8  
**Owner**: You  
**Goal**: Prepare for Phase 3 without breaking clients

**Tasks**:

1. **API Versioning Strategy** (You)
   - Implement versioning (v1, v2, etc.)
   - Add version header to all endpoints
   - Document deprecation policy
   - Time: 3 hours

2. **Bundle Versioning** (You)
   - Bundles versioned independently
   - Control plane can pin bundle versions
   - Support multiple bundle versions simultaneously
   - Time: 2 hours

3. **Migration Path** (You)
   - Document upgrade path for Phase 3
   - Plan breaking changes (if any)
   - Provide migration guides
   - Time: 2 hours

4. **Backwards Compatibility Tests** (You)
   - Test old clients with new API
   - Test new clients with old bundles
   - Ensure graceful degradation
   - Time: 3 hours

**Deliverables**:
- ✅ API versioning implemented
- ✅ Backwards compatibility maintained
- ✅ Phase 3 breaking changes documented

---

### Week 7-8: Monitoring & Dashboarding

**Weeks**: June 2 - June 15  
**Owner**: You  
**Goal**: Production observability

**Tasks**:

1. **Metrics Collection** (You)
   - Add Prometheus metrics to control plane
   - Track deployments/minute
   - Track average deployment time
   - Track bundle usage
   - Time: 3 hours

2. **Logging** (You)
   - Centralize container logs (CloudWatch or Loki)
   - Add structured logging
   - Implement log retention (30 days)
   - Time: 3 hours

3. **Control Plane Dashboard** (You)
   - Build React dashboard
   - List deployed agents (status, uptime, last activity)
   - Show booking metrics (count, total value, errors)
   - Show spending by tier
   - Show policy enforcement stats
   - Time: 8 hours

4. **Alerting** (You)
   - Alert on deployment failures
   - Alert on API errors (> 1% error rate)
   - Alert on spending anomalies
   - Alert on agent crashes
   - Time: 3 hours

5. **On-Call Setup** (You)
   - PagerDuty integration
   - Escalation policies
   - Runbooks for common issues
   - Time: 2 hours

**Deliverables**:
- ✅ Prometheus metrics
- ✅ Control plane dashboard
- ✅ Alert rules configured
- ✅ On-call process documented

---

### Phase 2 Summary

**Timeline**: Apr 21 - Jun 15 (8 weeks)

**Milestones**:
- Week 2: ✅ First agent deployed
- Week 4: ✅ Production Amadeus
- Week 5: ✅ Database persistence
- Week 6: ✅ Gnosis Pay production
- Week 7: ✅ Security audit complete
- Week 8: ✅ Monitoring ready

**Output**:
- 1 production agent deployed
- Real flight/hotel search working
- Real payment execution working
- Production database ready
- Security audit passed
- Monitoring + alerting deployed

**Team**: 1 backend (You) + 1 infrastructure (Kimi)  
**Estimated Cost**: $10k-$20k (infrastructure + security audit)

---

## Phase 3 Timeline: Scale & Enterprise (12 weeks)

### Week 1-2: Kubernetes Migration

**Weeks**: Jun 16 - Jun 29  
**Owner**: Kimi (DevOps), You (API)  
**Goal**: Move from single VPS to managed Kubernetes

**Tasks**:

1. **Cluster Setup** (Kimi)
   - Deploy EKS cluster (AWS) - 3 nodes minimum
   - Configure networking + security groups
   - Set up persistent storage (EBS)
   - Set up load balancing (ALB)
   - Time: 8 hours

2. **Helm Charts** (Kimi)
   - Create Helm chart for OpenClaw agent
   - Create Helm chart for control plane
   - Create Helm chart for PostgreSQL
   - Time: 6 hours

3. **Migration** (You)
   - Migrate PostgreSQL to RDS
   - Migrate control plane to EKS
   - Migrate agent deployments to EKS
   - Time: 4 hours

4. **Testing** (You)
   - Deploy agents via Kubernetes
   - Test scaling (1 → 5 → 20 agents)
   - Monitor performance
   - Verify logs + metrics still work
   - Time: 3 hours

**Deliverables**:
- ✅ EKS cluster running
- ✅ All services migrated
- ✅ 20+ agents tested

---

### Week 2-3: Multi-Provider Foundation

**Weeks**: Jun 23 - Jul 6  
**Owner**: You  
**Goal**: Abstract provider pattern + prepare for Duffel

**Tasks**:

1. **Provider Interface** (You)
   - Extend provider pattern (currently Amadeus only)
   - Define FlightProvider interface
   - Define HotelProvider interface
   - Time: 2 hours

2. **Provider Registry** (You)
   - Control plane registers available providers
   - Travel bundle can list providers
   - Teams can choose provider per deployment
   - Time: 3 hours

3. **Duffel Integration** (You)
   - Sign up for Duffel API
   - Implement Duffel flight provider
   - Run A/B tests (Amadeus vs Duffel prices)
   - Time: 8 hours

4. **Provider Metrics** (You)
   - Track API latency per provider
   - Track error rates per provider
   - Track price differences
   - Time: 2 hours

**Deliverables**:
- ✅ Multi-provider abstraction ready
- ✅ Duffel integration working
- ✅ A/B testing data available

---

### Week 3-4: Squads Multisig (Enterprise)

**Weeks**: Jun 30 - Jul 13  
**Owner**: You  
**Goal**: Multi-signature spending approval for enterprises

**Tasks**:

1. **Squads Account** (You)
   - Register Squads account
   - Learn Squads API
   - Create test multisig wallet
   - Time: 3 hours

2. **Multisig Integration** (You)
   - Add Squads support to control plane
   - ENTERPRISE_POLICY uses Squads multisig
   - Spending > $5000 requires 2-of-3 approval
   - Time: 8 hours

3. **Approval Workflow** (You)
   - Travel bundle requests approval via Squads
   - Team members can approve/reject on Squads app
   - Approved transactions executed automatically
   - Time: 5 hours

4. **Tier C (Enterprise) Setup** (You)
   - Tier C includes Squads multisig
   - Custom spending limits per team
   - Advanced policy language support
   - Time: 3 hours

**Deliverables**:
- ✅ Squads multisig working
- ✅ Enterprise approval flow ready
- ✅ Tier C available for sale

---

### Week 4-5: Advanced Analytics

**Weeks**: Jul 7 - Jul 20  
**Owner**: You  
**Goal**: Insights for teams + business intelligence

**Tasks**:

1. **Data Warehouse** (You)
   - Set up BigQuery or Redshift
   - Copy PostgreSQL data daily
   - Create fact tables (bookings, spending, etc.)
   - Time: 5 hours

2. **Dashboard Builder** (You)
   - Teams can create custom dashboards
   - Pre-built dashboards: spending, routes, airlines
   - Export reports as PDF
   - Time: 8 hours

3. **Insights Engine** (You)
   - Find best prices (Amadeus vs Duffel)
   - Recommend alternative dates
   - Suggest budget-friendly hotels
   - Show spending trends
   - Time: 6 hours

4. **API for Analytics** (You)
   - Expose insights via REST API
   - Teams can build custom integrations
   - Time: 3 hours

**Deliverables**:
- ✅ Data warehouse ready
- ✅ Insights dashboard deployed
- ✅ Analytics API available

---

### Week 5-6: Advanced Bundle System

**Weeks**: Jul 14 - Jul 27  
**Owner**: You  
**Goal**: Custom bundles + policy language

**Tasks**:

1. **Bundle Marketplace** (You)
   - Community can contribute bundles
   - Create submission guidelines
   - Add bundle review process
   - Time: 5 hours

2. **Custom Policy Language** (You)
   - DSL for policy rules
   - Teams can define custom policies
   - Examples: "no flights > 10 hours", "prefer economy"
   - Time: 8 hours

3. **Bundle Composition** (You)
   - Teams can combine bundles (travel + research + crypto)
   - Resolve dependencies automatically
   - Support bundle versioning + compatibility
   - Time: 6 hours

**Deliverables**:
- ✅ Bundle marketplace launched
- ✅ Custom policy language available
- ✅ Multi-bundle deployments supported

---

### Week 6-7: Rate Limiting & Quotas

**Weeks**: Jul 21 - Aug 3  
**Owner**: You  
**Goal**: Prevent abuse + manage costs

**Tasks**:

1. **Rate Limiter** (You)
   - API rate limits per tier
   - Tier A: 100 requests/hour
   - Tier B: 1000 requests/hour
   - Tier C: unlimited
   - Time: 3 hours

2. **Spending Quotas** (You)
   - Tier A: $5k/month limit
   - Tier B: $50k/month limit
   - Tier C: custom limit
   - Alert when approaching limit
   - Time: 3 hours

3. **Cost Tracking** (You)
   - Track API costs (Amadeus, Gnosis Pay, etc.)
   - Charge-back to teams
   - Show cost per booking
   - Time: 3 hours

4. **Quota Dashboard** (You)
   - Teams see remaining quota
   - Alerts when quota low
   - Request quota increase
   - Time: 3 hours

**Deliverables**:
- ✅ Rate limiting deployed
- ✅ Cost tracking working
- ✅ Quota dashboard ready

---

### Week 7-8: CLI Tool

**Weeks**: Aug 4 - Aug 17  
**Owner**: You  
**Goal**: Command-line interface for teams

**Tasks**:

1. **CLI Framework** (You)
   - Build with oclif (Node.js CLI framework)
   - Commands: agent, booking, policy, analytics
   - Time: 4 hours

2. **Agent Management** (You)
   ```
   clawdrop agent:create --name my-agent --tier a
   clawdrop agent:deploy <agent-id>
   clawdrop agent:logs <agent-id>
   clawdrop agent:status <agent-id>
   ```
   - Time: 4 hours

3. **Booking Management** (You)
   ```
   clawdrop booking:search --from JFK --to MAD
   clawdrop booking:approve <booking-id>
   clawdrop booking:history <agent-id>
   ```
   - Time: 3 hours

4. **Policy Management** (You)
   ```
   clawdrop policy:get <agent-id>
   clawdrop policy:set <agent-id> --max-flight 10000
   clawdrop policy:list
   ```
   - Time: 3 hours

5. **Publishing** (You)
   - Publish to npm
   - Update docs
   - Time: 2 hours

**Deliverables**:
- ✅ CLI tool published on npm
- ✅ Full agent + booking management
- ✅ Usage documentation

---

### Week 8-9: Testing & QA

**Weeks**: Aug 11 - Aug 24  
**Owner**: You + QA contractor  
**Goal**: Production readiness for 1000+ agents

**Tasks**:

1. **Load Testing** (QA)
   - Simulate 100 concurrent agents
   - Simulate 1000 concurrent deployments
   - Monitor CPU, memory, network
   - Identify bottlenecks
   - Time: 6 hours

2. **Chaos Testing** (QA)
   - Kill agents randomly
   - Restart Kubernetes nodes
   - Kill database connections
   - Verify recovery
   - Time: 6 hours

3. **Booking Flow Testing** (QA)
   - Test all provider combinations (Amadeus, Duffel)
   - Test all policy types (DEFAULT, ENTERPRISE, custom)
   - Test approval flows (auto, manual, multisig)
   - Time: 8 hours

4. **Compliance Testing** (QA)
   - Verify GDPR compliance (data deletion)
   - Verify PCI compliance (no key storage)
   - Verify audit logging
   - Time: 4 hours

5. **Documentation** (You)
   - Update runbooks for Phase 3 scale
   - SLO/SLA documentation
   - Disaster recovery procedures
   - Time: 4 hours

**Deliverables**:
- ✅ Load test results
- ✅ Chaos test results
- ✅ Production runbooks updated
- ✅ Compliance verified

**Cost**: $2k-$3k (QA contractor)

---

### Week 9-10: Customer Onboarding

**Weeks**: Aug 18 - Aug 31  
**Owner**: You  
**Goal**: First paying customers

**Tasks**:

1. **Signup Flow** (You)
   - Create landing page
   - Implement signup + payment integration (Stripe)
   - Tier selection (A, B, C)
   - Time: 8 hours

2. **Onboarding Docs** (You)
   - Quick start guide
   - Video tutorials
   - API documentation
   - CLI documentation
   - FAQ
   - Time: 10 hours

3. **Customer Support** (You)
   - Helpdesk setup (Zendesk or Intercom)
   - SLA: response in 24 hours
   - Escalation process
   - Time: 4 hours

4. **First Customers** (Sales)
   - Reach out to early adopters
   - Close 3-5 Tier A customers
   - Close 1-2 Tier B customers
   - Time: varies

**Deliverables**:
- ✅ Landing page live
- ✅ Stripe integration
- ✅ First customers onboarded
- ✅ Support system operational

---

### Week 10-11: Bug Fixes & Improvements

**Weeks**: Aug 25 - Sep 7  
**Owner**: You  
**Goal**: Polish + customer feedback

**Tasks**:

1. **Bug Fixes** (You)
   - Fix issues from Phase 3 testing
   - Fix issues from customer feedback
   - Time: 10 hours

2. **Performance Optimization** (You)
   - Optimize database queries
   - Add caching (Redis)
   - Optimize API response times
   - Target: < 100ms p99 latency
   - Time: 8 hours

3. **Feature Requests** (You)
   - Implement top customer requests
   - Examples: bulk booking, price history, etc.
   - Time: 8 hours

**Deliverables**:
- ✅ All critical bugs fixed
- ✅ p99 latency < 100ms
- ✅ Top 5 feature requests implemented

---

### Week 11-12: Launch & Marketing

**Weeks**: Sep 1 - Sep 14  
**Owner**: You + Marketing  
**Goal**: Public launch

**Tasks**:

1. **Launch Prep** (You)
   - Final testing
   - Verify all systems ready
   - Create launch checklist
   - Time: 4 hours

2. **Marketing Campaign** (Marketing)
   - Blog post: "AI Agents for Travel"
   - Twitter announcement
   - Product Hunt launch
   - Press release
   - Time: varies

3. **Community** (You)
   - Open GitHub repos (if applicable)
   - Create Discord community
   - Announce on Dev.to, HackerNews
   - Time: 4 hours

4. **Monitoring** (You)
   - Watch metrics during launch
   - Be on-call for issues
   - Respond to feedback
   - Time: 2 days

**Deliverables**:
- ✅ Public launch complete
- ✅ 100+ early users
- ✅ 10+ Tier A customers
- ✅ 2-3 Tier B customers

---

## Phase 3 Summary

**Timeline**: Jun 16 - Sep 14 (12 weeks)

**Milestones**:
- Week 2: ✅ Kubernetes migration complete
- Week 4: ✅ Duffel integration ready
- Week 5: ✅ Squads multisig working
- Week 7: ✅ Analytics dashboard deployed
- Week 8: ✅ CLI tool available
- Week 10: ✅ First customers onboarded
- Week 12: ✅ Public launch

**Output**:
- 1000+ agent capacity
- Multi-provider support (Amadeus, Duffel)
- Enterprise multisig approval
- Advanced analytics
- CLI tool
- 10-20 paying customers
- Public launch with community

**Team**: 1 backend (You) + 1 DevOps (Kimi) + 1 QA contractor  
**Estimated Cost**: $15k-$25k (infrastructure + contractor + marketing)

---

## Combined Timeline: Phase 1 → 2 → 3

```
Phase 1: NOW (2 weeks)
├── Apr 16: Architecture review complete
├── Apr 17-18: Prepare Amadeus + VPS SSH
└── Apr 19: Phase 1 complete ✅

Phase 2: Apr 21 - Jun 15 (8 weeks)
├── Week 2: First agent deployed ✅
├── Week 4: Production Amadeus ✅
├── Week 5: Database + Gnosis Pay ✅
├── Week 7: Security audit ✅
└── Week 8: Monitoring ready ✅

Phase 3: Jun 16 - Sep 14 (12 weeks)
├── Week 2: Kubernetes ready ✅
├── Week 4: Multi-provider ready ✅
├── Week 5: Enterprise multisig ✅
├── Week 7: Analytics dashboard ✅
├── Week 8: CLI tool ✅
├── Week 10: First customers ✅
└── Week 12: Public launch ✅

Total: 22 weeks from now → Production launch
      (April 16 → September 14)
```

---

## Resource & Budget Summary

### Team

**Phase 1**: 
- You (architecture + code)
- Kimi (VPS + Docker)

**Phase 2**:
- You (backend + integration)
- Kimi (DevOps + infrastructure)

**Phase 3**:
- You (features + customer support)
- Kimi (DevOps + Kubernetes)
- QA contractor (testing)
- Marketing (launch)

### Infrastructure Costs

| Phase | Item | Cost/Month | Notes |
|-------|------|-----------|-------|
| 1-2 | VPS (single) | $50 | Hostinger |
| 2-3 | RDS PostgreSQL | $20-50 | AWS |
| 3 | EKS cluster | $100-200 | AWS (3 nodes) |
| 3 | BigQuery | $20-50 | Analytics |
| Total Phase 1-2 | - | $70-100 | |
| Total Phase 3 | - | $140-300 | |

### Professional Services

| Service | Cost | Timeline |
|---------|------|----------|
| Security Audit | $10k-15k | Week 5-6 (Phase 2) |
| QA Contractor | $2k-3k | Week 8-9 (Phase 3) |
| Marketing | $1k-5k | Week 11-12 (Phase 3) |

### Total Investment

```
Phase 1: $0 (using existing VPS)
Phase 2: ~$80/month + $10k-15k audit = $10.5k-15.5k total
Phase 3: ~$150/month + $2k-3k QA + $1k-5k marketing = $3.8k-8k total

Total 20-week investment: ~$15k-25k
```

---

## Success Criteria

### Phase 2 Success
- ✅ 1 agent deployed and working
- ✅ Real flight/hotel search working
- ✅ Real payment execution working
- ✅ Security audit passed
- ✅ Monitoring + alerting operational
- ✅ < 1% API error rate
- ✅ Deployment time < 30 seconds

### Phase 3 Success
- ✅ 1000+ concurrent agent capacity
- ✅ Multi-provider support active
- ✅ Enterprise features (multisig, custom policies)
- ✅ 20+ paying customers
- ✅ $10k+ MRR (monthly recurring revenue)
- ✅ < 5% monthly churn
- ✅ 99.9% uptime SLA met

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Amadeus approval delays | Start application immediately, have Duffel as backup |
| Gnosis Pay KYC delays | Plan 2-week buffer, use sandbox longer |
| Security audit issues | Budget 2 weeks for remediation, hire early |
| Kubernetes learning curve | Hire experienced DevOps engineer early (Kimi) |
| Customer onboarding friction | Automate onboarding, provide video tutorials |
| Churn from pricing | Offer free tier during Phase 3, adjust pricing based on feedback |

---

**Status**: Phase 1 planning complete, ready for Phase 2 execution  
**Next Step**: VPS 2 SSH fix (tomorrow) → First agent deployment → Phase 2 begins
