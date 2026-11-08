import { NextResponse } from 'next/server';

import { fetchVehicleRecord } from '@/lib/vehicle-service';

const INVALID_REGISTRATION_MESSAGE = 'Registration number is required.';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const registrationNumber =
      typeof body?.registrationNumber === 'string'
        ? body.registrationNumber.trim()
        : '';

    if (!registrationNumber) {
      return NextResponse.json(
        { error: INVALID_REGISTRATION_MESSAGE },
        { status: 400 }
      );
    }

    const result = await fetchVehicleRecord({
      registrationNumber,
      chassisNumber:
        typeof body?.chassisNumber === 'string'
          ? body.chassisNumber.trim()
          : undefined,
      engineNumber:
        typeof body?.engineNumber === 'string'
          ? body.engineNumber.trim()
          : undefined,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vehicle verification failed.';
    const provider = (process.env.VEHICLE_PROVIDER || 'surepass').toLowerCase();

    if (/Invalid registration number/i.test(message)) {
      return NextResponse.json(
        { error: 'Registration number is invalid.' },
        { status: 400 }
      );
    }

    if (/not configured|credentials/i.test(message)) {
      console.error('RC provider configuration missing', { provider });
      return NextResponse.json(
        { error: 'Vehicle verification is temporarily unavailable. Check provider configuration.' },
        { status: 503 }
      );
    }

    // The StampMitra adapter emits only fixed, safe diagnostic messages here.
    // Return those messages so sandbox auth/scope/rate-limit failures are
    // visible to the tester instead of masking every cause with one generic UI error.
    const isSafeStampMitraMessage =
      provider === 'stampmitra' &&
      /^StampMitra (sandbox authentication failed|API key does not have the RC verification scope|sandbox rate limit reached|verification service is temporarily unavailable|vehicle verification failed|vehicle verification request timed out)\./i.test(message);

    console.error('RC route failed', {
      provider,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      safeMessage: message.slice(0, 240),
    });

    return NextResponse.json(
      {
        error: isSafeStampMitraMessage
          ? message
          : 'Vehicle verification is temporarily unavailable. Please try again.',
      },
      { status: 502 }
    );
  }
}
