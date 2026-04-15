# Amadeus Sandbox Setup & Testing Guide

**Date**: April 16, 2026  
**Status**: Ready to Execute  
**Owner**: Clawdrop Team  
**Purpose**: Prepare test credentials for Phase 2 deployment

---

## Overview

Amadeus provides a sandbox API for testing flight and hotel search without real bookings. This document walks through getting credentials and testing the travel bundle.

---

## Step 1: Create Amadeus Developer Account

### 1.1 Register for Free Account

**Website**: https://developers.amadeus.com/

**Process**:
1. Click "Register" (top right)
2. Email address
3. Password (8+ chars, numbers, special chars)
4. Company: "Clawdrop"
5. Verify email link

**Time**: ~5 minutes

### 1.2 Create App in Dashboard

**Steps**:
1. Log in to https://developers.amadeus.com/dashboard
2. Click "Create App"
3. Name: "clawdrop-travel-sandbox"
4. Environment: "Test" (sandbox)
5. Accept terms
6. Copy credentials (see next section)

**Result**: Two credentials
```
AMADEUS_CLIENT_ID=<your_client_id>
AMADEUS_CLIENT_SECRET=<your_client_secret>
```

**Store these safely** (not in git, use .env file)

---

## Step 2: Store Credentials Locally

### 2.1 Create Local .env File

**Location**: `/Users/mac/clawdrop/.env.local` (NOT committed)

**Content**:
```bash
# Amadeus Sandbox
AMADEUS_CLIENT_ID=your_client_id_here
AMADEUS_CLIENT_SECRET=your_client_secret_here
AMADEUS_ENV=test

# Gnosis Pay (sandbox mode - no real credentials needed)
GNOSIS_PAY_SANDBOX=true

# Solana (devnet - for testing payments)
SOLANA_RPC_URL=https://api.devnet.solana.com
HELIUS_API_KEY=your_helius_key_here_optional

# Control Plane
CLAWDROP_WALLET_ADDRESS=3TyBTeqqN5NpMicX6JXAVAHqUyYLqSNz4EMtQxM34yMw
```

### 2.2 Add to .gitignore

**Verify**: `.env.local` is already in `.gitignore`

```bash
cat /Users/mac/clawdrop/.gitignore | grep env.local
```

**If not present**, add:
```
.env.local
.env.*.local
```

---

## Step 3: Test Credentials Locally

### 3.1 Load Environment Variables

```bash
cd /Users/mac/clawdrop

# Load from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Verify
echo $AMADEUS_CLIENT_ID  # Should print your ID
echo $AMADEUS_ENV        # Should print "test"
```

### 3.2 Test Flight Search

**Using curl** (simple test):
```bash
curl -X POST https://test.api.amadeus.com/v1/security/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${AMADEUS_CLIENT_ID}" \
  -d "client_secret=${AMADEUS_CLIENT_SECRET}"
```

**Expected Response**:
```json
{
  "access_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 1799
}
```

If you get this, credentials are working! ✅

### 3.3 Test with Travel Bundle

Once credentials are confirmed:

```bash
cd /Users/mac/clawdrop/packages/bundles/travel-crypto-pro

# Build the bundle (once TypeScript is available)
npm run build

# Or run test directly (when available)
npm run test
```

---

## Step 4: Sandbox API Limits & Behavior

### 4.1 Flight Search - What's Available

**Sandbox Behavior**:
```
- Returns REAL flight data for testing dates
- Only historical dates + 1 year future
- No actual booking capability
- Rate limit: 10 requests/minute (vs 30/min production)
```

**Test Dates** (that always return results):
```
Departure: 2026-03-20 to 2026-03-27 (next month)
Popular routes: MAD, CDG, LHR, JFK, NRT, AUS
Always has results: JFK ↔ MAD, LHR ↔ CDG
```

### 4.2 Hotel Search - What's Available

**Sandbox Behavior**:
```
- Real hotel data from Amadeus inventory
- Current date + 1 year future
- Nightly rates are accurate (test prices)
- No booking capability
```

