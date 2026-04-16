# Travel Crypto Pro Bundle — Implementation Guide

**Status**: Scaffolded (Phase 1 complete) | **Last Updated**: 2026-04-16

## Overview

The `travel-crypto-pro` bundle adds crypto-native travel booking to Clawdrop agents via:
- **Amadeus APIs** for flight & hotel search (instant sandbox access)
- **Gnosis Pay** for spending (Visa card backed by Safe wallet on Gnosis Chain)
- **Travel policy** enforcement (spending limits, destinations, approvals)
- **MCP tools** for agents to search, build itineraries, request approvals, and book

## What's Implemented

### 1. Provider Abstraction (`src/providers/`)

**Flights** (`flights.ts`)
- `FlightProvider` interface: `searchFlights()`, `bookFlight()`, `getBooking()`
- **Amadeus** implementation (default)
  - Sandbox API: instant credentials at https://developers.amadeus.com/register
  - Search returns top 10 flights with pricing breakdown
  - Booking encodes full offer as base64 token (Amadeus requires original offer for booking)
  - Type: `FlightOffer` includes price, itineraries, carrier codes, booking token

**Hotels** (`hotels.ts`)
- `HotelProvider` interface: `searchHotels()`, `bookHotel()`, `getBooking()`
- **Amadeus** implementation (default)
  - Two-step: get hotel list for city, then get offers for those hotels
  - Returns cheapest 10 hotels with price per night
  - Booking integrates virtual Gnosis Pay card (placeholder: `GNOSIS_PAY_VIRTUAL_CARD_NUMBER`)
  - Type: `HotelOffer` includes name, city code, check-in/out, price, room type, booking token

### 2. Gnosis Pay Integration (`src/payment/gnosis-pay.ts`)

**Spend Approval Flow**
```typescript
// 1. Check available spend for trip
const available = await checkSpendAvailability(amountUsd);
// returns: { available, spending_limit_usd, spent_today_usd, remaining_usd, card_status }

// 2. Request approval if amount > threshold (auto-approved below threshold)
const approval = await requestSpendApproval(amountUsd, merchant, purpose, ttlMinutes=30);
// returns: { request_id, amount_usd, expires_at, status='pending' }

// 3. User approves in Gnosis Pay app (or agent confirms on behalf of user)
approveSpendRequest(approval.request_id);

// 4. Execute the approved spend
const result = await executeApprovedSpend({
  requestId: approval.request_id,
  amountUsd,
  merchant,
  purpose,
});
// returns: { success, tx_hash, gnosis_chain_tx, amount_usd, merchant, timestamp, error? }
```

**Features**
- Sandbox mode (`GNOSIS_PAY_SANDBOX=true`): mock all requests, no API calls
- In-memory approval store (in production, persist to control-plane DB)
- Approval requests expire after `ttlMinutes` (default: 30 min)
- Manual approval required for spends above threshold (configurable per agent)
- Auto-approve small transactions (e.g., <$100)

### 3. Travel Policy Enforcement (`src/policy/travel-policy.ts`)

**Policy Type**
```typescript
interface TravelPolicy {
  max_flight_price_usd: number;              // e.g. 5000
  max_hotel_price_per_night_usd: number;     // e.g. 400
  max_trip_total_usd: number;                // e.g. 10000
  allowed_cabin_classes: Array<...>;         // e.g. ECONOMY, PREMIUM_ECONOMY
  advance_booking_min_hours: number;         // e.g. 24
  approval_required_above_usd: number;       // e.g. 2500
  blocked_destinations: string[];            // IATA city codes
  allowed_destinations: string[];            // empty = all allowed
}
```

**Pre-built Policies**
- `DEFAULT_POLICY`: $5k flights, $400/night hotels, $10k trip max, auto-approve <$2.5k
- `ENTERPRISE_POLICY`: $20k flights, $1k/night, $50k trip, auto-approve <$10k

**Policy Checking**
```typescript
const result = checkFlightPolicy(flight, policy);
// returns: { allowed: boolean, requires_approval: boolean, violations: string[], warnings: string[] }

const result = checkHotelPolicy(hotel, nights, policy);
const result = checkTripPolicy(flightPrice, hotelPrice, policy);
```

### 4. MCP Tools (`src/tools/index.ts`)

**5 Tools Exposed to Agents**

1. **`search_travel_options`** (flights)
   - Input: origin, destination, departure_date, adults, max_price_usd
   - Output: list of 10 flights with ID, price, duration, carrier
   - Uses: Amadeus flight search

