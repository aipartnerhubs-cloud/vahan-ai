import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type VehicleLimiters = {
  shortTerm: Ratelimit;
  daily: Ratelimit;
};

let cachedLimiters: VehicleLimiters | null = null;

export function isVehicleRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getVehicleRateLimiters(): VehicleLimiters | null {
  if (!isVehicleRateLimitConfigured()) {
    return null;
  }

  if (!cachedLimiters) {
    const redis = Redis.fromEnv();
    cachedLimiters = {
      shortTerm: new Ratelimit({
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
