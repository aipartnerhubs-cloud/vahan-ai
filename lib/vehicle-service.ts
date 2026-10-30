import 'server-only';

export type VehicleLookupInput = {
  registrationNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
};

export type VehicleResult = {
  registrationNumber: string;
  status: string;
  ownerName: string | null;
  make: string | null;
  model: string | null;
  fuelType: string | null;
  registrationDate: string | null;
  insuranceStatus: string | null;
  fitnessStatus: string | null;
  verificationScore: number | null;
  source: 'surepass_rc_v2';
  warnings?: string[];
};

const DEFAULT_SANDBOX_URL = 'https://sandbox.surepass.app/api/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeRegistrationNumber(value: string): string {
  return value.replace(/[\s-]+/g, '').toUpperCase();
}

function validRegistrationNumber(value: string): boolean {
  return /^[A-Z0-9]{5,15}$/.test(value);
}

function readField(
  record: Record<string, unknown> | undefined,
  keys: string[]
): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null;
}

function getResponseData(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload)) return undefined;

  const { data, result } = payload;
  if (Array.isArray(data) && data.length > 0 && isRecord(data[0])) return data[0];
  if (isRecord(data)) return data;
  if (isRecord(result)) return result;

  const knownRcFields = [
    'rc_number', 'registration_number', 'registrationNumber', 'id_number',
    'owner_name', 'maker_description', 'manufacturer', 'make', 'model',
    'fuel_type', 'registration_date',
  ];
  return knownRcFields.some((key) => key in payload) ? payload : undefined;
}

function getWarnings(payload: unknown): string[] | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.warnings)) return undefined;
  const warnings = payload.warnings
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return warnings.length ? warnings : undefined;
}

function isSurepassVerificationFailure(payload: unknown): boolean {
  if (!isRecord(payload)) return false;

  const messageCode = asString(payload.message_code)?.toLowerCase();
  const statusCode = typeof payload.status_code === 'number'
    ? payload.status_code
    : Number(payload.status_code);

  return messageCode === 'verification_failed' ||
    (payload.success === false && Number.isFinite(statusCode) && statusCode >= 400);
}

function isProductionDeployment(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')
  );
}

export async function fetchVehicleRecord(input: VehicleLookupInput): Promise<VehicleResult> {
  const registrationNumber = normalizeRegistrationNumber(input.registrationNumber || '');
  if (!validRegistrationNumber(registrationNumber)) {
    throw new Error('Invalid registration number.');
  }

  const production = isProductionDeployment();
  const appMode = (process.env.APP_MODE || '').trim().toLowerCase();
  const configuredBaseUrl = process.env.VEHICLE_API_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl || (production ? '' : DEFAULT_SANDBOX_URL);
  const apiKey = process.env.SUREPASS_API_TOKEN || process.env.VEHICLE_API_KEY || process.env.VEHICLE_API_TOKEN;

  if (!baseUrl || !apiKey) {
    throw new Error('Vehicle provider credentials are not configured.');
  }

  if (production && appMode !== 'production') {
    throw new Error('Production provider mode is not configured.');
  }
  if (production && /sandbox/i.test(baseUrl)) {
    throw new Error('Production URL cannot point to a sandbox host.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('Vehicle provider URL is invalid.');
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('Vehicle provider URL must be HTTPS without credentials or query data.');
  }

  const endpoint = parsedUrl.toString().replace(/\/+$/, '') + '/rc/rc-v2';
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
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
    if (error instanceof Error && /abort|timeout/i.test(error.message)) {
      throw new Error('Vehicle verification request timed out.');
    }
    throw new Error('Vehicle verification service is temporarily unavailable.');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (isSurepassVerificationFailure(payload)) {
    throw new Error(
      'Surepass verification failed for this registration number. No verified vehicle details were returned. Confirm a supported Sandbox test registration number and API access with Surepass.'
    );
  }

  if (!response.ok) {
    // Never log the upstream body: it may contain personal data or secrets.
    console.error('Surepass RC API request failed with status', response.status);
    throw new Error('Vehicle verification service is temporarily unavailable.');
  }

  const data = getResponseData(payload);
  if (!data) {
    throw new Error('Surepass returned an unexpected response structure.');
  }

  const returnedRegistration = normalizeRegistrationNumber(
    asString(readField(data, ['rc_number', 'registration_number', 'registrationNumber', 'id_number'])) ||
      registrationNumber
  );

  if (returnedRegistration !== registrationNumber) {
    throw new Error('Returned vehicle registration number does not match.');
  }

  return {
    registrationNumber: returnedRegistration,
    status:
      asString(readField(data, ['status', 'verification_status', 'rc_status', 'vehicle_status'])) ||
      'Record returned by provider',
    ownerName: asString(readField(data, ['owner_name', 'ownerName', 'registered_owner'])),
    make: asString(readField(data, ['maker_description', 'make', 'manufacturer', 'vehicle_make', 'brand'])),
    model: asString(readField(data, ['model', 'model_name', 'vehicle_model'])),
    fuelType: asString(readField(data, ['fuel_type', 'fuelType', 'fuel'])),
    registrationDate: asString(readField(data, ['registration_date', 'registrationDate', 'registered_on'])),
    insuranceStatus: asString(readField(data, ['insurance_status', 'insuranceStatus', 'insurance'])),
    fitnessStatus: asString(readField(data, ['fitness_status', 'fitnessStatus', 'fitness_validity', 'fit_up_to'])),
    verificationScore: asNumber(readField(data, ['verification_score', 'verificationScore', 'score'])),
    source: 'surepass_rc_v2',
    warnings: getWarnings(payload),
  };
}
