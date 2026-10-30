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
