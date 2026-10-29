```typescript
type VehicleLookupInput = {
  registrationNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
};

type VehicleRecord = {
  registrationNumber: string;
  make?: string;
  model?: string;
  variant?: string;
  fuelType?: string;
  vehicleClass?: string;
  registrationDate?: string;
  fitnessValidUntil?: string;
  ownerName?: string;
  source: string;
};

export async function fetchVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleRecord> {
  const registrationNumber = input.registrationNumber
    .replace(/\s+/g, '')
    .toUpperCase();

  const apiKey = process.env.VEHICLE_API_KEY;

  const baseUrl =
    process.env.VEHICLE_API_BASE_URL ||
    'https://sandbox.surepass.app/api/v1/rc/rc-v2';

  if (!apiKey) {
    throw new Error('Surepass API token is not configured.');
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      id_number: registrationNumber,
      enrich: false,
    }),
    cache: 'no-store',
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error('Surepass RC API error:', response.status);
    throw new Error(`Surepass RC lookup failed (${response.status}).`);
  }

  const data = payload?.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Surepass returned an invalid RC response.');
  }

  const returnedNumber = String(
    data.rc_number ?? data.registration_number ?? ''
  )
    .replace(/\s+/g, '')
    .toUpperCase();

  if (returnedNumber && returnedNumber !== registrationNumber) {
    throw new Error('Returned vehicle registration number does not match.');
  }

  return {
    registrationNumber: returnedNumber || registrationNumber,
    make: data.maker_description ?? data.make ?? undefined,
    model: data.model ?? data.model_name ?? undefined,
    variant: data.variant ?? data.variant_name ?? undefined,
    fuelType: data.fuel_type ?? undefined,
    vehicleClass:
      data.vehicle_category ?? data.vehicle_class ?? undefined,
    registrationDate: data.registration_date ?? undefined,
    fitnessValidUntil: data.fit_up_to ?? undefined,
    ownerName: data.owner_name ?? undefined,
    source: 'surepass_rc_v2',
  };
}
```