2. **`search_hotels`**
   - Input: city_code, check_in/out dates, adults, max_price_usd
   - Output: list of 10 hotels with name, price, room type
   - Uses: Amadeus hotel search

3. **`build_itinerary`**
   - Input: flight_id, hotel_id (optional), notes
   - Output: itinerary_id, status='draft'
   - Does NOT charge yet — just picks flights/hotels and applies policy checks

4. **`request_booking_approval`**
   - Input: itinerary_id, approval_expires_minutes
   - Output: request_id, amount_usd, expires_at, next_step
   - Does: calls `requestSpendApproval()`, saves approval to itinerary

5. **`book_flight`**
   - Input: itinerary_id, approval_request_id, travelers (details), contact_email
   - Output: booking_ref, pnr, total_paid_usd, gnosis_pay_tx
   - Does: executes Gnosis Pay spend → calls provider.bookFlight() → saves booking ref

**All tools include Zod schema validation** (e.g., `SearchFlightsInputSchema`, `BookFlightInputSchema`)

### 5. Type System (`src/types/index.ts`)

**Shared types used throughout bundle**
- `FlightSegment`: departure/arrival airport, carrier, flight number, duration
- `FlightOffer`: price breakdown, itineraries, numberOfBookableSeats, bookingToken
- `BookedFlight`: confirmation ref, PNR, status, total paid, optional Gnosis Pay tx
- `HotelOffer`: hotel name, city code, check-in/out, price, room type, bookingToken
- `BookedHotel`: booking ref, hotel name, dates, total paid, optional Gnosis Pay tx
- `SpendAvailability`: available flag, spending_limit_usd, spent_today_usd, remaining_usd, card_status
- `SpendApprovalRequest`: request_id, amount_usd, merchant, purpose, expires_at, status
- `SpendResult`: success flag, tx_hash, gnosis_chain_tx, amount_usd, merchant, timestamp, error
- `TravelPolicy`: spending limits, destinations, approval thresholds
- `PolicyCheckResult`: allowed, requires_approval, violations[], warnings[]
- `TravelItinerary`: itinerary_id, status, flights[], hotels[], total_usd, policy_check, approval

## Integration with Control Plane

**Updated Files**
- `src/db/memory.ts`: `BundleName` type now includes `'travel-crypto-pro'`
- `src/server/schemas.ts`: `BundleSchema` enum now includes `'travel-crypto-pro'`
- `src/services/tier.ts`: All tiers now include `'travel-crypto-pro'` in `bundles_included`

**What This Means**
- When an agent is deployed with `bundles: ['travel-crypto-pro', ...]`, the control plane will:
  1. Install `@clawdrop/travel-crypto-pro` npm package in the agent's Docker container
  2. Load the 5 MCP tools via the bundle's `index.ts` export
  3. Pass tool definitions to Claude
  4. Route tool calls to bundle handlers

## Environment Variables

**Required (Amadeus Sandbox)**
```bash
AMADEUS_CLIENT_ID=<your-client-id>
AMADEUS_CLIENT_SECRET=<your-client-secret>
AMADEUS_ENV=test  # 'test' = sandbox, 'production' = live API
```

Get free sandbox credentials: https://developers.amadeus.com/register (instant approval)

**Optional (Gnosis Pay)**
```bash
GNOSIS_PAY_API_KEY=<your-api-key>
GNOSIS_PAY_API_URL=https://api.gnosispay.com
GNOSIS_PAY_SANDBOX=true  # Use mock spending (no API calls)
```

Gnosis Pay requires partnership agreement for production. Sandbox mode works with mocks.

**Optional (Provider Selection)**
```bash
FLIGHT_PROVIDER=amadeus   # or 'duffel' (future)
HOTEL_PROVIDER=amadeus    # or 'booking' (future)
```

## Gold Path: Full Booking Flow

1. **Agent asks Claude**: "Book me a flight to NYC for May 20, staying 4 nights"

2. **Claude calls `search_travel_options`**
   ```
   origin: MAD, destination: NYC, departure: 2026-05-20, adults: 1
   ```
   → Returns 10 flights, cheapest $800

3. **Claude calls `search_hotels`**
   ```
   city_code: NYC, check_in: 2026-05-20, check_out: 2026-05-24, adults: 1
   ```
   → Returns 10 hotels, cheapest $350/night ($1400 total)

4. **Trip total**: $800 + $1400 = $2200

5. **Policy check**: Trip <$2500 threshold → auto-approve (no manual approval needed)

