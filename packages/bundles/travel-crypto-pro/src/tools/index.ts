/**
 * Travel bundle MCP tools
 *
 * These 5 tools are surfaced to Claude when the travel-crypto-pro bundle is active.
 * They orchestrate flight search, hotel search, itinerary building, approval flow, and booking.
 */

import { z } from 'zod';
import type { Tool } from '../types/index.js';
import { getFlightProvider } from '../providers/flights.js';
import { getHotelProvider } from '../providers/hotels.js';
import {
  checkSpendAvailability,
  requestSpendApproval,
  approveSpendRequest,
  executeApprovedSpend,
  getApprovalRequest,
} from '../payment/gnosis-pay.js';
import {
  checkFlightPolicy,
  checkHotelPolicy,
  checkTripPolicy,
  DEFAULT_POLICY,
} from '../policy/travel-policy.js';
import type {
  FlightOffer,
  HotelOffer,
  TravelItinerary,
} from '../types/index.js';

// ─── Zod schemas for tool inputs/outputs ──────────────────────────────────────

export const SearchFlightsInputSchema = z.object({
  origin: z.string().length(3).toUpperCase().describe('IATA airport code, e.g. MAD, JFK, LHR'),
  destination: z.string().length(3).toUpperCase().describe('IATA airport code'),
  departure_date: z.string().datetime().describe('ISO 8601 datetime'),
  return_date: z.string().datetime().optional().describe('For round-trip flights'),
  adults: z.number().int().positive().describe('Number of adult passengers'),
  max_price_usd: z.number().positive().optional().describe('Filter flights by max price'),
});

export const SearchHotelsInputSchema = z.object({
  city_code: z.string().length(3).toUpperCase().describe('IATA city code, e.g. NYC, LON'),
  check_in_date: z.string().date().describe('YYYY-MM-DD'),
  check_out_date: z.string().date().describe('YYYY-MM-DD'),
  adults: z.number().int().positive(),
  max_price_usd: z.number().positive().optional(),
});

export const BuildItineraryInputSchema = z.object({
  flight_id: z.string().describe('ID from search_travel_options flight results'),
  hotel_id: z.string().optional().describe('ID from search_travel_options hotel results'),
  notes: z.string().optional(),
});

export const RequestBookingApprovalInputSchema = z.object({
  itinerary_id: z.string(),
  approval_expires_minutes: z.number().int().positive().default(30),
});

export const BookFlightInputSchema = z.object({
  itinerary_id: z.string(),
  approval_request_id: z.string(),
  travelers: z.array(z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string().date(),
    gender: z.enum(['MALE', 'FEMALE']),
    emailAddress: z.string().email(),
    phone: z.string(),
    documentType: z.enum(['PASSPORT', 'ID_CARD']),
    documentNumber: z.string(),
    documentExpiry: z.string().date(),
    issuanceCountry: z.string().length(2),
    nationality: z.string().length(2),
  })),
  contact_email: z.string().email(),
});

// ─── In-memory itinerary store (in production: use the control-plane DB) ─────

const itineraries = new Map<string, TravelItinerary>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Tool implementations ─────────────────────────────────────────────────────

export const searchFlights = {
  schema: SearchFlightsInputSchema,
  async handler(input: z.infer<typeof SearchFlightsInputSchema>) {
    const provider = getFlightProvider();
    const flights = await provider.searchFlights({
      originLocationCode: input.origin,
      destinationLocationCode: input.destination,
      departureDate: input.departure_date.split('T')[0],
      returnDate: input.return_date ? input.return_date.split('T')[0] : undefined,
      adults: input.adults,
      maxPriceUsd: input.max_price_usd,
      maxResults: 10,
    });

    return {
      found: flights.length,
      flights: flights.map(f => ({
        id: f.id,
        price_usd: f.price.total,
        duration_hours: f.itineraries[0]?.duration,
        carrier: f.validatingAirlineCodes?.[0] ?? 'Unknown',
      })),
    };
  },
};

