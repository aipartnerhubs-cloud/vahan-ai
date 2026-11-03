import { NextResponse } from 'next/server';

import { getInsuranceClaimsHistory } from '@/lib/claims-history';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const registrationNumber =
      typeof body?.registrationNumber === 'string'
        ? body.registrationNumber.replace(/[\\s.-]/g, '').toUpperCase()
        : '';

    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(registrationNumber)) {
      return NextResponse.json(
        { error: 'A valid vehicle registration number is required.' },
        { status: 400 }
      );
    }

    const result = await getInsuranceClaimsHistory(registrationNumber);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: 'Unable to retrieve insurance claim history.' },
      { status: 400 }
    );
  }
}
