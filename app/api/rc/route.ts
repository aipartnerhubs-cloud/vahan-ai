import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAgentAllowlistConfigured, isAllowedAgentEmail, isProductionDeployment } from '@/lib/agent-access';
import { getVehicleRateLimiters } from '@/lib/rate-limit';
import { fetchVehicleRecord } from '@/lib/vehicle-service';

const MAX_BODY_BYTES = 8 * 1024;
const requestSchema = z
  .object({
    registrationNumber: z
      .string()
      .trim()
      .min(1, 'Registration number is required.')
      .max(20, 'Registration number is too long.')
      .regex(/^[A-Za-z0-9]+$/, 'Registration number format is invalid.'),
    chassisNumber: z.string().trim().max(64).optional(),
    engineNumber: z.string().trim().max(64).optional(),
  })
  .strict();

async function readLimitedBody(
  request: Request,
  maxBytes: number
): Promise<string | null> {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: true }).decode(combined);
}

function jsonResponse(
  payload: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin) {
      let originUrl: URL;
      try {
        originUrl = new URL(origin);
      } catch {
        return jsonResponse({ error: 'Invalid request origin.' }, 403);
      }

      if (originUrl.origin !== new URL(request.url).origin) {
        return jsonResponse({ error: 'Cross-origin requests are not allowed.' }, 403);
      }
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Request body is too large.' }, 413);
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonResponse(
        { error: 'Application authentication is not configured.' },
        503
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    if (isProductionDeployment() && !isAgentAllowlistConfigured()) {
      return jsonResponse(
        { error: 'Approved agent access is not configured.' },
        503
      );
    }

    if (!isAllowedAgentEmail(user.email)) {
      return jsonResponse(
        { error: 'This account is not authorized for Vahan AI.' },
        403
      );
    }

    let rawBody: string | null;
    try {
      rawBody = await readLimitedBody(request, MAX_BODY_BYTES);
    } catch {
      return jsonResponse({ error: 'Request body must be valid UTF-8.' }, 400);
    }

    if (rawBody === null) {
      return jsonResponse({ error: 'Request body is too large.' }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const registrationIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === 'registrationNumber'
      );
      return jsonResponse(
        { error: registrationIssue?.message || 'Invalid request fields.' },
        400
      );
    }

    const rateLimiters = getVehicleRateLimiters();
    if (!rateLimiters && process.env.NODE_ENV === 'production') {
      return jsonResponse(
        { error: 'RC verification security controls are not configured.' },
        503
      );
    }

    if (rateLimiters) {
      let shortTerm;
      let daily;

      try {
        [shortTerm, daily] = await Promise.all([
          rateLimiters.shortTerm.limit(user.id),
          rateLimiters.daily.limit(user.id),
        ]);
      } catch {
        // Fail closed: do not call a paid/sensitive upstream API when rate limiting is unavailable.
        console.error('RC rate-limit service unavailable.');
        return jsonResponse(
          { error: 'Vehicle verification is temporarily unavailable.' },
          503
        );
      }

      if (!shortTerm.success || !daily.success) {
        const resetAt = !shortTerm.success ? shortTerm.reset : daily.reset;
        const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
        return jsonResponse(
          { error: 'Lookup limit reached. Please try again later.' },
          429,
          { 'Retry-After': String(retryAfter) }
        );
      }
    }

    const result = await fetchVehicleRecord(parsed.data);
    return jsonResponse({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (/Invalid registration number/i.test(message)) {
      return jsonResponse({ error: 'Registration number format is invalid.' }, 400);
    }

    if (/not configured|credentials|production mode|sandbox/i.test(message)) {
      return jsonResponse(
        { error: 'Vehicle verification is not configured for this environment.' },
        503
      );
    }

    // Avoid logging upstream payloads, tokens, or owner details.
    console.error('RC route failed; provider details were intentionally omitted.');
    return jsonResponse(
      { error: 'Vehicle verification is temporarily unavailable. Please try again.' },
      502
    );
  }
}
