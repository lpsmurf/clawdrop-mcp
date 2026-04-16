/**
 * Travel Crypto Pro Bundle
 * Flight search, booking, and crypto payment integration
 * 
 * Provider Abstraction:
 * - Flight provider: Duffel (swappable to Amadeus, Skyscanner, etc.)
 * - Payment: Gnosis Pay (Safe wallet + Visa card)
 * 
 * MCP Workflow:
 * 1. search_flights - Find available flights
 * 2. get_flight_details - View specific flight details
 * 3. price_flight - Validate price and payment method
 * 4. book_flight - Create order with passenger info
 */

export { flightTools, handleFlightTool } from './tools/flights';
export { duffelProvider } from './providers/duffel';
export type {
  CreateOfferRequestPayload,
  CreateOfferRequestResponse,
  DuffelOffer,
  CreateOrderResponse,
} from './types/duffel';

// MCP tool definitions for registration
export const travelBundleTools = {
  'search_flights': {
    description: 'Search for flights by origin, destination, and date',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'IATA airport code (e.g., LAX)' },
        destination: { type: 'string', description: 'IATA airport code (e.g., JFK)' },
        departure_date: { type: 'string', description: 'YYYY-MM-DD format' },
        return_date: { type: 'string', description: 'Optional return date for round trips' },
        passengers: { type: 'number', description: 'Number of passengers (default: 1)' },
        cabin_class: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'] },
      },
      required: ['origin', 'destination', 'departure_date'],
    },
  },

  'book_flight': {
    description: 'Book a selected flight with passenger details and payment',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: { type: 'string' },
        given_name: { type: 'string' },
        family_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        date_of_birth: { type: 'string', description: 'YYYY-MM-DD' },
        gender: { type: 'string', enum: ['male', 'female'] },
      },
      required: ['offer_id', 'given_name', 'family_name', 'email', 'phone', 'date_of_birth', 'gender'],
    },
  },
};

// Version
export const VERSION = '0.1.0';

// Status
export function getStatus() {
  return {
    bundle: 'travel-crypto-pro',
    version: VERSION,
    provider: {
      flights: 'duffel',
      hotels: 'placeholder',
      payments: 'gnosis-pay',
    },
    status: 'beta',
    duffel_api: process.env.DUFFEL_API_TOKEN ? 'configured' : 'missing',
  };
}
