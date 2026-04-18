/**
 * Tool Handler Tests
 */
import { handleToolCall } from '../src/tools/handler.js';
import * as api from '../src/api.js';
import { cache } from '../src/cache.js';

// Mock API module
jest.mock('../src/api.js');

describe('Tool Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.clear();
  });

  describe('get_token_analytics', () => {
    test('returns cached data if available', async () => {
      const mockData = {
        mint: 'TEST',
        symbol: 'TEST',
        name: 'Test Token',
        price_usd: 1.00,
        price_change_24h: 0.5,
      };
      cache.set('token:TEST', mockData, 300);

      const result = await handleToolCall('get_token_analytics', { mint: 'TEST' });
      expect(JSON.parse(result)).toEqual(mockData);
      expect(api.getTokenMeta).not.toHaveBeenCalled();
    });

    test('fetches and formats token data', async () => {
      (api.getTokenMeta as jest.Mock).mockResolvedValue({
        symbol: 'USDC',
        name: 'USD Coin',
        holder_count: 1000000,
        market_cap: 25000000000,
      });
      (api.getTokenPrice as jest.Mock).mockResolvedValue({
        price_usd: 1.00,
        price_change_24h: 0.01,
      });
      (api.getTokenOverview as jest.Mock).mockResolvedValue({
        volume_24h: 500000000,
        liquidity: 1500000000,
        num_holders: 1000000,
      });

      const result = await handleToolCall('get_token_analytics', { 
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' 
      });
      
      const parsed = JSON.parse(result);
      expect(parsed.symbol).toBe('USDC');
      expect(parsed.price_usd).toBe(1.00);
    });
  });

  describe('get_market_overview', () => {
    test('returns trending tokens', async () => {
      (api.getTrendingTokens as jest.Mock).mockResolvedValue({
        tokens: [
          { address: 'token1', symbol: 'TKN1', name: 'Token 1', price: 10, change24h: 5 },
          { address: 'token2', symbol: 'TKN2', name: 'Token 2', price: 20, change24h: -2 },
        ]
      });

      const result = await handleToolCall('get_market_overview', {});
      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(2);
      expect(parsed.tokens).toHaveLength(2);
    });
  });

  describe('get_wallet_analytics', () => {
    test('calculates portfolio value', async () => {
      (api.getWalletTokens as jest.Mock).mockResolvedValue({
        items: [
          { address: 'mint1', symbol: 'SOL', ui_amount: 10, value_usd: 1500 },
          { address: 'mint2', symbol: 'USDC', ui_amount: 500, value_usd: 500 },
        ]
      });

      const result = await handleToolCall('get_wallet_analytics', { 
        wallet: 'Wallet123' 
      });
      
      const parsed = JSON.parse(result);
      expect(parsed.total_value_usd).toBe(2000);
      expect(parsed.holdings).toHaveLength(2);
      expect(parsed.holdings[0].percentage_of_portfolio).toBe(75);
    });
  });

  test('throws error for unknown tool', async () => {
    await expect(handleToolCall('unknown_tool', {})).rejects.toThrow('Unknown tool');
  });
});
