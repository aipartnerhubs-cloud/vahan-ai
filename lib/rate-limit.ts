import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Limiters = {
  tenMinutes: Ratelimit;
  daily: Ratelimit;
};

let cachedLimiters: Limiters | null = null;

export function isRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getRateLimiters(): Limiters | null {
  if (!isRateLimitConfigured()) {
    return null;
  }

  if (!cachedLimiters) {
    const redis = Redis.fromEnv();
    cachedLimiters = {
      tenMinutes: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '10 m'),
        prefix: 'vahan-ai:rc:user:10m',
      }),
      daily: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(200, '1 d'),
        prefix: 'vahan-ai:rc:user:1d',
      }),
    };
  }

  return cachedLimiters;
}


type PublicLimiters = {
  tenMinutes: Ratelimit;
  daily: Ratelimit;
};

let cachedPublicLimiters: PublicLimiters | null = null;

/**
 * Anonymous partner lookups are rate-limited by a server-derived client IP.
 * Public requests deliberately have tighter limits than authenticated agents.
 */
export function getPublicRateLimiters(): PublicLimiters | null {
  if (!isRateLimitConfigured()) return null;

  if (!cachedPublicLimiters) {
    const redis = Redis.fromEnv();
    cachedPublicLimiters = {
      tenMinutes: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '10 m'),
        prefix: 'vahan-ai:rc:public:ip:10m',
      }),
      daily: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 d'),
        prefix: 'vahan-ai:rc:public:ip:1d',
      }),
    };
  }

  return cachedPublicLimiters;
}
