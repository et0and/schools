import { CloudflareBindings } from "../schema";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
};

export class RateLimitService {
  constructor(
    private env: CloudflareBindings,
    private config: RateLimitConfig = DEFAULT_CONFIG,
  ) {}

  private getKey(identifier: string): string {
    return `ratelimit:${identifier}`;
  }

  async checkRateLimit(
    identifier: string,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(identifier);
    const now = Date.now();

    try {
      const existing = await this.env.SCHOOLS_CACHE.get(key);
      let requestData: { count: number; resetTime: number };

      if (existing) {
        requestData = JSON.parse(existing);

        // Check if window has expired
        if (now > requestData.resetTime) {
          requestData = {
            count: 0,
            resetTime: now + this.config.windowMs,
          };
        }
      } else {
        requestData = {
          count: 0,
          resetTime: now + this.config.windowMs,
        };
      }

      const remaining = Math.max(
        0,
        this.config.maxRequests - requestData.count - 1,
      );
      const allowed = requestData.count < this.config.maxRequests;

      if (allowed) {
        requestData.count++;
        await this.env.SCHOOLS_CACHE.put(key, JSON.stringify(requestData), {
          expirationTtl: Math.ceil(this.config.windowMs / 1000),
        });
      }

      return {
        allowed,
        remaining,
        resetTime: requestData.resetTime,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }
  }

  async getRateLimitInfo(
    identifier: string,
  ): Promise<{ remaining: number; resetTime: number; total: number }> {
    const key = this.getKey(identifier);
    const now = Date.now();

    try {
      const existing = await this.env.SCHOOLS_CACHE.get(key);
      if (existing) {
        const requestData = JSON.parse(existing);

        if (now > requestData.resetTime) {
          return {
            remaining: this.config.maxRequests,
            resetTime: now + this.config.windowMs,
            total: this.config.maxRequests,
          };
        }

        return {
          remaining: Math.max(0, this.config.maxRequests - requestData.count),
          resetTime: requestData.resetTime,
          total: this.config.maxRequests,
        };
      }
    } catch (error) {
      console.error("Error getting rate limit info:", error);
    }

    return {
      remaining: this.config.maxRequests,
      resetTime: now + this.config.windowMs,
      total: this.config.maxRequests,
    };
  }
}
