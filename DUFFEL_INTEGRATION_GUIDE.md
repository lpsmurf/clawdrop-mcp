# Duffel Flight Provider Integration Guide

**Date**: 2026-04-16  
**Status**: ✅ Working  
**API Version**: v2  
**Test Credentials**: Configured in `.env.local`

## Overview

The travel-crypto-pro bundle now integrates with Duffel API for flight search and booking. This replaces the previously attempted Amadeus integration due to Amadeus requiring business registration.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tools (Claude)                        │
├─────────────────────────────────────────────────────────────┤
│  search_flights → get_flight_details → price_flight → book_flight
├─────────────────────────────────────────────────────────────┤
│              Flight Tools Handler (flights.ts)               │
├─────────────────────────────────────────────────────────────┤
│            Duffel Provider (providers/duffel.ts)             │
├─────────────────────────────────────────────────────────────┤
│                  Duffel API (https://api.duffel.com)         │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

```
packages/bundles/travel-crypto-pro/
├── src/
│   ├── types/
│   │   └── duffel.ts          ← Type definitions for all Duffel API responses
│   ├── providers/
│   │   └── duffel.ts          ← Provider implementation (search, price, book)
│   ├── tools/
│   │   └── flights.ts         ← MCP tool definitions and handlers
│   ├── __tests__/
│   │   └── duffel.integration.test.ts  ← Integration tests
│   └── index.ts               ← Bundle exports and status
└── .env.local                 ← Duffel API token (created)
```

## Duffel API Workflow

### 1. Create Offer Request (Search)
```
POST /air/offer_requests
→ Returns: Array of available flight offers
```

**Example Request:**
```json
{
  "data": {
    "passengers": [{"type": "adult"}],
    "slices": [
      {
        "origin": "LAX",
        "destination": "JFK",
        "departure_date": "2026-05-15"
      }
    ],
    "cabin_class": "economy"
  }
}
```

**Response Fields:**
- `id`: Offer ID (used for pricing/booking)
- `slices`: Array of journey segments
- `total_amount`: Price (e.g., "129.99")
- `total_currency`: Currency code (e.g., "USD")
- `payment_required_by`: Deadline to book
- `supported_passenger_identity_document_types`: Required docs

### 2. Price Offer (Validation)
```
POST /air/offers/pricing
→ Validates pricing and confirms payment method
```

### 3. Create Order (Booking)
```
POST /air/orders
→ Creates confirmed booking with passenger details
```

## Usage Examples

### Search Flights

```typescript
import { duffelProvider } from './providers/duffel';

const offers = await duffelProvider.searchFlights({
  origin: 'LAX',
  destination: 'JFK',
  departure_date: '2026-05-15',
  passengers: 1,
  cabin_class: 'economy',
});

console.log(`Found ${offers.length} flights`);
offers.forEach(offer => {
  console.log(`$${offer.total_amount} - ${offer.total_emissions_kg}kg CO₂`);
});
```

### Format for Display

```typescript
const formatted = offers.map(offer => duffelProvider.formatOffer(offer));
// Output:
// ✈️  F9 3216
// 📍 LAX → JFK
// ⏰ 2026-05-15 23:20 - 2026-05-16 06:55
// 💰 129.99 USD
// 🌿 222kg CO₂
```

### Price & Book

```typescript
// Price an offer
const priceData = await duffelProvider.priceOffer(
  offer.id,
  offer.total_amount,
  'USD'
);

// Create booking
const order = await duffelProvider.createOrder(
  offer.id,
  {
    offer_id: offer.id,
    passenger_details: {
      given_name: 'John',
      family_name: 'Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      date_of_birth: '1990-01-15',
      gender: 'male',
    },
    payment_method: 'card',
  }
);

console.log(`Booking confirmed: ${order.confirmation_url}`);
```

## Environment Setup

### .env.local
```
DUFFEL_API_TOKEN=DUFFEL_TEST_TOKEN_REDACTED
DUFFEL_API_BASE_URL=https://api.duffel.com
DUFFEL_VERSION=v2

FLIGHT_PROVIDER=duffel
HOTEL_PROVIDER=placeholder
```

### Load Environment
```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Provider will read DUFFEL_API_TOKEN from process.env
```

## Testing

### Unit Test Credentials
```bash
cd packages/bundles/travel-crypto-pro
DUFFEL_API_TOKEN=DUFFEL_TEST_TOKEN_REDACTED npm test
```

### Manual Test
```bash
# Source environment
export $(cat .env.local | xargs)

# Test script
node -e "
const { duffelProvider } = require('./dist/providers/duffel');
duffelProvider.searchFlights({
  origin: 'LAX',
  destination: 'JFK',
  departure_date: '2026-05-15',
  passengers: 1,
}).then(offers => {
  console.log('Found', offers.length, 'offers');
  console.log('Price:', offers[0].total_amount, offers[0].total_currency);
});
"
```

## API Limits & Constraints

| Constraint | Value | Notes |
|-----------|-------|-------|
| Rate Limit | 100 req/min | Test tier |
| Price Validity | ~15-30 min | Depends on offer |
| Search Results | Up to 20 offers | Per request |
| Segments | Up to 5 per request | Multi-city support |
| Passengers | Up to 9 | Adults, children, infants |
| Advance Booking | Min 1 day | Flights must be in future |

## Type Definitions

### DuffelOffer
```typescript
{
  id: string;
  slices: Slice[];
  total_amount: string;      // "129.99"
  total_currency: string;    // "USD"
  base_amount: string;
  tax_amount: string;
  created_at: string;        // ISO 8601
  payment_required_by: string;
  total_emissions_kg: string;
  live_mode: boolean;
}
```

### Slice (Segment of Journey)
```typescript
{
  id: string;
  segments: Segment[];
  origin: Airport;
  destination: Airport;
  duration: string;          // "PT9H15M"
  fare_brand_name: string;   // "Basic", "Premium"
  conditions: {
    change_before_departure: boolean;
    advance_seat_selection: boolean;
  };
}
```

### Segment (Individual Flight)
```typescript
{
  id: string;
  departing_at: string;      // ISO 8601
  arriving_at: string;
  duration: string;          // "PT4H35M"
  operating_carrier: Airline;
  aircraft: { iata_code: string; name: string };
  stops: any[];
  segments: Segment[];
  passengers: PassengerInfo[];
}
```

## Error Handling

### Common Errors

```
404 Not Found
→ Endpoint doesn't exist (check Duffel-Version header)

422 Validation Error
→ Invalid payload (check slices/passengers format)

401 Unauthorized
→ Invalid API token (check DUFFEL_API_TOKEN)

400 Bad Request
→ Invalid parameters (dates, airport codes, etc.)
```

### Retry Strategy
```typescript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Moving to Production

### Before Going Live

1. **Switch to Live API**
   ```bash
   DUFFEL_API_TOKEN=duffel_live_xxxxx  # Real live token
   DUFFEL_API_BASE_URL=https://api.duffel.com  # Already live
   ```

2. **Enable Real Payments**
   - Integrate Gnosis Pay with real Safe wallet
   - Add payment verification and receipt generation
   - Implement refund handling

3. **Add Passenger Validation**
   - Validate passport/ID numbers
   - Implement KYC verification
   - Store PII securely

4. **Monitor & Logging**
   - Log all flight searches
   - Track booking conversions
   - Monitor API failures

5. **Error Recovery**
   - Implement booking recovery (retry failed orders)
   - Store offer details for audit trail
   - Handle expired offers gracefully

## Phase 3 Multi-Provider Support

When ready to swap providers:

```typescript
// Switch provider by environment
const provider = process.env.FLIGHT_PROVIDER === 'amadeus'
  ? new AmadeusProvider()
  : process.env.FLIGHT_PROVIDER === 'skyscanner'
  ? new SkyscannerProvider()
  : new DuffelProvider();

// All implement same interface:
interface FlightProvider {
  searchFlights(params: FlightSearchParams): Promise<Offer[]>;
  getOffers(requestId: string): Promise<Offer[]>;
  priceOffer(offerId: string, amount: string): Promise<PricingData>;
  createOrder(offerId: string, details: BookingParams): Promise<Order>;
}
```

## Next Steps

1. **[In Progress]** Duffel integration working ✅
2. **[TODO]** Gnosis Pay payment integration
3. **[TODO]** End-to-end booking flow testing
4. **[TODO]** Hotel provider abstraction (similar pattern)
5. **[TODO]** Multi-destination trip planning
6. **[TODO]** Itinerary management & rebooking

## References

- Duffel API Docs: https://duffel.com/docs/api/overview/welcome
- API Reference: https://api.duffel.com/docs
- Test Credentials: Provided in `.env.local`
- Support: support@duffel.com

---

**Owner**: Build Team  
**Last Updated**: 2026-04-16  
**Status**: Ready for Phase 1 Agent Deployment
