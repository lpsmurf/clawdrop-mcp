/**
 * Flight provider abstraction
 * 
 * First implementation: Amadeus Self-Service API (instant sandbox access)
 * Future: Duffel (requires business approval, richer content)
 *
 * To add a new provider, implement FlightProvider and register in getProvider().
 */

import type { FlightOffer, BookedFlight } from '../types/index.js';

// ─── Provider interface ────────────────────────────────────────────────────────

export interface FlightSearchParams {
  originLocationCode: string;        // IATA: "MAD"
  destinationLocationCode: string;   // IATA: "JFK"
  departureDate: string;             // YYYY-MM-DD
  returnDate?: string;               // YYYY-MM-DD (optional, round-trip)
  adults: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  maxResults?: number;
  maxPriceUsd?: number;
}

export interface FlightBookParams {
  bookingToken: string;
  travelers: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;      // YYYY-MM-DD
    gender: 'MALE' | 'FEMALE';
    emailAddress: string;
    phone: string;
    documentType: 'PASSPORT' | 'ID_CARD';
    documentNumber: string;
    documentExpiry: string;   // YYYY-MM-DD
    issuanceCountry: string;  // ISO 3166-1 alpha-2
    nationality: string;
  }>;
  contactEmail: string;
}

export interface FlightProvider {
  name: string;
  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
  bookFlight(params: FlightBookParams): Promise<BookedFlight>;
  getBooking(ref: string): Promise<BookedFlight | null>;
}

// ─── Amadeus implementation ───────────────────────────────────────────────────

class AmadeusProvider implements FlightProvider {
  readonly name = 'amadeus';
  private client: any = null;

