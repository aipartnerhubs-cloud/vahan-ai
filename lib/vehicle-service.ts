export type VehicleLookupInput = {
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

const DEFAULT_BASE_URL = 'https://sandbox.surepass.app/api/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRegistrationNumber(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function readField(
  record: Record<string, unknown> | undefined,
  keys: string[]
): unknown {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];

    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }

    return value;
  }

  return undefined;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getResponseData(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (Array.isArray(payload.data) && payload.data.length > 0 && isRecord(payload.data[0])) {
    return payload.data[0];
  }

  if (isRecord(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.result)) {
    return payload.result as Record<string, unknown>;
  }

  return payload;
}

function getWarnings(payload: unknown): string[] | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.warnings)) {
    return undefined;
  }

  const warnings = payload.warnings
    .filter((warning): warning is string => typeof warning === 'string')
    .map((warning) => warning.trim())
    .filter((warning) => warning.length > 0);

  return warnings.length > 0 ? warnings : undefined;
}

function isValidRegistrationNumber(value: string): boolean {
  return /^[A-Z0-9]+$/i.test(value);
}

export async function fetchVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleResult> {
  const registrationNumber = normalizeRegistrationNumber(
    input.registrationNumber || ''
  );

  if (!registrationNumber || !isValidRegistrationNumber(registrationNumber)) {
    throw new Error('Invalid registration number.');
  }

  const baseUrl = process.env.VEHICLE_API_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.VEHICLE_API_KEY || process.env.VEHICLE_API_TOKEN;

  if (!baseUrl || !apiKey) {
    throw new Error('Surepass API credentials are not configured.');
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/rc/rc-v2`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      id_number: registrationNumber,
      enrich: false,
      ...(input.chassisNumber?.trim()
        ? { chassis_number: input.chassisNumber.trim() }
        : {}),
      ...(input.engineNumber?.trim()
        ? { engine_number: input.engineNumber.trim() }
        : {}),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const rawText = await response.text().catch(() => '');
    console.error(
      'Surepass RC API request failed:',
      response.status,
      rawText ? 'upstream error received' : 'no upstream body'
    );
    throw new Error('Vehicle verification service is temporarily unavailable.');
  }

  const payload = await response.json().catch(() => null);
  const data = getResponseData(payload);

  if (!data) {
    throw new Error('Surepass returned an unexpected response structure.');
  }

  const returnedReg = normalizeRegistrationNumber(
    asString(
      readField(data, [
        'rc_number',
        'registration_number',
        'registrationNumber',
        'id_number',
      ]),
      registrationNumber
    )
  );

  if (returnedReg && returnedReg !== registrationNumber) {
    throw new Error('Returned vehicle registration number does not match.');
  }

  const verificationScore = asNumber(
    readField(data, ['verification_score', 'verificationScore', 'score']),
    0
  );

  return {
    registrationNumber: returnedReg || registrationNumber,
    status: asString(
      readField(data, ['status', 'verification_status', 'rc_status', 'vehicle_status']),
      'Verification complete'
    ),
    ownerName: asString(
      readField(data, ['owner_name', 'ownerName', 'registered_owner', 'owner']),
      'Owner not available'
    ),
    make: asString(
      readField(data, ['maker_description', 'make', 'manufacturer', 'vehicle_make', 'brand']),
      'Vehicle'
    ),
    model: asString(
      readField(data, ['model', 'model_name', 'vehicle_model']),
      'Model not available'
    ),
    fuelType: asString(
      readField(data, ['fuel_type', 'fuelType', 'fuel']),
      'Not available'
    ),
    registrationDate: asString(
      readField(data, ['registration_date', 'registrationDate', 'registered_on']),
      'Not available'
    ),
    insuranceStatus: asString(
      readField(data, ['insurance_status', 'insuranceStatus', 'insurance']),
      'Not available'
    ),
    fitnessStatus: asString(
      readField(data, [
        'fitness_status',
        'fitnessStatus',
        'fitness_validity',
        'fit_up_to',
        'fitnessValidUntil',
      ]),
      'Not available'
    ),
    verificationScore: Number.isFinite(verificationScore)
      ? Math.min(100, Math.max(0, verificationScore))
      : 0,
    source: 'surepass_rc_v2',
    warnings: getWarnings(payload),
  };
}
