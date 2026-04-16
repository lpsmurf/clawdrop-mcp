/**
 * Travel policy enforcement
 *
 * Policies define spending limits, allowed destinations, required advance booking, etc.
 * Agents can reference this to determine if a trip needs human approval.
 */

import type {
  TravelPolicy,
  PolicyCheckResult,
  FlightOffer,
  HotelOffer,
} from '../types/index.js';

// ─── Default policies ─────────────────────────────────────────────────────────

export const DEFAULT_POLICY: TravelPolicy = {
  max_flight_price_usd:        5_000,
  max_hotel_price_per_night_usd: 400,
  max_trip_total_usd:         10_000,
  allowed_cabin_classes:       ['ECONOMY', 'PREMIUM_ECONOMY'],
  advance_booking_min_hours:   24,
  approval_required_above_usd: 2_500,
  blocked_destinations:        [],
  allowed_destinations:        [],  // empty = all
};

export const ENTERPRISE_POLICY: TravelPolicy = {
  max_flight_price_usd:        20_000,
  max_hotel_price_per_night_usd: 1_000,
  max_trip_total_usd:         50_000,
  allowed_cabin_classes:       ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
  advance_booking_min_hours:   12,
  approval_required_above_usd: 10_000,
  blocked_destinations:        [],
  allowed_destinations:        [],
};

// ─── Policy checking ──────────────────────────────────────────────────────────

export function checkFlightPolicy(
  flight: FlightOffer,
  policy: TravelPolicy = DEFAULT_POLICY,
): PolicyCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  const flightPrice = flight.price.total;

  // Check price limits
  if (flightPrice > policy.max_flight_price_usd) {
    violations.push(`Flight $${flightPrice} exceeds max $${policy.max_flight_price_usd}`);
  }

  // Check cabin class (inferred from itinerary; for now assume economy unless explicitly marked)
  // TODO: parse seat class from flightOffer

  // Check advance booking
  const firstSegment = flight.itineraries?.[0]?.segments?.[0];
  if (firstSegment) {
    const departTime = new Date(firstSegment.departure.at).getTime();
    const hoursAdvance = (departTime - Date.now()) / (1000 * 60 * 60);
    if (hoursAdvance < policy.advance_booking_min_hours) {
      warnings.push(
        `Flight booked only ${Math.floor(hoursAdvance)}h in advance (min: ${policy.advance_booking_min_hours}h)`
      );
    }
  }

  // Check destinations (if using allowed list)
  if (policy.allowed_destinations.length > 0) {
    const lastSegment = flight.itineraries?.[flight.itineraries.length - 1]?.segments?.at(-1);
    const destCode = lastSegment?.arrival?.iataCode;
    if (destCode && !policy.allowed_destinations.includes(destCode)) {
      violations.push(`Destination ${destCode} not in allowed list`);
    }
  }

  // Check blocked destinations
  if (policy.blocked_destinations.length > 0) {
    const lastSegment = flight.itineraries?.[flight.itineraries.length - 1]?.segments?.at(-1);
    const destCode = lastSegment?.arrival?.iataCode;
    if (destCode && policy.blocked_destinations.includes(destCode)) {
      violations.push(`Destination ${destCode} is blocked`);
    }
  }

  const requiresApproval = flightPrice > policy.approval_required_above_usd;

  return {
    allowed: violations.length === 0,
    requires_approval: requiresApproval,
    violations,
    warnings,
  };
}

export function checkHotelPolicy(
  hotel: HotelOffer,
  nights: number,
  policy: TravelPolicy = DEFAULT_POLICY,
): PolicyCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  const pricePerNight = hotel.price.total / nights;
  const totalPrice = hotel.price.total;

  if (pricePerNight > policy.max_hotel_price_per_night_usd) {
    violations.push(`Hotel $${pricePerNight}/night exceeds max $${policy.max_hotel_price_per_night_usd}`);
  }

  if (totalPrice > policy.max_trip_total_usd) {
    violations.push(`Hotel ${nights} nights ($${totalPrice} total) exceeds trip max`);
  }

  // Check destination (hotel city code)
  if (policy.allowed_destinations.length > 0 && hotel.cityCode) {
    if (!policy.allowed_destinations.includes(hotel.cityCode)) {
      violations.push(`Destination ${hotel.cityCode} not in allowed list`);
    }
  }

  if (policy.blocked_destinations.length > 0 && hotel.cityCode) {
    if (policy.blocked_destinations.includes(hotel.cityCode)) {
      violations.push(`Destination ${hotel.cityCode} is blocked`);
    }
  }

  const requiresApproval = totalPrice > policy.approval_required_above_usd;

  return {
    allowed: violations.length === 0,
    requires_approval: requiresApproval,
    violations,
    warnings,
  };
}

export function checkTripPolicy(
  flightPrice: number,
  hotelPrice: number,
  policy: TravelPolicy = DEFAULT_POLICY,
): PolicyCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  const total = flightPrice + hotelPrice;

  if (total > policy.max_trip_total_usd) {
    violations.push(`Total trip $${total} exceeds max $${policy.max_trip_total_usd}`);
  }

  const requiresApproval = total > policy.approval_required_above_usd;

  return {
    allowed: violations.length === 0,
    requires_approval: requiresApproval,
    violations,
    warnings,
  };
}
