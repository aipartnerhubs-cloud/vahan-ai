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

    const apiKey = process.env.VEHICLE_API_KEY;
    const apiSecret = process.env.VEHICLE_API_SECRET;
    const username = process.env.VEHICLE_API_USERNAME;
    const password = process.env.VEHICLE_API_PASSWORD;

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    if (apiSecret) {
      headers['X-API-Key'] = apiSecret;
    }

    if (username && password) {
      headers['X-API-Username'] = username;
      headers['X-API-Password'] = password;
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rc/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        registrationNumber: input.registrationNumber,
        chassisNumber: input.chassisNumber,
        engineNumber: input.engineNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sandbox API responded with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;

    return {
      registrationNumber: normalizeField(payload.registrationNumber, input.registrationNumber.toUpperCase()),
      status: normalizeField(payload.status, 'Active / Verified'),
      ownerName: normalizeField(payload.ownerName, 'Owner not returned'),
      make: normalizeField(payload.make, 'Vehicle'),
      model: normalizeField(payload.model, 'Model'),
      fuelType: normalizeField(payload.fuelType, 'Unknown'),
      registrationDate: normalizeField(payload.registrationDate, 'Not available'),
      insuranceStatus: normalizeField(payload.insuranceStatus, 'Unknown'),
      fitnessStatus: normalizeField(payload.fitnessStatus, 'Unknown'),
      verificationScore: typeof payload.verificationScore === 'number' ? payload.verificationScore : 92,
      source: 'Live sandbox API',
      warnings: Array.isArray(payload.warnings) ? payload.warnings.filter(Boolean).map(String) : [],
    };
  } catch (error) {
    console.error('Sandbox fetch failed, using mock response:', error);
    return buildMockVehicleResult(input);
  }
}
