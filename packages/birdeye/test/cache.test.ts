/**
 * Cache Tests
 */
import { BirdeyeCache, CACHE_TTL } from '../src/cache.js';

describe('BirdeyeCache', () => {
  let cache: BirdeyeCache;

  beforeEach(() => {
    cache = new BirdeyeCache();
  });

  test('stores and retrieves data', () => {
    cache.set('test-key', { price: 100 }, 60);
    const result = cache.get('test-key');
    expect(result).toEqual({ price: 100 });
  });

  test('returns null for expired entries', () => {
    cache.set('expired-key', { price: 100 }, -1); // negative TTL = expired
    const result = cache.get('expired-key');
    expect(result).toBeNull();
  });

  test('returns null for missing keys', () => {
    const result = cache.get('missing-key');
    expect(result).toBeNull();
  });

  test('clear removes all entries', () => {
    cache.set('key1', { a: 1 }, 60);
    cache.set('key2', { b: 2 }, 60);
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });
});

describe('CACHE_TTL', () => {
  test('has correct TTL values', () => {
    expect(CACHE_TTL.PRICE).toBe(300);      // 5 min
    expect(CACHE_TTL.TRENDING).toBe(600);   // 10 min
    expect(CACHE_TTL.WALLET).toBe(300);     // 5 min
    expect(CACHE_TTL.META).toBe(3600);      // 1 hour
  });
});
