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

    if (/Invalid registration number/i.test(message)) {
      return NextResponse.json(
        { error: 'Registration number is invalid.' },
        { status: 400 }
      );
    }

    if (/not configured|credentials/i.test(message)) {
      return NextResponse.json(
        { error: 'Vehicle verification is temporarily unavailable.' },
        { status: 503 }
      );
    }

    console.error('RC route failed:', message);

    return NextResponse.json(
      {
        error: 'Vehicle verification is temporarily unavailable. Please try again.',
      },
      { status: 502 }
    );
  }
}
