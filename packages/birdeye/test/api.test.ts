/**
 * Birdeye API Client Tests
 */
import { 
  getTokenMeta, 
  getTokenPrice, 
  getTrendingTokens, 
  getWalletTokens 
} from '../src/api.js';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  })),
}));

describe('Birdeye API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getTokenMeta calls correct endpoint', async () => {
    const axios = require('axios');
    const mockGet = jest.fn().mockResolvedValue({ data: { symbol: 'USDC' } });
    axios.create.mockReturnValue({ 
      get: mockGet,
      interceptors: { response: { use: jest.fn() } }
    });

    const result = await getTokenMeta('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(mockGet).toHaveBeenCalledWith('/token/meta?address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  test('getTokenPrice returns price data', async () => {
    const axios = require('axios');
    const mockData = { 
      price_usd: 1.00, 
      price_change_24h: 0.01 
    };
    const mockGet = jest.fn().mockResolvedValue({ data: mockData });
    axios.create.mockReturnValue({ 
      get: mockGet,
      interceptors: { response: { use: jest.fn() } }
    });

    const result = await getTokenPrice('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(result.price_usd).toBe(1.00);
  });
});
