# travel-crypto-pro

**Travel capability bundle for Clawdrop agents** — Flight & hotel booking with Gnosis Pay crypto spend.

## Features

- **Flight Search**: Amadeus API integration for real-time flight availability
- **Hotel Search**: Amadeus hotel booking with flexible pricing
- **Gnosis Pay Integration**: Spend approval flow using Visa debit card backed by Safe wallet on Gnosis Chain
- **Travel Policy Enforcement**: Configurable spending limits, destination blocking, advance-booking requirements
- **MCP Tools**: 5 tools for agents (`search_travel_options`, `search_hotels`, `build_itinerary`, `request_booking_approval`, `book_flight`)

## Environment Setup

### Required (Amadeus)

```bash
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret
AMADEUS_ENV=test          # 'test' = sandbox, 'production' = live
```

Get free sandbox keys: https://developers.amadeus.com/register

### Optional (Gnosis Pay)

```bash
GNOSIS_PAY_API_KEY=your_api_key
GNOSIS_PAY_API_URL=https://api.gnosispay.com
GNOSIS_PAY_SANDBOX=true   # use mock data for testing
```

Gnosis Pay requires a partnership agreement for production access.

## Usage

### As a Clawdrop Bundle

When `travel-crypto-pro` is included in a deployed agent's bundles, the 5 travel MCP tools become available:

```typescript
// Agent can call:
await mcp.call('search_travel_options', {
  origin: 'MAD',
  destination: 'JFK',
  departure_date: '2026-05-15T09:00:00Z',
  adults: 2,
  max_price_usd: 3000,
});

// Returns top 10 flights with pricing
```

### Flow: Flight + Hotel Booking with Approval

1. **Search** → `search_travel_options` + `search_hotels`
2. **Build Itinerary** → `build_itinerary` (draft status, no spend yet)
3. **Policy Check** → Returns `requires_approval: true` if trip > threshold
4. **Request Approval** → `request_booking_approval` (creates Gnosis Pay spend request)
5. **User Approves** → User confirms via Gnosis Pay mobile/dashboard
6. **Book Flight** → `book_flight` (executes Gnosis Pay charge + provider booking)

### Example: Full Booking Flow

```typescript
// 1. Search
const flights = await mcp.call('search_travel_options', {
  origin: 'MAD',
  destination: 'NYC',
  departure_date: '2026-05-20T00:00:00Z',
  adults: 1,
});

const hotels = await mcp.call('search_hotels', {
  city_code: 'NYC',
  check_in_date: '2026-05-20',
  check_out_date: '2026-05-24',
  adults: 1,
});

// 2. Build itinerary (picks first flight + best hotel)
const itin = await mcp.call('build_itinerary', {
  flight_id: flights.flights[0].id,
  hotel_id: hotels.hotels[0].id,
});

// 3. Check if approval needed
if (itin.policy_check.requires_approval) {
  const approval = await mcp.call('request_booking_approval', {
    itinerary_id: itin.itinerary_id,
    approval_expires_minutes: 30,
  });
  console.log(`Waiting for user approval: ${approval.request_id}`);
  // Agent pauses here — user approves in Gnosis Pay app
}

// 4. Book (once approval is confirmed)
const booking = await mcp.call('book_flight', {
  itinerary_id: itin.itinerary_id,
  approval_request_id: approval.request_id,
  travelers: [{
    firstName: 'Alice',
    lastName: 'Smith',
    dateOfBirth: '1990-01-15',
    gender: 'FEMALE',
    emailAddress: 'alice@example.com',
    phone: '+1-555-0123',
    documentType: 'PASSPORT',
    documentNumber: 'AB1234567',
    documentExpiry: '2030-01-15',
    issuanceCountry: 'ES',
    nationality: 'ES',
  }],
  contact_email: 'alice@example.com',
});

console.log(`Booked! Ref: ${booking.booking_ref}, Paid: $${booking.total_paid_usd} USD`);
```

## Provider Abstraction

Both flight and hotel APIs use provider abstractions to allow swapping implementations:

### Flights

- **Amadeus** (default) — Instant sandbox access, comprehensive flights
- **Duffel** (future) — Richer content, requires business approval

Set `FLIGHT_PROVIDER=duffel` to swap providers.

### Hotels

- **Amadeus** (default)
- **Booking.com** (future)
- **Duffel** (future)

Set `HOTEL_PROVIDER=booking` to swap providers.

## Travel Policy

Policies enforce spending limits and approval thresholds:

```typescript
import { DEFAULT_POLICY, ENTERPRISE_POLICY } from '@clawdrop/travel-crypto-pro';

const defaultPolicy = {
  max_flight_price_usd: 5_000,
  max_hotel_price_per_night_usd: 400,
  max_trip_total_usd: 10_000,
  allowed_cabin_classes: ['ECONOMY', 'PREMIUM_ECONOMY'],
  approval_required_above_usd: 2_500,  // Needs user approval if > $2500
};
```

Agents check policies before booking to decide if manual approval is needed.

## Gnosis Pay Integration

### What is Gnosis Pay?

A Visa debit card backed by a Safe multisig wallet on Gnosis Chain. Users hold EURe (euro stablecoin) — no bridges needed. Agents can request spend approval for purchases.

### Spending Flow

1. Check availability: `checkSpendAvailability(amount_usd)` → returns limit, spent today, remaining
2. Request approval: `requestSpendApproval(amount, merchant, purpose)` → creates approval request with TTL
3. User approves: Gnosis Pay mobile app or agent dashboard
4. Execute spend: `executeApprovedSpend(request_id, amount, merchant)` → charges card, returns tx hash

### Sandbox Mode

Set `GNOSIS_PAY_SANDBOX=true` to use mock spend approval (always succeeds, no API calls).

## Architecture

```
packages/bundles/travel-crypto-pro/
├── src/
│   ├── types/index.ts              # Shared type definitions
│   ├── providers/
│   │   ├── flights.ts              # Flight provider abstraction + Amadeus impl
│   │   └── hotels.ts               # Hotel provider abstraction + Amadeus impl
│   ├── payment/
│   │   └── gnosis-pay.ts           # Spend approval + execution layer
│   ├── policy/
│   │   └── travel-policy.ts        # Policy enforcement + checking
│   ├── tools/
│   │   └── index.ts                # 5 MCP tools + Zod schemas
│   └── index.ts                    # Bundle entry point + metadata
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build
```

## Integration with Clawdrop

When a user deploys an agent with `bundles: ['travel-crypto-pro']`, the control plane:

1. Installs this package in the Docker container
2. Loads the MCP tools via the bundle's `index.ts`
3. Passes tool definitions to Claude
4. Routes tool calls to the bundle's handler

```typescript
// In control-plane/src/services/docker-ssh.ts:
// Installs bundle packages: `npm install @clawdrop/travel-crypto-pro`
```

## License

(To be determined per Clawdrop license)
