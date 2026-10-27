import { NextResponse } from 'next/server';

import { getRateLimitConfig } from '@/lib/server-config';
import { VehicleServiceError, fetchVehicleRecord, isValidRegistrationNumber, normalizeRegistrationNumber } from '@/lib/vehicle-service';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(request: Request): { allowed: boolean; retryAfterMs?: number } {
  const { windowMs, maxRequests } = getRateLimitConfig();
  const key = getClientIp(request);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, entry.resetAt - now),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  return request
    .json()
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {}))
    .catch(() => {
      throw new VehicleServiceError('Invalid JSON request body.', 400, 'RC_INVALID_JSON');
    });
}

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many RC verification requests. Please try again later.',
        code: 'RC_RATE_LIMITED',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000)),
          'Cache-Control': 'no-store, private',
        },
      }
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 4096) {
    return NextResponse.json(
      { error: 'Request body is too large.', code: 'RC_REQUEST_TOO_LARGE' },
      { status: 413 }
    );
  }

  try {
    const body = await parseJsonBody(request);
    const rawRegistrationNumber = typeof body.registrationNumber === 'string' ? body.registrationNumber : '';
    const registrationNumber = normalizeRegistrationNumber(rawRegistrationNumber);

    if (!registrationNumber || !isValidRegistrationNumber(registrationNumber)) {
      return NextResponse.json(
        { error: 'A valid registration number is required.', code: 'RC_INVALID_REGISTRATION_NUMBER' },
        { status: 400 }
      );
    }

    const chassisNumber = typeof body.chassisNumber === 'string' ? body.chassisNumber.trim() : undefined;
    const engineNumber = typeof body.engineNumber === 'string' ? body.engineNumber.trim() : undefined;

    const result = await fetchVehicleRecord({
      registrationNumber,
      ...(chassisNumber ? { chassisNumber } : {}),
      ...(engineNumber ? { engineNumber } : {}),
    });

    return NextResponse.json({ result }, {
      headers: {
        'Cache-Control': 'no-store, private, max-age=0',
      },
    });
  } catch (error) {
    if (error instanceof VehicleServiceError) {
      const status = error.statusCode >= 500 ? 503 : error.statusCode;
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status,
          headers: {
            'Cache-Control': 'no-store, private, max-age=0',
          },
        }
      );
    }

    return NextResponse.json(
      {
        error: 'Unable to verify vehicle details at this time.',
        code: 'RC_UNKNOWN_ERROR',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, private, max-age=0',
        },
      }
    );
  }
}
