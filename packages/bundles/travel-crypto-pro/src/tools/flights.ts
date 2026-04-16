/**
 * Flight Search and Booking MCP Tool
 * Integrates Duffel provider with MCP protocol
 */

import { duffelProvider } from '../providers/duffel';

export const flightTools = {
  search_flights: {
    description: 'Search for flights using Duffel API',
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Departure airport IATA code (e.g., LAX, JFK)',
        },
        destination: {
          type: 'string',
          description: 'Arrival airport IATA code',
        },
        departure_date: {
          type: 'string',
          description: 'Departure date in YYYY-MM-DD format',
        },
        return_date: {
          type: 'string',
          description: 'Return date in YYYY-MM-DD format (optional, for round trips)',
        },
        passengers: {
          type: 'number',
          description: 'Number of passengers (default: 1)',
        },
        cabin_class: {
          type: 'string',
          enum: ['economy', 'premium_economy', 'business', 'first'],
          description: 'Cabin class preference',
        },
      },
      required: ['origin', 'destination', 'departure_date'],
    },
  },

  get_flight_details: {
    description: 'Get detailed information about a specific flight offer',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: {
          type: 'string',
          description: 'Flight offer ID from search results',
        },
      },
      required: ['offer_id'],
    },
  },

  price_flight: {
    description: 'Price a flight offer with payment method',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: {
          type: 'string',
          description: 'Flight offer ID',
        },
        total_amount: {
          type: 'string',
          description: 'Total price amount',
        },
        currency: {
          type: 'string',
          description: 'Currency code (e.g., USD, EUR)',
        },
      },
      required: ['offer_id', 'total_amount'],
    },
  },

  book_flight: {
    description: 'Book a flight with passenger details',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: {
          type: 'string',
          description: 'Flight offer ID to book',
        },
        given_name: {
          type: 'string',
          description: 'Passenger first name',
        },
        family_name: {
          type: 'string',
          description: 'Passenger last name',
        },
        email: {
          type: 'string',
          description: 'Passenger email',
        },
        phone: {
          type: 'string',
          description: 'Passenger phone number',
        },
        date_of_birth: {
          type: 'string',
          description: 'Passenger DOB in YYYY-MM-DD format',
        },
        gender: {
          type: 'string',
          enum: ['male', 'female'],
          description: 'Passenger gender',
        },
      },
      required: ['offer_id', 'given_name', 'family_name', 'email', 'phone', 'date_of_birth', 'gender'],
    },
  },
};

/**
 * Handle tool calls from MCP
 */
export async function handleFlightTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'search_flights': {
        const offers = await duffelProvider.searchFlights({
          origin: toolInput.origin as string,
          destination: toolInput.destination as string,
          departure_date: toolInput.departure_date as string,
          return_date: toolInput.return_date as string | undefined,
          passengers: (toolInput.passengers as number) || 1,
          cabin_class: toolInput.cabin_class as any,
        });

        return {
          success: true,
          count: offers.length,
          offers: offers.map((offer) => ({
            id: offer.id,
            price: `${offer.total_amount} ${offer.total_currency}`,
            airlines: offer.slices
              .flatMap((slice) =>
                slice.segments.map((seg) => seg.operating_carrier.name)
              )
              .join(' → '),
            departure: new Date(offer.slices[0].segments[0].departing_at).toISOString(),
            arrival: new Date(
              offer.slices[offer.slices.length - 1].segments[
                offer.slices[offer.slices.length - 1].segments.length - 1
              ].arriving_at
            ).toISOString(),
            duration: offer.slices.map((s) => s.duration).join(' + '),
            emissions: `${offer.total_emissions_kg}kg CO₂`,
          })),
        };
      }

      case 'get_flight_details': {
        // In production, would fetch from DB/cache
        return {
          success: true,
          message: 'Flight details retrieved',
          offer_id: toolInput.offer_id,
        };
      }

      case 'price_flight': {
        const priceData = await duffelProvider.priceOffer(
          toolInput.offer_id as string,
          toolInput.total_amount as string,
          (toolInput.currency as string) || 'USD'
        );

        return {
          success: true,
          price: {
            total: priceData.total_amount,
            currency: priceData.total_currency,
            valid_until: priceData.valid_until,
          },
        };
      }

      case 'book_flight': {
        const booking = await duffelProvider.createOrder(
          toolInput.offer_id as string,
          {
            offer_id: toolInput.offer_id as string,
            passenger_details: {
              given_name: toolInput.given_name as string,
              family_name: toolInput.family_name as string,
              email: toolInput.email as string,
              phone: toolInput.phone as string,
              date_of_birth: toolInput.date_of_birth as string,
              gender: toolInput.gender as any,
            },
            payment_method: 'card',
          }
        );

        return {
          success: true,
          order: {
            id: booking.id,
            confirmation_url: booking.confirmation_url,
            total: booking.total_amount,
            currency: booking.total_currency,
          },
        };
      }

      default:
        throw new Error(`Unknown flight tool: ${toolName}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
