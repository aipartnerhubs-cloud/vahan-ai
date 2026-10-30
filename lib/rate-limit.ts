import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { PUBLIC_PARTNER_BURST_LIMIT, PUBLIC_PARTNER_BURST_WINDOW, PUBLIC_PARTNER_DAILY_LIMIT, PUBLIC_PARTNER_DAILY_WINDOW } from '@/lib/public-usage-policy';

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
  burst: Ratelimit;
  daily: Ratelimit;
};

let cachedPublicLimiters: PublicLimiters | null = null;

/**
 * No-login partner lookups are rate-limited by a server-derived client IP.
 * Daily keys are partitioned by India calendar date in the route handler.
 */
export function getPublicRateLimiters(): PublicLimiters | null {
  if (!isRateLimitConfigured()) return null;

  if (!cachedPublicLimiters) {
    const redis = Redis.fromEnv();
    cachedPublicLimiters = {
      burst: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(PUBLIC_PARTNER_BURST_LIMIT, PUBLIC_PARTNER_BURST_WINDOW),
        prefix: 'vahan-ai:rc:public:ip:5m',
      }),
      daily: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(PUBLIC_PARTNER_DAILY_LIMIT, PUBLIC_PARTNER_DAILY_WINDOW),
        prefix: 'vahan-ai:rc:public:ip:ist-day',
      }),
    };
  }

  return cachedPublicLimiters;
}
