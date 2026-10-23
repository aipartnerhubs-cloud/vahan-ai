import { NextResponse } from 'next/server';
import { fetchVehicleRecord } from '@/lib/vehicle-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const registrationNumber = String(body.registrationNumber || '').trim();

    if (!registrationNumber) {
      return NextResponse.json(
        { error: 'Registration number is required.' },
        { status: 400 }
      );
    }

    const record = await fetchVehicleRecord({
      registrationNumber,
      chassisNumber: body.chassisNumber,
      engineNumber: body.engineNumber,
    });

    return NextResponse.json({ result: record });
  } catch (error) {
    console.error('RC route failed:', error);
    return NextResponse.json(
      { error: 'Unexpected server error while verifying vehicle details.' },
      { status: 500 }
    );
  }
}
