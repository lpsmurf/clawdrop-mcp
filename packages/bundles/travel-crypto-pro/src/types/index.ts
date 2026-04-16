/**
 * Shared types for the travel-crypto-pro bundle
 */

// ─── Flight types ──────────────────────────────────────────────────────────────

export interface FlightSegment {
  departure: { airport: string; iataCode: string; at: string };   // ISO datetime
  arrival:   { airport: string; iataCode: string; at: string };
  carrierCode: string;
  flightNumber: string;
  duration: string;  // PT2H30M
}

export interface FlightOffer {
  id: string;
  source: 'amadeus' | 'duffel';
  price: {
    total: number;
    currency: string;
    breakdown: { base: number; taxes: number };
  };
  itineraries: Array<{ duration: string; segments: FlightSegment[] }>;
  numberOfBookableSeats: number;
  validatingAirlineCodes: string[];
  /** Opaque token passed back to book_flight — provider-specific */
  bookingToken: string;
}

export interface BookedFlight {
  booking_ref: string;
  pnr: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  flights: FlightSegment[];
  total_paid_usd: number;
  gnosis_pay_tx?: string;
}

// ─── Hotel types ───────────────────────────────────────────────────────────────

export interface HotelOffer {
  id: string;
  hotelId: string;
  name: string;
  cityCode: string;
  checkIn: string;
  checkOut: string;
  price: { total: number; currency: string };
  room: { type: string; description: string };
  bookingToken: string;
}

export interface BookedHotel {
  booking_ref: string;
  hotel_name: string;
  check_in: string;
  check_out: string;
  total_paid_usd: number;
  gnosis_pay_tx?: string;
}

// ─── Gnosis Pay types ─────────────────────────────────────────────────────────

export interface SpendAvailability {
  available: boolean;
  spending_limit_usd: number;
  spent_today_usd: number;
  remaining_usd: number;
  card_status: 'active' | 'frozen' | 'unissued';
}

export interface SpendApprovalRequest {
  request_id: string;
  amount_usd: number;
  merchant: string;
  purpose: string;
  expires_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface SpendResult {
  success: boolean;
  tx_hash?: string;
  gnosis_chain_tx?: string;
  amount_usd: number;
  merchant: string;
  timestamp: string;
  error?: string;
}

// ─── Travel policy types ──────────────────────────────────────────────────────

export interface TravelPolicy {
  max_flight_price_usd: number;
  max_hotel_price_per_night_usd: number;
  max_trip_total_usd: number;
  allowed_cabin_classes: Array<'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'>;
  advance_booking_min_hours: number;
  approval_required_above_usd: number;
  blocked_destinations: string[];  // IATA country codes
  allowed_destinations: string[];  // empty = all allowed
}

export interface PolicyCheckResult {
  allowed: boolean;
  requires_approval: boolean;
  violations: string[];
  warnings: string[];
}

// ─── Itinerary types ──────────────────────────────────────────────────────────

export interface TravelItinerary {
  itinerary_id: string;
  created_at: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'booked' | 'cancelled';
  flights: FlightOffer[];
  hotels: HotelOffer[];
  total_usd: number;
  policy_check: PolicyCheckResult;
  approval?: SpendApprovalRequest;
}
