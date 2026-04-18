/**
 * TTL Cache for Birdeye responses
 * 5 min for prices, 10 min for trends
 */
interface CacheEntry {
  data: any;
  expiresAt: number;
}

export class BirdeyeCache {
  private store = new Map<string, CacheEntry>();

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any, ttlSeconds: number) {
    this.store.set(key, { 
      data, 
      expiresAt: Date.now() + ttlSeconds * 1000 
    });
  }

  clear() {
    this.store.clear();
  }
}

// Singleton cache instance
export const cache = new BirdeyeCache();

// Cache TTLs
export const CACHE_TTL = {
  PRICE: 300,      // 5 minutes
  TRENDING: 600,   // 10 minutes
  WALLET: 300,     // 5 minutes
  META: 3600,      // 1 hour
};
