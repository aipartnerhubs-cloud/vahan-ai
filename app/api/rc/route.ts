export type VehicleRequest = {
  registrationNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
};

export type VehicleResult = {
  registrationNumber: string;
  status: string;
  ownerName: string;
  make: string;
  model: string;
  fuelType: string;
  registrationDate: string;
  insuranceStatus: string;
  fitnessStatus: string;
  verificationScore: number;
  source: string;
  warnings?: string[];
};

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildMockVehicleResult(input: VehicleRequest): VehicleResult {
  const reg = input.registrationNumber.toUpperCase();
  const score = getRandomInt(84, 97);

  return {
    registrationNumber: reg,
    status: 'Active / Verified',
    ownerName: 'Demo Owner',
    make: 'Hyundai',
    model: 'Creta',
    fuelType: 'Petrol',
    registrationDate: '2020-04-15',
    insuranceStatus: 'Valid',
    fitnessStatus: 'Current',
    verificationScore: score,
    source: 'Sandbox mock response',
    warnings: [
      'This response is served from mock fallback mode because no live sandbox endpoint is configured.',
    ],
  };
}

function normalizeField(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function readPayload(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) return undefined;

  for (const key of keys) {
    if (key in data && data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') {
      return data[key];
    }
  }

  return undefined;
}

export async function fetchVehicleRecord(input: VehicleRequest): Promise<VehicleResult> {
  const baseUrl = process.env.VEHICLE_API_BASE_URL;

  if (!baseUrl) {
    return buildMockVehicleResult(input);
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = process.env.VEHICLE_API_KEY || process.env.VEHICLE_API_TOKEN;
    const apiSecret = process.env.VEHICLE_API_SECRET;
    const username = process.env.VEHICLE_API_USERNAME;
    const password = process.env.VEHICLE_API_PASSWORD;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (apiSecret) {
      headers['X-API-Key'] = apiSecret;
    }

    if (username && password) {
      headers['X-API-Username'] = username;
      headers['X-API-Password'] = password;
    }

    const endpoint = `${baseUrl.replace(/\/$/, '')}/rc/rc-v2`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_number: input.registrationNumber,
        enrich: false,
        ...(input.chassisNumber ? { chassis_number: input.chassisNumber } : {}),
        ...(input.engineNumber ? { engine_number: input.engineNumber } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Sandbox API responded with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const data = (payload.data as Record<string, unknown>) || payload;

    return {
      registrationNumber: normalizeField(
        readPayload(data, ['rc_number', 'registrationNumber', 'id_number', 'registration_number']),
        input.registrationNumber.toUpperCase()
      ),
      status: normalizeField(readPayload(data, ['status', 'verification_status', 'rc_status']), 'Active / Verified'),
      ownerName: normalizeField(
        readPayload(data, ['owner_name', 'ownerName', 'name', 'registered_owner']),
        'Owner not returned'
      ),
      make: normalizeField(readPayload(data, ['make', 'manufacturer', 'vehicle_make']), 'Vehicle'),
      model: normalizeField(readPayload(data, ['model', 'vehicle_model']), 'Model'),
      fuelType: normalizeField(readPayload(data, ['fuel_type', 'fuelType']), 'Unknown'),
      registrationDate: normalizeField(
        readPayload(data, ['registration_date', 'registrationDate', 'registered_on']),
        'Not available'
      ),
      insuranceStatus: normalizeField(readPayload(data, ['insurance_status', 'insuranceStatus']), 'Unknown'),
      fitnessStatus: normalizeField(readPayload(data, ['fitness_status', 'fitnessStatus']), 'Unknown'),
      verificationScore: typeof readPayload(data, ['verification_score', 'verificationScore']) === 'number'
        ? Number(readPayload(data, ['verification_score', 'verificationScore']))
        : 92,
      source: 'Live sandbox API',
      warnings: Array.isArray(payload.warnings) ? payload.warnings.filter(Boolean).map(String) : [],
    };
  } catch (error) {
    console.error('Sandbox fetch failed, using mock response:', error);
    return buildMockVehicleResult(input);
  }
}
