/**
 * Local Travel Bundle Test
 *
 * Tests the full travel booking flow:
 * 1. Search flights
 * 2. Search hotels
 * 3. Build itinerary
 * 4. Request spend approval
 * 5. Execute booking (sandbox mode)
 *
 * Run: npm run dev -- --import ./test-local.ts
 * Or:  AMADEUS_CLIENT_ID=xxx AMADEUS_CLIENT_SECRET=yyy GNOSIS_PAY_SANDBOX=true ts-node-esm test-local.ts
 */

import { tools } from './src/index.js';

async function runLocalTests() {
  console.log('\n🚀 Travel Bundle Local Test Suite\n');
  console.log('📋 Available tools:', tools.map(t => t.name).join(', '));
  console.log('\n');

  // Get tool handlers
  const searchFlights = tools.find(t => t.name === 'search_travel_options');
  const searchHotels = tools.find(t => t.name === 'search_hotels');
  const buildItinerary = tools.find(t => t.name === 'build_itinerary');
  const requestApproval = tools.find(t => t.name === 'request_booking_approval');
  const bookFlight = tools.find(t => t.name === 'book_flight');

  if (!searchFlights || !searchHotels || !buildItinerary || !requestApproval || !bookFlight) {
    console.error('❌ Missing required tools');
    process.exit(1);
  }

  try {
    // Test 1: Search Flights
    console.log('Test 1️⃣  Search Flights (NYC → MAD, March 20-27)');
    const flightInput = {
      origin: 'JFK',
      destination: 'MAD',
      departure_date: '2026-03-20T10:00:00Z',
      return_date: '2026-03-27T10:00:00Z',
      adults: 1,
      max_price_usd: 800,
    };

    let flightResult;
    try {
      flightResult = await searchFlights.execute(flightInput);
      console.log('✅ Flight search successful');
      console.log('   Result:', JSON.stringify(flightResult, null, 2).slice(0, 200));
    } catch (err) {
      console.error('⚠️  Flight search error (may be missing Amadeus credentials)');
      console.error('   Error:', err instanceof Error ? err.message : String(err));
      console.log('   💡 To test fully, set:');
      console.log('      AMADEUS_CLIENT_ID=<your_client_id>');
      console.log('      AMADEUS_CLIENT_SECRET=<your_client_secret>');
    }

    // Test 2: Search Hotels
    console.log('\nTest 2️⃣  Search Hotels (Madrid, March 20-27)');
    const hotelInput = {
      city_code: 'MAD',
      check_in_date: '2026-03-20',
      check_out_date: '2026-03-27',
      adults: 1,
      max_price_usd: 150,
    };

    let hotelResult;
    try {
      hotelResult = await searchHotels.execute(hotelInput);
      console.log('✅ Hotel search successful');
      console.log('   Result:', JSON.stringify(hotelResult, null, 2).slice(0, 200));
    } catch (err) {
      console.error('⚠️  Hotel search error (may be missing Amadeus credentials)');
      console.error('   Error:', err instanceof Error ? err.message : String(err));
    }

    // Test 3: Build Itinerary (with mock IDs)
    console.log('\nTest 3️⃣  Build Itinerary');
    const itineraryInput = {
      flight_id: 'FLIGHT_001',
      hotel_id: 'HOTEL_001',
      notes: 'Local test booking',
    };

    try {
      const itineraryResult = await buildItinerary.execute(itineraryInput);
      console.log('✅ Itinerary built successfully');
      console.log('   Itinerary ID:', itineraryResult.itinerary_id);
      console.log('   Total cost:', itineraryResult.total_cost_usd);

      // Test 4: Request Approval
      console.log('\nTest 4️⃣  Request Spend Approval');
      const approvalInput = {
        itinerary_id: itineraryResult.itinerary_id,
        approval_expires_minutes: 30,
      };

      try {
        const approvalResult = await requestApproval.execute(approvalInput);
        console.log('✅ Approval requested');
        console.log('   Approval ID:', approvalResult.approval_request_id);
        console.log('   Status:', approvalResult.status);
        console.log('   Required:', approvalResult.requires_explicit_approval ? 'YES' : 'NO');

        // Test 5: Book (in sandbox, this should succeed)
        console.log('\nTest 5️⃣  Book Flight (Sandbox Mode)');
        const bookInput = {
          itinerary_id: itineraryResult.itinerary_id,
          approval_request_id: approvalResult.approval_request_id,
          travelers: [
            {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-15',
              gender: 'MALE',
              emailAddress: 'john@example.com',
              phone: '+14155552671',
              documentType: 'PASSPORT',
              documentNumber: 'AB123456',
              documentExpiry: '2030-12-31',
              issuanceCountry: 'US',
              nationality: 'US',
            },
          ],
          contact_email: 'john@example.com',
        };

        try {
          const bookResult = await bookFlight.execute(bookInput);
          console.log('✅ Booking confirmed!');
          console.log('   Confirmation:', bookResult.confirmation_number);
          console.log('   Status:', bookResult.status);
        } catch (err) {
          console.error('⚠️  Booking error:', err instanceof Error ? err.message : String(err));
        }
      } catch (err) {
        console.error('⚠️  Approval error:', err instanceof Error ? err.message : String(err));
      }
    } catch (err) {
      console.error('⚠️  Itinerary error:', err instanceof Error ? err.message : String(err));
    }

    console.log('\n✅ Local test complete\n');
  } catch (err) {
    console.error('❌ Test suite error:', err);
    process.exit(1);
  }
}

// Run tests
runLocalTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
