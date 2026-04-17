/**
 * Hotel Search and Booking MCP Tools (mock/sandbox implementation)
 *
 * Provides realistic demo data for:
 *   - search_hotels  — return 5 mock hotel results for any city
 *   - book_hotel     — mock booking confirmation with fee collection
 */

import { calculateBookingFee, collectFee } from '../../../control-plane/src/services/fee-collector.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockHotel {
  name: string;
  stars: number;
  price_per_night_usd: number;
  amenities: string[];
  address: string;
}

// ─── Mock hotel catalogue ─────────────────────────────────────────────────────

const MOCK_HOTELS: MockHotel[] = [
  {
    name: 'Marriott Marquis City Center',
    stars: 5,
    price_per_night_usd: 389,
    amenities: ['WiFi', 'Pool', 'Spa', 'Fitness Center', 'Restaurant', 'Room Service', 'Concierge'],
    address: '1 City Center Plaza, Downtown',
  },
  {
    name: 'Hilton Garden Inn',
    stars: 4,
    price_per_night_usd: 219,
    amenities: ['WiFi', 'Fitness Center', 'Restaurant', 'Business Center', 'Parking'],
    address: '450 Market Street, Midtown',
  },
  {
    name: 'Hyatt Regency',
    stars: 4,
    price_per_night_usd: 279,
    amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Bar', 'Concierge', 'Airport Shuttle'],
    address: '123 Grand Avenue, Financial District',
  },
  {
    name: 'The Boutique on Fifth',
    stars: 3,
    price_per_night_usd: 149,
    amenities: ['WiFi', 'Breakfast Included', 'Rooftop Terrace', 'Artisan Coffee Bar'],
    address: '501 Fifth Avenue, Arts District',
  },
  {
    name: 'Budget Suites Extended Stay',
    stars: 2,
    price_per_night_usd: 89,
    amenities: ['WiFi', 'Kitchenette', 'Laundry', 'Parking'],
    address: '2200 Highway Blvd, Near Airport',
  },
];

function nightsBetween(checkIn: string, checkOut: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / msPerDay));
}

function generateBookingToken(hotelName: string, checkIn: string, checkOut: string, pricePerNight: number): string {
  const payload = { hotelName, checkIn, checkOut, pricePerNight, ts: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// ─── search_hotels ────────────────────────────────────────────────────────────

export async function handleSearchHotels(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const city = (input.city as string) || 'Unknown City';
  const checkIn = (input.check_in as string) || new Date().toISOString().split('T')[0];
  const checkOut =
    (input.check_out as string) ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const guests = (input.guests as number) || 1;
  const maxPriceUsd = input.max_price_usd as number | undefined;

  const nights = nightsBetween(checkIn, checkOut);

  // Filter by price if requested, then keep up to 5 results
  let hotels = MOCK_HOTELS.filter(
    (h) => maxPriceUsd === undefined || h.price_per_night_usd <= maxPriceUsd
  );

  if (hotels.length === 0) {
    // Relax price filter but warn
    hotels = MOCK_HOTELS;
  }

  const results = hotels.map((h) => ({
    name: h.name,
    stars: h.stars,
    address: `${h.address}, ${city}`,
    price_per_night_usd: h.price_per_night_usd,
    total_usd: h.price_per_night_usd * nights,
    nights,
    guests,
    amenities: h.amenities,
    booking_token: generateBookingToken(h.name, checkIn, checkOut, h.price_per_night_usd),
  }));

  return {
    success: true,
    city,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    guests,
    count: results.length,
    hotels: results,
  };
}

// ─── book_hotel ───────────────────────────────────────────────────────────────

export async function handleBookHotel(
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const bookingToken = input.booking_token as string;
  const guestName = (input.guest_name as string) || 'Guest';
  const guestEmail = (input.guest_email as string) || '';
  const paymentMethod = (input.payment_method as string) || 'card';

  // Decode the token
  let hotelName = 'Hotel';
  let checkIn = '';
  let checkOut = '';
  let pricePerNight = 0;

  try {
    const decoded = JSON.parse(Buffer.from(bookingToken, 'base64').toString('utf-8'));
    hotelName = decoded.hotelName ?? hotelName;
    checkIn = decoded.checkIn ?? checkIn;
    checkOut = decoded.checkOut ?? checkOut;
    pricePerNight = decoded.pricePerNight ?? pricePerNight;
  } catch {
    // fallback — token malformed in dev/testing
    checkIn = new Date().toISOString().split('T')[0];
    checkOut = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    pricePerNight = 199;
  }

  const nights = nightsBetween(checkIn, checkOut);
  const totalUsd = pricePerNight * nights;

  // Non-blocking fee collection
  const feeCalc = calculateBookingFee(totalUsd);
  collectFee({
    type: 'booking',
    user_wallet: (input.wallet_address as string) || 'unknown',
    fee_sol: feeCalc.fee_sol,
    fee_usd_estimate: feeCalc.fee_usd_estimate,
    metadata: {
      booking_type: 'hotel',
      hotel_name: hotelName,
      check_in: checkIn,
      check_out: checkOut,
      booking_value_usd: totalUsd,
    },
  }).catch(() => {}); // non-blocking, never fails the booking

  const confirmationNumber = `CLW-HTL-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    confirmation_number: confirmationNumber,
    hotel_name: hotelName,
    guest_name: guestName,
    guest_email: guestEmail,
    payment_method: paymentMethod,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    total_usd: totalUsd,
    cancellation_policy: 'Free cancellation up to 48 hours before check-in. After that, 1 night charge applies.',
    platform_fee: {
      fee_sol: feeCalc.fee_sol,
      fee_usd_estimate: feeCalc.fee_usd_estimate,
    },
  };
}

// ─── Tool definitions (MCP schema) ────────────────────────────────────────────

export const searchHotelsTool = {
  name: 'search_hotels',
  description:
    'Search for available hotels in a city. Returns up to 5 options at different price points with amenities and booking tokens.',
  inputSchema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name (e.g. "New York", "Paris", "Tokyo")',
      },
      check_in: {
        type: 'string',
        description: 'Check-in date YYYY-MM-DD',
      },
      check_out: {
        type: 'string',
        description: 'Check-out date YYYY-MM-DD',
      },
      guests: {
        type: 'number',
        description: 'Number of guests (default: 1)',
      },
      max_price_usd: {
        type: 'number',
        description: 'Maximum price per night in USD (optional filter)',
      },
    },
    required: ['city', 'check_in', 'check_out'],
  },
};

export const bookHotelTool = {
  name: 'book_hotel',
  description:
    'Book a hotel using a booking_token from search_hotels. Returns a confirmation number and full booking details.',
  inputSchema: {
    type: 'object',
    properties: {
      booking_token: {
        type: 'string',
        description: 'Opaque booking token returned by search_hotels',
      },
      guest_name: {
        type: 'string',
        description: 'Full name of the primary guest',
      },
      guest_email: {
        type: 'string',
        description: 'Guest email address for confirmation',
      },
      payment_method: {
        type: 'string',
        description: 'Payment method: "card", "sol", or "usdc"',
      },
    },
    required: ['booking_token', 'guest_name', 'guest_email', 'payment_method'],
  },
};