  private async getClient() {
    if (this.client) return this.client;

    const clientId     = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        'Amadeus credentials not configured. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET. ' +
        'Get free sandbox keys at: https://developers.amadeus.com/register'
      );
    }

    // Dynamic import so the module is optional until travel bundle is active
    const { Amadeus } = await import('amadeus');
    this.client = new Amadeus({
      clientId,
      clientSecret,
      // 'test' for sandbox, 'production' for live
      hostname: (process.env.AMADEUS_ENV || 'test') as 'test' | 'production',
    });
    return this.client;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const amadeus = await this.getClient();

    const searchParams: Record<string, unknown> = {
      originLocationCode:      params.originLocationCode,
      destinationLocationCode: params.destinationLocationCode,
      departureDate:           params.departureDate,
      adults:                  params.adults,
      max:                     params.maxResults ?? 10,
      currencyCode:            'USD',
    };

    if (params.returnDate)  searchParams.returnDate  = params.returnDate;
    if (params.travelClass) searchParams.travelClass = params.travelClass;
    if (params.maxPriceUsd) searchParams.maxPrice    = params.maxPriceUsd;

    const response = await amadeus.shopping.flightOffersSearch.get(searchParams);

    return (response.data || []).map((raw: any, idx: number) =>
      this.mapAmadeusOffer(raw, idx, response.dictionaries)
    );
  }

  private mapAmadeusOffer(raw: any, idx: number, dicts: any): FlightOffer {
    const itineraries = (raw.itineraries || []).map((itin: any) => ({
      duration: itin.duration,
      segments: (itin.segments || []).map((seg: any) => ({
        departure:    {
          airport:  dicts?.locations?.[seg.departure.iataCode]?.cityCode ?? seg.departure.iataCode,
          iataCode: seg.departure.iataCode,
          at:       seg.departure.at,
        },
        arrival:      {
          airport:  dicts?.locations?.[seg.arrival.iataCode]?.cityCode ?? seg.arrival.iataCode,
          iataCode: seg.arrival.iataCode,
          at:       seg.arrival.at,
        },
        carrierCode:   seg.carrierCode,
        flightNumber:  seg.number,
        duration:      seg.duration,
      })),
    }));

    const total  = parseFloat(raw.price?.grandTotal ?? raw.price?.total ?? '0');
    const base   = parseFloat(raw.price?.base ?? '0');
    const taxes  = total - base;

    return {
      id:                    raw.id ?? `amadeus-${idx}`,
      source:                'amadeus',
      price: {
        total,
        currency:   raw.price?.currency ?? 'USD',
        breakdown:  { base, taxes },
      },
      itineraries,
      numberOfBookableSeats: raw.numberOfBookableSeats ?? 9,
      validatingAirlineCodes: raw.validatingAirlineCodes ?? [],
      // Encode the full raw offer as the booking token (Amadeus requires it for booking)
      bookingToken: Buffer.from(JSON.stringify(raw)).toString('base64'),
    };
  }

  async bookFlight(params: FlightBookParams): Promise<BookedFlight> {
    const amadeus  = await this.getClient();
    const rawOffer = JSON.parse(Buffer.from(params.bookingToken, 'base64').toString('utf-8'));

    const travelers = params.travelers.map((t, idx) => ({
      id:      String(idx + 1),
      dateOfBirth: t.dateOfBirth,
      gender:  t.gender,
      contact: {
        emailAddress: t.emailAddress,
        phones: [{ deviceType: 'MOBILE', countryCallingCode: '1', number: t.phone }],
      },
      name:    { firstName: t.firstName, lastName: t.lastName },
      documents: [{
        documentType:   t.documentType,
        number:         t.documentNumber,
        expiryDate:     t.documentExpiry,
        issuanceCountry: t.issuanceCountry,
        nationality:    t.nationality,
        holder:         true,
      }],
    }));

    const response = await amadeus.booking.flightOrders.post(
      JSON.stringify({ data: { type: 'flight-order', flightOffers: [rawOffer], travelers } })
    );

    const order = response.data;
    const segments = order.flightOffers?.[0]?.itineraries?.[0]?.segments ?? [];

    return {
      booking_ref:    order.id,
      pnr:            order.associatedRecords?.[0]?.reference ?? order.id,
      status:         'confirmed',
      flights:        segments.map((seg: any) => ({
        departure:    { airport: '', iataCode: seg.departure.iataCode, at: seg.departure.at },
        arrival:      { airport: '', iataCode: seg.arrival.iataCode,   at: seg.arrival.at },
        carrierCode:  seg.carrierCode,
        flightNumber: seg.number,
        duration:     seg.duration,
      })),
      total_paid_usd: parseFloat(order.flightOffers?.[0]?.price?.grandTotal ?? '0'),
    };
  }

  async getBooking(ref: string): Promise<BookedFlight | null> {
    try {
      const amadeus  = await this.getClient();
      const response = await amadeus.booking.flightOrder(ref).get();
      const order    = response.data;
      const segments = order.flightOffers?.[0]?.itineraries?.[0]?.segments ?? [];
      return {
        booking_ref: order.id,
        pnr:         order.associatedRecords?.[0]?.reference ?? order.id,
        status:      'confirmed',
        flights:     segments.map((seg: any) => ({
          departure:    { airport: '', iataCode: seg.departure.iataCode, at: seg.departure.at },
          arrival:      { airport: '', iataCode: seg.arrival.iataCode,   at: seg.arrival.at },
          carrierCode:  seg.carrierCode,
          flightNumber: seg.number,
          duration:     seg.duration,
        })),
        total_paid_usd: parseFloat(order.flightOffers?.[0]?.price?.grandTotal ?? '0'),
      };
    } catch {
      return null;
    }
  }
}

// ─── Provider registry ─────────────────────────────────────────────────────────

const providers: Record<string, FlightProvider> = {
  amadeus: new AmadeusProvider(),
};

/** Returns the configured flight provider (default: amadeus) */
export function getFlightProvider(name?: string): FlightProvider {
  const key = name ?? process.env.FLIGHT_PROVIDER ?? 'amadeus';
  const provider = providers[key];
  if (!provider) throw new Error(`Unknown flight provider: "${key}". Available: ${Object.keys(providers).join(', ')}`);
  return provider;
}
