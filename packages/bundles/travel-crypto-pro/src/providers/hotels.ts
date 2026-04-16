/**
 * Hotel provider abstraction
 *
 * First implementation: Amadeus Hotel Search API
 * Future: Booking.com, Duffel (when approved)
 */

import type { HotelOffer, BookedHotel } from '../types/index.js';

// ─── Provider interface ────────────────────────────────────────────────────────

export interface HotelSearchParams {
  cityCode: string;      // IATA city code: "NYC", "LON", "MAD"
  checkInDate: string;   // YYYY-MM-DD
  checkOutDate: string;  // YYYY-MM-DD
  adults: number;
  roomQuantity?: number;
  maxPriceUsd?: number;
  maxResults?: number;
  ratings?: Array<'1' | '2' | '3' | '4' | '5'>;
}

export interface HotelBookParams {
  bookingToken: string;
  guestFirstName: string;
  guestLastName:  string;
  guestEmail:     string;
  guestPhone:     string;
  paymentMethod:  'gnosis_pay' | 'credit_card';
}

export interface HotelProvider {
  name: string;
  searchHotels(params: HotelSearchParams): Promise<HotelOffer[]>;
  bookHotel(params: HotelBookParams): Promise<BookedHotel>;
  getBooking(ref: string): Promise<BookedHotel | null>;
}

// ─── Amadeus implementation ───────────────────────────────────────────────────

class AmadeusHotelProvider implements HotelProvider {
  readonly name = 'amadeus';
  private client: any = null;

  private async getClient() {
    if (this.client) return this.client;

    const clientId     = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        'Amadeus credentials not configured. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET.'
      );
    }

    const { Amadeus } = await import('amadeus');
    this.client = new Amadeus({
      clientId,
      clientSecret,
      hostname: (process.env.AMADEUS_ENV || 'test') as 'test' | 'production',
    });
    return this.client;
  }

  async searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
    const amadeus = await this.getClient();

    // Step 1: Get hotel list for city
    const hotelListResp = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: params.cityCode,
    });

    const hotelIds: string[] = (hotelListResp.data || [])
      .slice(0, Math.min(params.maxResults ?? 20, 100))
      .map((h: any) => h.hotelId);

    if (hotelIds.length === 0) return [];

    // Step 2: Get offers for those hotels
    const offersParams: Record<string, unknown> = {
      hotelIds:    hotelIds.join(','),
      checkInDate:  params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults:       params.adults,
      roomQuantity: params.roomQuantity ?? 1,
      currency:    'USD',
      bestRateOnly: true,
    };

    if (params.maxPriceUsd) offersParams.priceRange = `0-${params.maxPriceUsd}`;
    if (params.ratings)     offersParams.ratings     = params.ratings.join(',');

    const offersResp = await amadeus.shopping.hotelOffersSearch.get(offersParams);

    return (offersResp.data || []).map((raw: any) => this.mapHotelOffer(raw, params));
  }

  private mapHotelOffer(raw: any, params: HotelSearchParams): HotelOffer {
    const offer = raw.offers?.[0];
    const price = parseFloat(offer?.price?.total ?? '0');

    return {
      id:           raw.hotel?.hotelId + '-' + (offer?.id ?? '0'),
      hotelId:      raw.hotel?.hotelId ?? '',
      name:         raw.hotel?.name ?? 'Unknown Hotel',
      cityCode:     raw.hotel?.cityCode ?? params.cityCode,
      checkIn:      offer?.checkInDate ?? params.checkInDate,
      checkOut:     offer?.checkOutDate ?? params.checkOutDate,
      price: {
        total:    price,
        currency: offer?.price?.currency ?? 'USD',
      },
      room: {
        type:        offer?.room?.typeEstimated?.category ?? offer?.room?.type ?? 'ROOM',
        description: offer?.room?.description?.text ?? '',
      },
      bookingToken: Buffer.from(JSON.stringify({ hotel: raw.hotel, offer })).toString('base64'),
    };
  }

  async bookHotel(params: HotelBookParams): Promise<BookedHotel> {
    const amadeus = await this.getClient();
    const { hotel, offer } = JSON.parse(
      Buffer.from(params.bookingToken, 'base64').toString('utf-8')
    );

    const body = {
      data: {
        offerId: offer.id,
        guests: [{
          name:    { firstName: params.guestFirstName, lastName: params.guestLastName, title: 'MR' },
          contact: { phone: params.guestPhone, email: params.guestEmail },
        }],
        payments: [{
          method:  'creditCard',
          // In production with Gnosis Pay, inject virtual card details here
          card: {
            vendorCode: 'VI',
            cardNumber:  process.env.GNOSIS_PAY_VIRTUAL_CARD_NUMBER ?? '4111111111111111',
            expiryDate: process.env.GNOSIS_PAY_VIRTUAL_CARD_EXPIRY ?? '2028-01',
          },
        }],
      },
    };

    const resp    = await amadeus.booking.hotelOrders.post(JSON.stringify(body));
    const booking = resp.data;

    return {
      booking_ref:    booking.id ?? `hotel-${Date.now()}`,
      hotel_name:     hotel?.name ?? 'Hotel',
      check_in:       offer?.checkInDate ?? '',
      check_out:      offer?.checkOutDate ?? '',
      total_paid_usd: parseFloat(offer?.price?.total ?? '0'),
    };
  }

  async getBooking(_ref: string): Promise<BookedHotel | null> {
    // Amadeus sandbox doesn't support GET on hotel orders; stub for now
    return null;
  }
}

// ─── Provider registry ─────────────────────────────────────────────────────────

const providers: Record<string, HotelProvider> = {
  amadeus: new AmadeusHotelProvider(),
};

export function getHotelProvider(name?: string): HotelProvider {
  const key = name ?? process.env.HOTEL_PROVIDER ?? 'amadeus';
  const provider = providers[key];
  if (!provider) throw new Error(`Unknown hotel provider: "${key}". Available: ${Object.keys(providers).join(', ')}`);
  return provider;
}
