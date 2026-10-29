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
  source: string;
};

export async function fetchVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleRecord> {
  const registrationNumber = input.registrationNumber
    .replace(/\s+/g, '')
    .toUpperCase();

  const baseUrl = process.env.VEHICLE_API_BASE_URL;
  const apiKey = process.env.VEHICLE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Vehicle API configuration is missing. Configure server environment variables.'
    );
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      id_number: registrationNumber,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Vehicle API request failed: ${response.status}`);
  }

  const payload = await response.json();

  const data = payload?.data ?? payload?.result ?? payload;

  if (!data || typeof data !== 'object') {
    throw new Error('Vehicle API returned an invalid response.');
  }

  const returnedNumber = String(
    data.registration_number ?? data.rc_number ?? data.reg_no ?? ''
  )
    .replace(/\s+/g, '')
    .toUpperCase();

  if (returnedNumber && returnedNumber !== registrationNumber) {
    throw new Error('Vehicle registration number does not match.');
  }

  return {
    registrationNumber: returnedNumber || registrationNumber,
    make: data.make ?? data.maker_description ?? data.manufacturer,
    model: data.model ?? data.model_name,
    variant: data.variant ?? data.variant_name,
    fuelType: data.fuel_type ?? data.fuel,
    vehicleClass: data.vehicle_class ?? data.class,
    registrationDate:
      data.registration_date ?? data.registered_at ?? data.reg_date,
    source: 'vehicle_api',
  };
}
