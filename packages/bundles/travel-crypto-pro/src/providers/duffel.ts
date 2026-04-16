/**
 * Duffel Flight Provider
 * Implements the multi-provider abstraction for flight search and booking
 * Workflow: Create Offer Request → Retrieve Offers → Price → Create Order
 */

import {
  CreateOfferRequestPayload,
  CreateOfferRequestResponse,
  DuffelOffer,
  PriceOfferPayload,
  PriceOfferResponse,
  CreateOrderPayload,
  CreateOrderResponse,
} from '../types/duffel';

interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
}

interface BookingParams {
  offer_id: string;
  passenger_details: {
    given_name: string;
    family_name: string;
    email: string;
    phone: string;
    date_of_birth: string; // YYYY-MM-DD
    gender: 'male' | 'female';
  };
  payment_method: 'card' | 'wallet';
}

class DuffelFlightProvider {
  private baseUrl: string;
  private apiToken: string;
  private apiVersion: string = 'v2';

  constructor() {
    this.baseUrl = process.env.DUFFEL_API_BASE_URL || 'https://api.duffel.com';
    this.apiToken = process.env.DUFFEL_API_TOKEN || '';

    if (!this.apiToken) {
      throw new Error('DUFFEL_API_TOKEN environment variable not set');
    }
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    payload?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Duffel-Version': this.apiVersion,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (payload) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Duffel API error (${response.status}): ${JSON.stringify(errorData)}`
      );
    }

    return response.json();
  }

  /**
   * Search for flights - creates an offer request and returns available offers
   */
  async searchFlights(params: FlightSearchParams): Promise<DuffelOffer[]> {
    // Build passengers array (all adults for now)
    const passengers = Array.from({ length: params.passengers }, () => ({
      type: 'adult',
    }));

    // Build slices
    const slices = [
      {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departure_date,
      },
    ];

    if (params.return_date) {
      slices.push({
        origin: params.destination,
        destination: params.origin,
        departure_date: params.return_date,
      });
    }

    const payload: CreateOfferRequestPayload = {
      data: {
        passengers,
        slices,
        cabin_class: params.cabin_class || 'economy',
      },
    };

    const response = await this.makeRequest<CreateOfferRequestResponse>(
      'POST',
      '/air/offer_requests',
      payload
    );

    return response.data.offers;
  }

  /**
   * Get offers for a specific search
   */
  async getOffers(offerRequestId: string): Promise<DuffelOffer[]> {
    const response = await this.makeRequest<CreateOfferRequestResponse>(
      'GET',
      `/air/offer_requests/${offerRequestId}`,
      null
    );

    return response.data.offers;
  }

  /**
   * Price an offer (validates pricing and payment method)
   */
  async priceOffer(
    offerId: string,
    amount: string,
    currency: string = 'USD'
  ): Promise<PriceOfferResponse['data']> {
    const payload: PriceOfferPayload = {
      data: {
        offer_id: offerId,
        payments: [
          {
            type: 'balance',
            amount,
            currency,
          },
        ],
      },
    };

    const response = await this.makeRequest<PriceOfferResponse>(
      'POST',
      '/air/offers/pricing',
      payload
    );

    return response.data;
  }

  /**
   * Create an order (book the flight)
   * Note: Full implementation requires real passenger data
   */
  async createOrder(
    offerId: string,
    bookingDetails: BookingParams
  ): Promise<CreateOrderResponse['data']> {
    const passengerId = 'pas_' + Math.random().toString(36).substr(2, 9);

    const payload: CreateOrderPayload = {
      data: {
        type: 'instant',
        selected_offers: [offerId],
        passengers: [
          {
            id: passengerId,
            email: bookingDetails.passenger_details.email,
            phone_number: bookingDetails.passenger_details.phone,
            given_name: bookingDetails.passenger_details.given_name,
            family_name: bookingDetails.passenger_details.family_name,
            born_at: bookingDetails.passenger_details.date_of_birth,
            gender: bookingDetails.passenger_details.gender,
          },
        ],
        contact_details: {
          email_address: bookingDetails.passenger_details.email,
          phone_number: bookingDetails.passenger_details.phone,
        },
      },
    };

    const response = await this.makeRequest<CreateOrderResponse>(
      'POST',
      '/air/orders',
      payload
    );

    return response.data;
  }

  /**
   * Format offer for display
   */
  formatOffer(offer: DuffelOffer): string {
    const firstSlice = offer.slices[0];
    const firstSegment = firstSlice.segments[0];
    const lastSegment = firstSlice.segments[firstSlice.segments.length - 1];

    return `
✈️  ${firstSegment.operating_carrier.iata_code} ${firstSegment.operating_carrier_flight_number}
📍 ${firstSegment.origin.iata_code} → ${lastSegment.destination.iata_code}
⏰ ${new Date(firstSegment.departing_at).toLocaleString()} - ${new Date(lastSegment.arriving_at).toLocaleString()}
💰 ${offer.total_amount} ${offer.total_currency}
🌿 ${offer.total_emissions_kg}kg CO₂
    `.trim();
  }
}

// Export singleton
export const duffelProvider = new DuffelFlightProvider();

export default DuffelFlightProvider;
