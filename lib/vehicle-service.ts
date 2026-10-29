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

function isValidRegistrationNumber(value: string): boolean {
  return /^[A-Z0-9]+$/.test(value);
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

  const { data, result } = payload;

  if (Array.isArray(data) && data.length > 0 && isRecord(data[0])) {
    return data[0];
  }

  if (isRecord(data)) {
    return data;
  }

  if (isRecord(result)) {
    return result;
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

export async function fetchVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleResult> {
  const registrationNumber = normalizeRegistrationNumber(input.registrationNumber || '');

  if (!registrationNumber || !isValidRegistrationNumber(registrationNumber)) {
    throw new Error('Invalid registration number.');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const configuredBaseUrl = process.env.VEHICLE_API_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl || (isProduction ? '' : DEFAULT_BASE_URL);
  const apiKey = process.env.VEHICLE_API_KEY || process.env.VEHICLE_API_TOKEN;
  const appMode = (process.env.APP_MODE || '').trim().toLowerCase();

  if (!baseUrl || !apiKey) {
    throw new Error('Surepass API credentials are not configured.');
  }

  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error('Surepass API base URL is not configured correctly.');
  }

  if (
    parsedBaseUrl.protocol !== 'https:' ||
    parsedBaseUrl.username ||
    parsedBaseUrl.password ||
    parsedBaseUrl.search ||
    parsedBaseUrl.hash
  ) {
    throw new Error('Surepass API base URL must be a clean HTTPS URL.');
  }

  if (isProduction && appMode !== 'production') {
    throw new Error('Production provider mode is not configured.');
  }

  if (isProduction && /sandbox/i.test(parsedBaseUrl.hostname)) {
    throw new Error('Production API URL must not point to sandbox.');
  }

  const endpoint = `${parsedBaseUrl.toString().replace(/\/+$/, '')}/rc/rc-v2`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    if (message.toLowerCase().includes('abort')) {
      throw new Error('Vehicle verification request timed out.');
    }
    throw new Error('Vehicle verification service is temporarily unavailable.');
  }

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

  const returnedRegistrationNumber = normalizeRegistrationNumber(
    asString(
      readField(data, ['rc_number', 'registration_number', 'registrationNumber', 'id_number']),
      registrationNumber
    )
  );

  if (
    returnedRegistrationNumber &&
    returnedRegistrationNumber !== registrationNumber
  ) {
    throw new Error('Returned vehicle registration number does not match.');
  }

  const verificationScore = asNumber(
    readField(data, ['verification_score', 'verificationScore', 'score']),
    0
  );

  return {
    registrationNumber: returnedRegistrationNumber || registrationNumber,
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
      readField(data, ['fitness_status', 'fitnessStatus', 'fitness_validity', 'fit_up_to']),
      'Not available'
    ),
    verificationScore: Number.isFinite(verificationScore)
      ? Math.min(100, Math.max(0, verificationScore))
      : 0,
    source: 'surepass_rc_v2',
    warnings: getWarnings(payload),
  };
}
