/**
 * In-memory sliding window rate limiter with temporary cooldowns
 * Supports IP-based and Account-based throttling.
 */

interface RateLimitRecord {
  timestamps: number[];
  cooldownUntil: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitRecord>();

  constructor() {
    // Periodic garbage collection every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (record.cooldownUntil < now && record.timestamps.length === 0) {
          this.store.delete(key);
        } else {
          // Remove timestamps older than 1 hour
          record.timestamps = record.timestamps.filter((t) => now - t < 60 * 60 * 1000);
          if (record.timestamps.length === 0 && record.cooldownUntil < now) {
            this.store.delete(key);
          }
        }
      }
    }, 5 * 60 * 1000).unref?.();
  }

  /**
   * Checks if an action is allowed under the rate limit.
   * If exceeded, applies a temporary cooldown.
   * 
   * @param key Unique identifier (e.g. `ip:${ip}` or `account:${normalizedIdentifier}`)
   * @param maxAttempts Maximum allowed attempts within window
   * @param windowMs Time window in milliseconds
   * @param cooldownMs Cooldown period in milliseconds if limit exceeded
   */
  check(
    key: string,
    maxAttempts: number,
    windowMs: number,
    cooldownMs: number = 5 * 60 * 1000
  ): {
    allowed: boolean;
    remaining: number;
    cooldownSecondsRemaining: number;
  } {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record) {
      record = { timestamps: [], cooldownUntil: 0 };
      this.store.set(key, record);
    }

    // Check if in active cooldown
    if (record.cooldownUntil > now) {
      const remainingSeconds = Math.ceil((record.cooldownUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        cooldownSecondsRemaining: remainingSeconds,
      };
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

    if (record.timestamps.length >= maxAttempts) {
      // Trigger temporary cooldown
      record.cooldownUntil = now + cooldownMs;
      const remainingSeconds = Math.ceil(cooldownMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        cooldownSecondsRemaining: remainingSeconds,
      };
    }

    return {
      allowed: true,
      remaining: maxAttempts - record.timestamps.length,
      cooldownSecondsRemaining: 0,
    };
  }

  /**
   * Records a failed attempt for the key.
   */
  recordFailure(key: string): void {
    const now = Date.now();
    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [], cooldownUntil: 0 };
      this.store.set(key, record);
    }
    record.timestamps.push(now);
  }

  /**
   * Resets the rate limit record for a key (e.g. on successful authentication).
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clears all records (useful for testing).
   */
  clear(): void {
    this.store.clear();
  }
}

export const authRateLimiter = new RateLimiter();
export const captchaRateLimiter = new RateLimiter();
