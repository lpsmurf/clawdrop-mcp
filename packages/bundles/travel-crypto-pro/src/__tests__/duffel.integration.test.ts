/**
 * Duffel Integration Test
 * Tests end-to-end flight search workflow
 */

import DuffelFlightProvider from '../providers/duffel';

describe('Duffel Flight Provider', () => {
  let provider: DuffelFlightProvider;

  beforeAll(() => {
    // Verify environment
    if (!process.env.DUFFEL_API_TOKEN) {
      throw new Error('DUFFEL_API_TOKEN not set in environment');
    }
    provider = new DuffelFlightProvider();
  });

  test('should search flights LAX->JFK', async () => {
    const offers = await provider.searchFlights({
      origin: 'LAX',
      destination: 'JFK',
      departure_date: '2026-05-15',
      passengers: 1,
      cabin_class: 'economy',
    });

    expect(offers).toBeDefined();
    expect(Array.isArray(offers)).toBe(true);
    expect(offers.length).toBeGreaterThan(0);

    const firstOffer = offers[0];
    expect(firstOffer.id).toBeDefined();
    expect(firstOffer.total_amount).toBeDefined();
    expect(firstOffer.slices).toBeDefined();
    expect(firstOffer.slices.length).toBeGreaterThan(0);

    console.log(`✅ Found ${offers.length} flight offers`);
    console.log(`   Price: ${firstOffer.total_amount} ${firstOffer.total_currency}`);
    console.log(`   Emissions: ${firstOffer.total_emissions_kg}kg CO₂`);
  });

  test('should format offers for display', async () => {
    const offers = await provider.searchFlights({
      origin: 'LAX',
      destination: 'JFK',
      departure_date: '2026-05-15',
      passengers: 1,
    });

    const formatted = offers.slice(0, 3).map((o) => provider.formatOffer(o));
    console.log('\n📋 Sample Flight Offers:\n');
    formatted.forEach((f) => console.log(f + '\n'));
  });

  test('should price an offer', async () => {
    const offers = await provider.searchFlights({
      origin: 'LAX',
      destination: 'JFK',
      departure_date: '2026-05-15',
      passengers: 1,
    });

    const firstOffer = offers[0];
    const priceData = await provider.priceOffer(
      firstOffer.id,
      firstOffer.total_amount,
      firstOffer.total_currency
    );

    expect(priceData.total_amount).toBeDefined();
    expect(priceData.valid_until).toBeDefined();

    console.log(`✅ Price validated until: ${priceData.valid_until}`);
  });
});
