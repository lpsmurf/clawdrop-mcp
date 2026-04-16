# Travel Crypto Pro Bundle — Build Summary

**Date**: April 16, 2026  
**Status**: ✅ Scaffolded and committed  
**Location**: `packages/bundles/travel-crypto-pro/`

## What Was Built

### Core Components (1,441 lines of code)

1. **Type System** (`src/types/index.ts` — 169 lines)
   - Flights: `FlightSegment`, `FlightOffer`, `BookedFlight`
   - Hotels: `HotelOffer`, `BookedHotel`
   - Gnosis Pay: `SpendAvailability`, `SpendApprovalRequest`, `SpendResult`
   - Travel: `TravelPolicy`, `PolicyCheckResult`, `TravelItinerary`

2. **Flight Provider** (`src/providers/flights.ts` — 220 lines)
   - `FlightProvider` interface + Amadeus implementation
   - `searchFlights()` with filtering by price/cabin class
   - `bookFlight()` with traveler details + booking token encoding
   - `getBooking()` for status lookup
   - Dynamic import of `amadeus` package (optional dependency)

3. **Hotel Provider** (`src/providers/hotels.ts` — 190 lines)
   - `HotelProvider` interface + Amadeus implementation
   - Two-step search: city hotel list → offers with pricing
   - `bookHotel()` with virtual Gnosis Pay card integration
   - Hotel availability by date range

4. **Gnosis Pay Spend Abstraction** (`src/payment/gnosis-pay.ts` — 185 lines)
   - `checkSpendAvailability()` — check balance, spending limit, card status
   - `requestSpendApproval()` — create approval request with TTL
   - `approveSpendRequest()` — mark approval as approved (called by user/agent)
   - `executeApprovedSpend()` — charge card, return tx hash
   - `getApprovalRequest()` — fetch approval status
   - Sandbox mode for testing without API calls

5. **Travel Policy Enforcement** (`src/policy/travel-policy.ts` — 165 lines)
   - `DEFAULT_POLICY`: $5k flights, $400/night hotels, $10k trip, <$2.5k auto-approve
   - `ENTERPRISE_POLICY`: $20k flights, $1k/night, $50k trip, <$10k auto-approve
   - `checkFlightPolicy()` — validate price, cabin, advance booking
   - `checkHotelPolicy()` — validate price per night, destination
   - `checkTripPolicy()` — validate total spend
   - Violation + warning reporting

6. **MCP Tools** (`src/tools/index.ts` — 280 lines)
   - `search_travel_options`: Amadeus flight search
   - `search_hotels`: Amadeus hotel search
   - `build_itinerary`: Assemble flights + hotels, apply policy
   - `request_booking_approval`: Gnosis Pay approval request
   - `book_flight`: Execute spend + provider booking
   - All 5 tools include Zod schema validation

7. **Bundle Entry Point** (`src/index.ts` — 37 lines)
   - Export all 5 tools
   - Bundle metadata (name, version, env vars)
   - Type exports for control-plane integration

### Configuration

- `package.json`: Dependencies (amadeus, viem, zod, axios)
- `tsconfig.json`: Extends monorepo base
- `README.md`: Complete usage guide + flow diagrams
- `TRAVEL_BUNDLE_GUIDE.md`: Implementation details + edge cases

### Control Plane Integration

✅ **Updated 3 files** to include `'travel-crypto-pro'` bundle:
- `packages/control-plane/src/server/schemas.ts`: `BundleSchema` enum
- `packages/control-plane/src/db/memory.ts`: `BundleName` type
- `packages/control-plane/src/services/tier.ts`: `bundles_included` for all tiers

## Gold Path: Full Booking Flow

```
User: "Book me a flight to NYC for May 20, staying 4 nights"
  ↓
Claude calls: search_travel_options(origin='MAD', destination='NYC', departure='2026-05-20', adults=1)
  → Returns 10 flights, cheapest $800
  ↓
Claude calls: search_hotels(city_code='NYC', check_in='2026-05-20', check_out='2026-05-24', adults=1)
  → Returns 10 hotels, cheapest $350/night
  ↓
Claude calls: build_itinerary(flight_id=1, hotel_id=1)
  → Total: $800 + $1400 = $2200
  → Policy check: <$2500 threshold → auto-approve
  → Returns itinerary_id='itin_...'
  ↓
Claude calls: request_booking_approval(itinerary_id='itin_...', approval_expires_minutes=30)
  → Auto-approved (trip <$2500), returns request_id
  ↓
Claude calls: book_flight(
    itinerary_id='itin_...',
    approval_request_id='req_...',
    travelers=[{firstName:'Alice', lastName:'Smith', ...}],
    contact_email='alice@example.com'
  )
  → Executes Gnosis Pay spend: $2200 from agent's Safe wallet → airline
  → Calls Amadeus to confirm flight booking
  → Returns booking_ref='ABCDEF123', pnr='FLIGHT123', gnosis_pay_tx='0x...'
```

**Result**: Booked flight + hotel with Gnosis Chain payment proof ✓

## What's Missing (Phase 2+)

### Immediate Next Steps (Pre-Deploy)