6. **Claude calls `build_itinerary`**
   ```
   flight_id: cheapest_flight, hotel_id: best_hotel, notes: "Direct flights preferred"
   ```
   → Returns `itinerary_123` with `status: draft`, `policy_check: { allowed: true }`

7. **Claude calls `request_booking_approval`**
   ```
   itinerary_id: itinerary_123
   ```
   → Returns approval request (though will auto-approve in this case)

8. **Claude calls `book_flight`**
   ```
   itinerary_id: itinerary_123,
   approval_request_id: req_xxx,
   travelers: [{ firstName: 'Alice', lastName: 'Smith', ... }],
   contact_email: 'alice@example.com'
   ```
   → Executes Gnosis Pay spend (agent's Safe wallet → merchant via Visa)
   → Calls Amadeus API to confirm flight booking
   → Returns booking ref + confirmation

9. **Result**: Agent receives booking confirmation with PNR, travel itinerary, and Gnosis Chain transaction proof

## Edge Cases Handled

1. **Spend request expires**: `requestSpendApproval(..., ttlMinutes=30)` auto-marks expired
2. **Manual approval required**: Trip >threshold → creates approval request, agent waits for user
3. **Insufficient funds**: `checkSpendAvailability()` checks balance before approval
4. **Provider swapping**: Implement new `FlightProvider` interface, register in `getFlightProvider()`
5. **Amadeus offer encoding**: Full offer is base64-encoded in bookingToken (Amadeus requirement)
6. **Hotel virtual card**: Placeholder for Gnosis Pay virtual Visa card in booking request

## Next Steps (Post-Scaffold)

1. **Wire into deployed agents**
   - Update `docker-ssh.ts` to install bundle: `npm install @clawdrop/travel-crypto-pro`
   - Pass Amadeus env vars to Docker container
   - Update agent's MCP tool definitions to include travel tools

2. **Gnosis Pay production setup**
   - Apply for Gnosis Pay partnership (requires business verification)
   - Integrate real Visa virtual card issuance
   - Update spending API endpoints

3. **Duffel provider** (after sandbox validation)
   - Implement `FlightProvider` for Duffel API
   - Richer content (schedules, seat maps, ancillaries)
   - Requires business approval

4. **Database persistence**
   - Move approval requests from in-memory to control-plane DB
   - Persist itineraries, booking refs, spend receipts

5. **End-to-end testing**
   - Deploy agent with `bundles: ['travel-crypto-pro']`
   - Execute full booking flow via Claude
   - Verify Amadeus bookings + Gnosis Pay mock spends

6. **Travel policy customization**
   - Allow per-agent policy overrides
   - Add DAOs/teams to manage multi-user policies
   - Audit trail for policy changes

## File Structure

```
packages/bundles/travel-crypto-pro/
├── src/
│   ├── types/index.ts                      # Shared type definitions
│   ├── providers/
│   │   ├── flights.ts                      # Flight provider abstraction + Amadeus
│   │   └── hotels.ts                       # Hotel provider abstraction + Amadeus
│   ├── payment/
│   │   └── gnosis-pay.ts                   # Spend approval + execution
│   ├── policy/
│   │   └── travel-policy.ts                # Policy enforcement
│   ├── tools/
│   │   └── index.ts                        # 5 MCP tools + Zod schemas
│   └── index.ts                            # Bundle entry point + metadata
├── package.json
├── tsconfig.json
└── README.md
```

## Code References

- **Entry point**: [`packages/bundles/travel-crypto-pro/src/index.ts`](../packages/bundles/travel-crypto-pro/src/index.ts)
- **Flights**: [`packages/bundles/travel-crypto-pro/src/providers/flights.ts`](../packages/bundles/travel-crypto-pro/src/providers/flights.ts)
- **Hotels**: [`packages/bundles/travel-crypto-pro/src/providers/hotels.ts`](../packages/bundles/travel-crypto-pro/src/providers/hotels.ts)
- **Gnosis Pay**: [`packages/bundles/travel-crypto-pro/src/payment/gnosis-pay.ts`](../packages/bundles/travel-crypto-pro/src/payment/gnosis-pay.ts)
- **Policies**: [`packages/bundles/travel-crypto-pro/src/policy/travel-policy.ts`](../packages/bundles/travel-crypto-pro/src/policy/travel-policy.ts)
- **Tools**: [`packages/bundles/travel-crypto-pro/src/tools/index.ts`](../packages/bundles/travel-crypto-pro/src/tools/index.ts)
- **Control plane updates**: `packages/control-plane/src/{db/memory.ts, server/schemas.ts, services/tier.ts}`

---

*Next: Wire into deployed agents and test end-to-end booking flow.*
