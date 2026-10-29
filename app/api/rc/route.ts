import { NextResponse } from 'next/server';

import { fetchVehicleRecord } from '@/lib/vehicle-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const registrationNumber = String(body?.registrationNumber ?? '').trim();

    if (!registrationNumber) {
      return NextResponse.json(
        { error: 'Registration number is required.' },
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
    console.error('RC route failed:', error);

    return NextResponse.json(
      {
        error: 'Vehicle verification is temporarily unavailable. Please try again.',
      },
      { status: 502 }
    );
  }
}
