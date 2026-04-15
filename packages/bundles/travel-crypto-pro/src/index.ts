/**
 * Travel Crypto Pro Bundle
 *
 * Clawdrop capability bundle for AI agents handling travel bookings with crypto-native payments.
 * Integrates:
 *  - Amadeus flight & hotel search APIs
 *  - Gnosis Pay for spending (Visa card backed by Safe wallet)
 *  - Travel policy enforcement (spending limits, destinations, approval thresholds)
 *  - MCP tools for search, itinerary building, approval flow, and booking
 */

import { tools } from './tools/index.js';
export { tools };
export type { TravelItinerary, FlightOffer, HotelOffer, SpendAvailability } from './types/index.js';

/**
 * Bundle metadata for the Clawdrop control plane
 */
export const bundleMetadata = {
  name: 'travel-crypto-pro',
  version: '0.1.0',
  description: 'Flight & hotel booking with Gnosis Pay crypto spend',
  author: 'Clawdrop',
  toolCount: tools.length,
  requiredEnv: [
    'AMADEUS_CLIENT_ID',
    'AMADEUS_CLIENT_SECRET',
    // 'GNOSIS_PAY_API_KEY',  // optional; sandbox mode uses mocks
  ],
  optionalEnv: [
    'AMADEUS_ENV',          // 'test' (sandbox) or 'production'
    'FLIGHT_PROVIDER',      // default: 'amadeus'
    'HOTEL_PROVIDER',       // default: 'amadeus'
    'GNOSIS_PAY_SANDBOX',   // true for mock spending
    'GNOSIS_PAY_API_URL',
    'GNOSIS_PAY_API_KEY',
  ],
};

export default { bundleMetadata, tools };