1. **Wire into Docker containers** (`packages/control-plane/src/integrations/docker-ssh.ts`)
   - Add: `npm install @clawdrop/travel-crypto-pro` to Docker build
   - Pass Amadeus env vars: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`
   - Update agent's MCP tool registry with travel tools

2. **Bundle installation via control-plane**
   - New endpoint: `POST /agent/:id/bundle/install` (install bundle on running agent)
   - New tool: `installBundle()` in agent provisioning

3. **Get Amadeus sandbox credentials**
   - User visits: https://developers.amadeus.com/register
   - Instant sandbox credentials (15-min approval)
   - Pass to control-plane when deploying travel agent

### Medium Priority (Post-MVP)

4. **Gnosis Pay production integration**
   - Apply for partnership (business verification required)
   - Get production API key + webhook signing secret
   - Implement real Visa virtual card issuance
   - Move approval store from in-memory to control-plane DB
   - Add email/push notifications for approval requests

5. **Duffel provider** (after sandbox validation)
   - Implement `FlightProvider` interface for Duffel API
   - Richer flight content: seat maps, ancillaries, baggage
   - Requires business approval + API key

6. **Booking.com provider** (hotel alternative)
   - Implement `HotelProvider` interface
   - More hotel options, better availability

7. **Database persistence**
   - Migrate approval requests to control-plane DB (currently in-memory Map)
   - Persist booked flights/hotels with confirmation refs
   - Audit trail for all travel spends

### Nice-to-Haves (Phase 3)

8. **Travel policy customization**
   - Per-agent policy overrides (not just DEFAULT/ENTERPRISE)
   - Multi-user/team policies for DAOs
   - Approval workflows (CEO approves >$5k, CFO approves >$10k)

9. **Travel itinerary refinement**
   - Store search results in cache (10-min validity)
   - Allow multi-leg itineraries (NYC → LON → MAD)
   - Alternative options (faster vs. cheapest)

10. **Payment method abstraction**
    - Support other stablecoins (USDT, USDC on Gnosis)
    - Direct bank transfers (for enterprise)
    - Cross-chain bridge option

## Environment Setup for Testing

### Instant (Amadeus Sandbox)

```bash
# 1. Register at https://developers.amadeus.com/register
# 2. Approve (instant, 15 minutes)
# 3. Copy Client ID and Secret
# 4. Set env vars:

export AMADEUS_CLIENT_ID="<your-client-id>"
export AMADEUS_CLIENT_SECRET="<your-client-secret>"
export AMADEUS_ENV="test"  # sandbox
```

### Optional (Gnosis Pay Testing)

```bash
export GNOSIS_PAY_SANDBOX=true  # Mock all spending (no API calls)
# OR for real API (requires partnership):
export GNOSIS_PAY_API_KEY="<your-api-key>"
export GNOSIS_PAY_API_URL="https://api.gnosispay.com"
```

## Files Changed

**New**: 10 files, 1,441 lines
```
+ packages/bundles/travel-crypto-pro/src/types/index.ts
+ packages/bundles/travel-crypto-pro/src/providers/flights.ts
+ packages/bundles/travel-crypto-pro/src/providers/hotels.ts
+ packages/bundles/travel-crypto-pro/src/payment/gnosis-pay.ts
+ packages/bundles/travel-crypto-pro/src/policy/travel-policy.ts
+ packages/bundles/travel-crypto-pro/src/tools/index.ts
+ packages/bundles/travel-crypto-pro/src/index.ts
+ packages/bundles/travel-crypto-pro/package.json
+ packages/bundles/travel-crypto-pro/tsconfig.json
+ packages/bundles/travel-crypto-pro/README.md
```

**Modified**: 3 files
```
~ packages/control-plane/src/server/schemas.ts        (+1 line: BundleSchema enum)
~ packages/control-plane/src/db/memory.ts             (+1 line: BundleName type)
~ packages/control-plane/src/services/tier.ts         (+3 lines: bundles_included)
```

**Documentation**: 2 files
```
+ TRAVEL_BUNDLE_GUIDE.md  (comprehensive implementation guide)
+ TRAVEL_BUNDLE_SUMMARY.md (this file)
```

## Commits

1. `f9076da` — Scaffold travel-crypto-pro bundle with Amadeus + Gnosis Pay integration
2. `a0c97a2` — Add travel bundle implementation guide

Both pushed to `main` at: github.com/lpsmurf/clawdrop-mcp

## Testing the Bundle

### Test 1: Type Compilation
```bash
cd packages/bundles/travel-crypto-pro
npm install
npm run typecheck
```

### Test 2: Amadeus Sandbox Flight Search
```bash
export AMADEUS_CLIENT_ID="<sandbox-key>"
export AMADEUS_CLIENT_SECRET="<sandbox-secret>"
export AMADEUS_ENV="test"

npm run dev  # runs src/index.ts with tools
```

### Test 3: Policy Checking
```typescript
import { checkFlightPolicy, DEFAULT_POLICY } from './src/policy/travel-policy.js';

const flight = { price: { total: 4000 }, itineraries: [...] };
const result = checkFlightPolicy(flight, DEFAULT_POLICY);
// result.allowed === true
// result.requires_approval === true (>$2500)
```

### Test 4: Gnosis Pay Sandbox Spend
```typescript
import { checkSpendAvailability, requestSpendApproval } from './src/payment/gnosis-pay.js';

process.env.GNOSIS_PAY_SANDBOX = 'true';

const avail = await checkSpendAvailability(2200);
// { available: true, spending_limit_usd: 5000, remaining_usd: 5000, card_status: 'active' }

const approval = await requestSpendApproval(2200, 'Airlines', 'Flight to NYC');
// { request_id: 'gp_req_...', amount_usd: 2200, status: 'pending', expires_at: '...' }
```

---

## Next Action

**→ Deploy travel agent to Docker container and test end-to-end flow**

Expected date: After Kimi fixes VPS 2 SSH access (see `MESSAGE_FOR_KIMI_APR16.md`)
