/**
 * Duffel API Types
 * Workflow: CreateOfferRequest → RetrieveOffers → PriceOffer → CreateOrder
 */

export interface DuffelPassenger {
  type: 'adult' | 'child' | 'infant_on_seat' | 'infant_on_lap';
  id?: string;
}

export interface DuffelSlice {
  origin: string; // IATA airport code
  destination: string; // IATA airport code
  departure_date: string; // YYYY-MM-DD
}

export interface CreateOfferRequestPayload {
  data: {
    passengers: DuffelPassenger[];
    slices: DuffelSlice[];
    cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
    return_offers?: boolean;
  };
}

export interface Airport {
  iata_code: string;
  name: string;
  city_name: string;
  time_zone: string;
  iata_country_code: string;
}

export interface Airline {
  iata_code: string;
  name: string;
  logo_symbol_url: string;
}

export interface Segment {
  id: string;
  origin: Airport;
  destination: Airport;
  departing_at: string; // ISO 8601
  arriving_at: string; // ISO 8601
  operating_carrier: Airline;
  marketing_carrier: Airline;
  operating_carrier_flight_number: string;
  aircraft: {
    iata_code: string;
    name: string;
  };
  duration: string; // PT5H30M format
  stops: any[];
  passengers: Array<{
    passenger_id: string;
    cabin_class: string;
    cabin: {
      marketing_name: string;
      name: string;
      amenities: {
        seat: { pitch: string; type: string };
        wifi: { available: boolean };
        power: { available: boolean };
      };
    };
    baggages: Array<{
      type: 'checked' | 'carry_on';
      quantity: number;
    }>;
  }>;
}

export interface Slice {
  id: string;
  segments: Segment[];
  fare_brand_name: string;
  origin: Airport;
  destination: Airport;
  duration: string; // PT9H15M
  conditions: {
    change_before_departure: boolean | null;
    advance_seat_selection: boolean;
    priority_boarding: boolean;
  };
}

export interface DuffelOffer {
  id: string;
  slices: Slice[];
  total_amount: string; // "129.99"
  total_currency: string; // "USD"
  base_amount: string;
  tax_amount: string;
  base_currency: string;
  tax_currency: string;
  created_at: string; // ISO 8601
  payment_required_by: string; // ISO 8601
  payment_requirements: {
    requires_instant_payment: boolean;
    payment_required_by: string;
  };
  supported_passenger_identity_document_types: string[];
  passenger_identity_documents_required: boolean;
  supported_loyalty_programmes: string[];
  total_emissions_kg: string;
  live_mode: boolean;
}

export interface CreateOfferRequestResponse {
  data: {
    id: string;
    offers: DuffelOffer[];
    created_at: string;
    updated_at: string;
  };
}

// Price offer request (before creating order)
export interface PriceOfferPayload {
  data: {
    offer_id: string;
    payments: Array<{
      type: 'balance' | 'card';
      amount: string;
      currency: string;
    }>;
  };
}

export interface PriceOfferResponse {
  data: {
    slices: Slice[];
    total_amount: string;
    base_amount: string;
    tax_amount: string;
    total_currency: string;
    valid_until: string; // ISO 8601
  };
}

// Order creation
export interface CreateOrderPayload {
  data: {
    type: 'instant' | 'hold';
    selected_offers: string[]; // offer IDs
    passengers: Array<{
      id: string;
      email: string;
      phone_number: string;
      given_name: string;
      family_name: string;
      born_at: string; // YYYY-MM-DD
      gender: 'male' | 'female';
      title?: 'mr' | 'mrs' | 'ms' | 'mx';
    }>;
    contact_details: {
      email_address: string;
      phone_number: string;
    };
  };
}

export interface Order {
  id: string;
  type: string;
  slices: Slice[];
  passengers: any[];
  total_amount: string;
  base_amount: string;
  tax_amount: string;
  total_currency: string;
  confirmation_url: string;
  created_at: string;
}

export interface CreateOrderResponse {
  data: Order;
}
