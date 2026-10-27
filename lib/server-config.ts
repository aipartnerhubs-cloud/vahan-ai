import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VEHICLE_API_BASE_URL: z.string().trim().optional(),
  VEHICLE_API_KEY: z.string().trim().optional(),
  VEHICLE_API_TOKEN: z.string().trim().optional(),
  VEHICLE_API_SECRET: z.string().trim().optional(),
  VEHICLE_API_USERNAME: z.string().trim().optional(),
  VEHICLE_API_PASSWORD: z.string().trim().optional(),
  VEHICLE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  ENABLE_MOCK_RC_RESPONSE: z.enum(['true', 'false', '']).default('false'),
  RC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RC_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsed.data;

export function isProductionEnvironment(): boolean {
  return env.NODE_ENV === 'production';
}

export function isMockModeEnabled(): boolean {
  return env.NODE_ENV !== 'production' && env.ENABLE_MOCK_RC_RESPONSE === 'true';
}

export function getVehicleApiConfig() {
  const baseUrl = env.VEHICLE_API_BASE_URL?.trim();
  const apiKey = env.VEHICLE_API_KEY?.trim();
  const apiToken = env.VEHICLE_API_TOKEN?.trim();

  const hasBaseUrl = Boolean(baseUrl);
  const hasToken = Boolean(apiKey || apiToken);

  return {
    baseUrl,
    apiKey,
    apiToken,
    apiSecret: env.VEHICLE_API_SECRET?.trim(),
    username: env.VEHICLE_API_USERNAME?.trim(),
    password: env.VEHICLE_API_PASSWORD?.trim(),
    timeoutMs: env.VEHICLE_API_TIMEOUT_MS,
    hasBaseUrl,
    hasToken,
    isConfigured: hasBaseUrl && hasToken,
  };
}

export function assertVehicleApiConfigured(): void {
  const config = getVehicleApiConfig();

  if (!config.isConfigured) {
    throw new Error('Missing required Surepass RC API configuration.');
  }
}

export function getRateLimitConfig() {
  return {
    windowMs: env.RC_RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RC_RATE_LIMIT_MAX_REQUESTS,
  };
}
