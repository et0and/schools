import type { School, SchoolsApiResponse } from "./schema";

const API_URL = "https://catalogue.data.govt.nz/api/3/action/datastore_search";
const RESOURCE_ID = "4b292323-9fcc-41f8-814b-3c7b19cf14b3";
const CACHE_KEY = "schools_data_v1";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export class CacheService {
  constructor(private kv: KVNamespace) {}

  async fetchFromExternalAPI(limit = 32000): Promise<School[]> {
    const url = `${API_URL}?resource_id=${RESOURCE_ID}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch schools data: ${response.status}`);
    }

    const data: SchoolsApiResponse = await response.json();

    if (!data.success) {
      throw new Error("External API returned success: false");
    }

    return data.result.records;
  }

  async getCachedData(): Promise<{ data: School[] | null; isStale: boolean }> {
    try {
      const cacheEntry = await this.kv.get(CACHE_KEY);
      if (!cacheEntry) {
        return { data: null, isStale: true };
      }

      const parsed = JSON.parse(cacheEntry);
      const lastUpdated = new Date(parsed.lastUpdated);
      const isStale = Date.now() - lastUpdated.getTime() > CACHE_TTL;

      return {
        data: parsed.data,
        isStale,
      };
    } catch (error) {
      console.error("Error reading from cache:", error);
      return { data: null, isStale: true };
    }
  }

  async setCachedData(data: School[]): Promise<void> {
    const cacheEntry = {
      data,
      lastUpdated: new Date().toISOString(),
      count: data.length,
    };

    await this.kv.put(CACHE_KEY, JSON.stringify(cacheEntry));
  }

  async getLastSyncInfo(): Promise<{
    lastSync: string | null;
    recordCount: number;
    isStale: boolean;
  }> {
    const { data, isStale } = await this.getCachedData();

    return {
      lastSync: data ? new Date().toISOString() : null, // Simplified - in real app you'd store this separately
      recordCount: data?.length || 0,
      isStale,
    };
  }
}

export class RateLimitService {
  constructor(private kv: KVNamespace) {}

  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    try {
      const existing = await this.kv.get(key);
      let requestData: { count: number; resetAt: number };

      if (existing) {
        requestData = JSON.parse(existing);

        // Check if window has expired
        if (now > requestData.resetAt) {
          requestData = {
            count: 0,
            resetAt: now + windowMs,
          };
        }
      } else {
        requestData = {
          count: 0,
          resetAt: now + windowMs,
        };
      }

      const remaining = Math.max(0, maxRequests - requestData.count - 1);
      const allowed = requestData.count < maxRequests;

      if (allowed) {
        requestData.count++;
        await this.kv.put(key, JSON.stringify(requestData), {
          expirationTtl: Math.ceil(windowMs / 1000),
        });
      }

      return {
        allowed,
        remaining,
        resetAt: requestData.resetAt,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }
  }
}
