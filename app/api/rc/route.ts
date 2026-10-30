import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isAllowedAgentEmail, isAgentAllowlistConfigured, isProductionDeployment } from '@/lib/agent-access';
import { getRateLimiters } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchVehicleRecord } from '@/lib/vehicle-service';

const MAX_BODY_BYTES = 8 * 1024;

const requestSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1, 'Registration number is required.')
    .max(25, 'Registration number is too long.')
    .regex(/^[A-Za-z0-9\s-]+$/, 'Registration number format is invalid.'),
  chassisNumber: z.string().trim().max(64).optional(),
  engineNumber: z.string().trim().max(64).optional(),
}).strict();

function respond(payload: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

async function readBodyLimited(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) {
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

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return respond({ error: 'Application authentication is not configured.' }, 503);
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return respond({ error: 'Authentication required.' }, 401);
  }

  if (isProductionDeployment() && !isAgentAllowlistConfigured()) {
    return respond({ error: 'Approved agent access is not configured.' }, 503);
  }
  if (!isAllowedAgentEmail(user.email)) {
    return respond({ error: 'This account is not authorized for Vahan AI.' }, 403);
  }

  if (isProductionDeployment() && !process.env.APP_MODE?.trim()) {
    return respond({ error: 'Production provider configuration is incomplete.' }, 503);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBodyLimited(request, MAX_BODY_BYTES);
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
    const first = parsed.error.issues[0];
    return respond({ error: first?.message || 'Invalid request fields.' }, 400);
  }

  const limiters = getRateLimiters();
  if (!limiters && isProductionDeployment()) {
    return respond({ error: 'RC lookup rate limiting is not configured.' }, 503);
  }

  if (limiters) {
    try {
      const results = await Promise.all([
        limiters.tenMinutes.limit(user.id),
        limiters.daily.limit(user.id),
      ]);
      const blocked = results.find((result) => !result.success);
      if (blocked) {
        const retryAfter = Math.max(1, Math.ceil((blocked.reset - Date.now()) / 1000));
        return respond(
          { error: 'Lookup limit reached. Please try again later.' },
          429,
          { 'Retry-After': String(retryAfter) }
        );
      }
    } catch {
      console.error('RC rate-limit provider unavailable.');
      if (isProductionDeployment()) {
        return respond({ error: 'Vehicle verification is temporarily unavailable.' }, 503);
      }
    }
  }

  try {
    const result = await fetchVehicleRecord(parsed.data);
    return respond({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/invalid registration number/i.test(message)) {
      return respond({ error: 'Registration number format is invalid.' }, 400);
    }
    if (/surepass verification failed/i.test(message)) {
      return respond(
        {
          error: 'Surepass could not verify this registration number in Sandbox. No vehicle details were returned. Confirm a supported test registration number and Sandbox access with Surepass.',
          code: 'SUREPASS_VERIFICATION_FAILED',
        },
        422
      );
    }
    if (/not configured|credentials|production mode|sandbox|provider url/i.test(message)) {
      return respond({ error: 'Vehicle verification is not configured for this environment.' }, 503);
    }
    console.error('RC lookup failed; provider details and personal data were omitted.');
    return respond({ error: 'Vehicle verification is temporarily unavailable. Please try again.' }, 502);
  }
}