**Recommended Test Cities**:
```
- Madrid (MAD)
- Paris (PAR)
- London (LON)
- New York (NYC)
- Tokyo (NRT)
```

### 4.3 Post Booking Endpoint

**Not Available in Sandbox**:
```
❌ POST /v2/booking/flight-orders  (create booking)
❌ POST /v2/booking/flight-orders/{id}/tickets  (pay for booking)
```

**Why?**: No actual payments in sandbox.

**Workaround for Phase 1**:
```
✅ searchFlights() returns realistic offers
✅ buildItinerary() calculates costs
✅ requestSpendApproval() validates policy (uses Gnosis Pay sandbox)
✅ bookFlight() returns mock confirmation in sandbox mode
```

(Real bookings only available in Phase 2 with production credentials)

---

## Step 5: Key API Endpoints

### 5.1 Authentication

```bash
POST https://test.api.amadeus.com/v1/security/oauth2/token

# Returns access token valid for 30 minutes
```

### 5.2 Flight Search

```bash
GET https://test.api.amadeus.com/v2/shopping/flight-offers

Query Parameters:
  originLocationCode=JFK
  destinationLocationCode=MAD
  departureDate=2026-03-20
  returnDate=2026-03-27
  adults=1
  maxPrice=1000
  currencyCode=USD
```

**Response**:
```json
{
  "data": [
    {
      "id": "1",
      "source": "GDS",
      "instantTicketingRequired": false,
      "nonHomogeneous": false,
      "oneWay": false,
      "lastTicketingDate": "2026-03-20",
      "numberOfBookableSeats": 9,
      "itineraries": [
        {
          "duration": "PT14H30M",
          "segments": [
            {
              "departure": { "iataCode": "JFK", "at": "2026-03-20T10:30:00" },
              "arrival": { "iataCode": "MAD", "at": "2026-03-21T11:00:00" },
              "carrierCode": "BA",
              "number": "112",
              "aircraft": { "code": "789" },
              "operating": { "carrierCode": "BA" },
              "stops": [{ "iataCode": "LHR", "duration": "PT02H30M" }],
              "class": "Y"
            }
          ]
        }
      ],
      "price": {
        "currency": "USD",
        "total": "550.00",
        "base": "450.00",
        "fees": [{ "amount": "0.00", "type": "SUPPLIER" }],
        "grandTotal": "550.00"
      },
      "pricingOptions": {
        "fareType": ["PUBLISHED"],
        "includedCheckedBagsOnly": true
      },
      "validatingAirlineCodes": ["BA"],
      "travelerPricings": [
        {
          "travelerId": "1",
          "fareOption": "PUBLISHED",
          "travelerType": "ADULT",
          "price": {
            "currency": "USD",
            "total": "550.00",
            "base": "450.00"
          },
          "fareDetailsBySegment": [
            {
              "segmentId": "1",
              "cabin": "ECONOMY",
              "fareBasis": "ULXF2ON",
              "class": "U",
              "includedCheckedBags": { "weight": 23, "weightUnit": "KG" }
            }
          ]
        }
      ]
    }
  ]
}
```

### 5.3 Hotel Search

```bash
GET https://test.api.amadeus.com/v3/shopping/hotel-offers

Query Parameters:
  cityCode=MAD
  checkInDate=2026-03-20
  checkOutDate=2026-03-27
  roomQuantity=1
  adults=1
  maxPrice=150
  currencyCode=USD
```

---

## Step 6: Testing Workflow

### 6.1 Manual Testing (cURL)

```bash
# 1. Get access token
TOKEN=$(curl -s -X POST https://test.api.amadeus.com/v1/security/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${AMADEUS_CLIENT_ID}" \
  -d "client_secret=${AMADEUS_CLIENT_SECRET}" | jq -r '.access_token')

echo "Token: $TOKEN"

# 2. Search flights
curl -s -X GET "https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=JFK&destinationLocationCode=MAD&departureDate=2026-03-20&adults=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {price, departure: .itineraries[0].segments[0].departure}'
```

**Expected Output**:
```json
{
  "price": { "currency": "USD", "total": "550.00" },
  "departure": { "iataCode": "JFK", "at": "2026-03-20T10:30:00" }
}
```