export const searchHotels = {
  schema: SearchHotelsInputSchema,
  async handler(input: z.infer<typeof SearchHotelsInputSchema>) {
    const provider = getHotelProvider();
    const hotels = await provider.searchHotels({
      cityCode: input.city_code,
      checkInDate: input.check_in_date,
      checkOutDate: input.check_out_date,
      adults: input.adults,
      maxPriceUsd: input.max_price_usd,
      maxResults: 10,
    });

    return {
      found: hotels.length,
      hotels: hotels.map(h => ({
        id: h.id,
        name: h.name,
        price_usd: h.price.total,
        room: h.room.type,
      })),
    };
  },
};

export const buildItinerary = {
  schema: BuildItineraryInputSchema,
  async handler(input: z.infer<typeof BuildItineraryInputSchema>) {
    // TODO: fetch real flight/hotel from DB or cache
    const itineraryId = generateId('itin');

    const itinerary: TravelItinerary = {
      itinerary_id: itineraryId,
      created_at: new Date().toISOString(),
      status: 'draft',
      flights: [],
      hotels: [],
      total_usd: 0,
      policy_check: {
        allowed: true,
        requires_approval: false,
        violations: [],
        warnings: [],
      },
    };

    itineraries.set(itineraryId, itinerary);

    return { itinerary_id: itineraryId, status: 'draft' };
  },
};

export const requestBookingApproval = {
  schema: RequestBookingApprovalInputSchema,
  async handler(input: z.infer<typeof RequestBookingApprovalInputSchema>) {
    const itinerary = itineraries.get(input.itinerary_id);
    if (!itinerary) throw new Error(`Itinerary not found: ${input.itinerary_id}`);

    const spend = await requestSpendApproval(
      itinerary.total_usd,
      'Travel booking (flights + hotels)',
      `Itinerary ${input.itinerary_id}`,
      input.approval_expires_minutes,
    );

    itinerary.status = 'pending_approval';
    itinerary.approval = spend;
    itineraries.set(input.itinerary_id, itinerary);

    return {
      request_id: spend.request_id,
      amount_usd: spend.amount_usd,
      expires_at: spend.expires_at,
      next_step: 'User must approve via Gnosis Pay mobile app or agent dashboard',
    };
  },
};

export const bookFlight = {
  schema: BookFlightInputSchema,
  async handler(input: z.infer<typeof BookFlightInputSchema>) {
    const itinerary = itineraries.get(input.itinerary_id);
    if (!itinerary) throw new Error(`Itinerary not found`);

    const approval = getApprovalRequest(input.approval_request_id);
    if (!approval) throw new Error(`Approval request not found`);
    if (approval.status !== 'approved') throw new Error(`Approval not approved yet`);

    const provider = getFlightProvider();
    const flight = itinerary.flights[0];
    if (!flight) throw new Error('No flight in itinerary');

    // Execute the Gnosis Pay spend
    const spend = await executeApprovedSpend({
      requestId: input.approval_request_id,
      amountUsd: flight.price.total,
      merchant: 'Airlines',
      purpose: `Flight booking for itinerary ${input.itinerary_id}`,
    });

    if (!spend.success) throw new Error(`Spend failed: ${spend.error}`);

    // Book the flight
    const booked = await provider.bookFlight({
      bookingToken: flight.bookingToken,
      travelers: input.travelers,
      contactEmail: input.contact_email,
    });

    booked.gnosis_pay_tx = spend.gnosis_chain_tx;
    itinerary.status = 'booked';
    itineraries.set(input.itinerary_id, itinerary);

    return {
      success: true,
      booking_ref: booked.booking_ref,
      pnr: booked.pnr,
      total_paid_usd: booked.total_paid_usd,
      gnosis_pay_tx: booked.gnosis_pay_tx,
    };
  },
};

export const tools = [
  { name: 'search_travel_options', ...searchFlights },
  { name: 'search_hotels', ...searchHotels },
  { name: 'build_itinerary', ...buildItinerary },
  { name: 'request_booking_approval', ...requestBookingApproval },
  { name: 'book_flight', ...bookFlight },
];
