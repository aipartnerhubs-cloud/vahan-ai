import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getPublicRateLimiters } from '@/lib/rate-limit';
import { fetchVehicleRecord } from '@/lib/vehicle-service';
import { toPublicVehicleResult } from '@/lib/public-vehicle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4 * 1024;
const requestSchema = z.object({
  registrationNumber: z.string()
    .trim()
    .min(1, 'Registration number is required.')
    .max(25, 'Registration number is too long.')
    .regex(/^[A-Za-z0-9\s-]+$/, 'Registration number format is invalid.'),
  authorizedPurpose: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm that you are authorized to request this lookup.' })
    })
    }).strict();

function respond(payload: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
    });
}

function getTrustedClientIp(headers: Headers): string | null {
  // Vercel appends its observed client address to x-forwarded-for.
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded?.split(',').map((part) => part.trim()).filter(Boolean).at(-1);
  if (!ip || ip.length > 64) return null;
  return ip;
}

async function readBodyLimited(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return respond({ error: 'Cross-origin requests are not allowed.' }, 403);
      }
    } catch {
      return respond({ error: 'Invalid request origin.' }, 403);
    }
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return respond({ error: 'Request body is too large.' }, 413);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBodyLimited(request);
  } catch {
    return respond({ error: 'Request body must be valid UTF-8.' }, 400);
  }
  if (rawBody === null) return respond({ error: 'Request body is too large.' }, 413);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return respond({ error: 'Request body must be valid JSON.' }, 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ error: parsed.error.issues[0]?.message || 'Invalid request fields.' }, 400);
  }

  const ip = getTrustedClientIp(request.headers);
  if (!ip) {
    return respond({ error: 'Public lookup is unavailable because the client address could not be verified.' }, 503);
  }

  const limiters = getPublicRateLimiters();
  if (!limiters) {
    return respond({ error: 'Public lookup is not configured yet. The administrator must configure Upstash rate limiting.' }, 503);
  }

  const clientKey = createHash('sha256').update(ip).digest('hex');

  try {
    // Preview testing keeps a short-window burst guard but disables the
    // five-lookups-per-day quota.
    const burst = await limiters.burst.limit(clientKey);
    if (!burst.success) {
      const retryAfter = Math.max(1, Math.ceil((burst.reset - Date.now()) / 1000));
      return respond(
        { error: 'Please wait before another lookup. The short-window limit is 3 checks in 5 minutes.', code: 'BURST_LIMIT_REACHED', limitType: 'burst' },
        429,
        { 'Retry-After': String(retryAfter) }
      );
    }
  } catch {
    console.error('Public RC burst-limit provider unavailable.');
    return respond({ error: 'Vehicle lookup is temporarily unavailable because usage protection could not be verified.' }, 503);
  }

  try {
    const result = await fetchVehicleRecord({
      registrationNumber: parsed.data.registrationNumber
    });
    // Public partner response is explicitly allowlisted. Owner name and all
    // other personal/identity fields remain server-side and are never sent.
    return respond({
      result: toPublicVehicleResult(result),
      
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/invalid registration number/i.test(message)) {
      return respond({ error: 'Registration number format is invalid.',  }, 400);
    }
    if (/surepass verification failed/i.test(message)) {
      return respond({
        error: 'Surepass could not verify this registration number in Sandbox. No vehicle details were returned. Confirm a supported test registration number and Sandbox access with Surepass.',
        code: 'SUREPASS_VERIFICATION_FAILED',
        
    }, 422);
    }
    if (/not configured|credentials|production mode|sandbox|provider url/i.test(message)) {
      return respond({ error: 'Vehicle verification is not configured for this environment.',  }, 503);
    }
    console.error('Public RC lookup failed; provider details and personal data were omitted.');
    return respond({ error: 'Vehicle verification is temporarily unavailable. Please try again.',  }, 502);
  }
}