### 6.2 Automated Testing (TypeScript)

Once npm packages are installed, test via travel bundle:

```typescript
import { searchFlights } from '@clawdrop/travel-crypto-pro';

const flights = await searchFlights({
  origin: 'JFK',
  destination: 'MAD',
  departure_date: '2026-03-20T10:00:00Z',
  return_date: '2026-03-27T10:00:00Z',
  adults: 1,
  max_price_usd: 800,
});

console.log('Found flights:', flights.length);
flights.forEach(f => console.log(`  ${f.airline} ${f.flight_number}: $${f.price}`));
```

---

## Step 7: Common Sandbox Issues & Solutions

### Issue 1: "Invalid client ID"

**Cause**: Using wrong credentials format or missing from .env

**Solution**:
```bash
# Verify in .env.local
grep AMADEUS_CLIENT_ID .env.local

# If not there, add it
echo "AMADEUS_CLIENT_ID=your_id" >> .env.local
```

### Issue 2: "Invalid grant"

**Cause**: Client secret is wrong or credentials not loaded

**Solution**:
```bash
# Test manually first
curl -X POST https://test.api.amadeus.com/v1/security/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your_actual_id" \
  -d "client_secret=your_actual_secret"

# If that works, reload env variables in your terminal
source .env.local
```

### Issue 3: "No results found"

**Cause**: Invalid date, city code, or too restrictive filter

**Solution**:
```bash
# Use these guaranteed test routes
JFK → MAD (always has results for 2026-03 dates)
CDG ↔ LHR
NRT ↔ SFO

# Don't filter by price initially
# Don't use past dates (sandbox doesn't like them)
```

### Issue 4: "Rate limit exceeded"

**Cause**: Sandbox limits to 10 requests/minute

**Solution**:
```bash
# Wait 60 seconds before retrying
# Or add exponential backoff in your code
```

---

## Step 8: Production Credentials (Phase 2)

### When to Switch

- [ ] First agent deployed successfully
- [ ] Travel bundle tested with sandbox
- [ ] Amadeus account in good standing (30+ days)
- [ ] Ready for real bookings

### How to Switch

**In Amadeus Dashboard**:
1. Create new app (environment: "Production")
2. Request production API keys
3. Wait for approval (1-2 business days)
4. Switch AMADEUS_ENV=production
5. Update credentials in control plane

---

## Phase 1 vs Phase 2 vs Phase 3

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| Sandbox Testing | ✅ Yes | ✅ Yes | ✅ Yes |
| Real Flight Search | ✅ Yes | ✅ Yes | ✅ Yes |
| Real Hotel Search | ✅ Yes | ✅ Yes | ✅ Yes |
| Real Bookings | ❌ No | ✅ Yes | ✅ Yes |
| Real Payments | ❌ No | ✅ Yes | ✅ Yes |
| Alternative Providers | ❌ No | ❌ No | ✅ Duffel |
| Production Keys | ❌ No | ✅ Yes | ✅ Yes |
| Rate Limits | 10/min | 30/min | Unlimited |

---

## Checklist: Ready for Phase 2

- [ ] Amadeus account created
- [ ] Client ID and Secret copied
- [ ] Stored in `.env.local`
- [ ] `.env.local` in `.gitignore`
- [ ] Tested credentials with cURL
- [ ] Travel bundle can import (once npm available)
- [ ] At least one test flight search successful
- [ ] VPS 2 SSH fixed
- [ ] First agent deployed
- [ ] End-to-end booking test planned

---

## Next Steps

### Tomorrow (Phase 1 Completion)
1. Fix VPS 2 SSH (Option A from yesterday's plan)
2. Deploy first agent with travel bundle
3. Run flight search test with real Amadeus API

### Week 2 (Phase 2 Start)
1. Get production Amadeus credentials
2. Test real bookings in sandbox
3. Implement booking confirmation flow
4. Add database persistence

---

**Document Status**: ✅ Ready  
**Credentials Status**: ⏳ Awaiting user setup  
**Testing Status**: ⏳ Ready to execute tomorrow
