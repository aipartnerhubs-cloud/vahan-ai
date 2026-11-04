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
  referenceId?: string;
  warnings?: string[];
  variant?: string; vehicleClass?: string; makerModel?: string; color?: string;
  insurerName?: string; policyNumber?: string; insuranceExpiryDate?: string;
  pucExpiryDate?: string; taxValidity?: string; financier?: string; ownershipCount?: string;
  claimsHistory?: string;
  chassisNumber?: string; engineNumber?: string; bodyType?: string; normsType?: string;
  vehicleCategory?: string; registeredAt?: string; rcExpiryDate?: string; blacklistStatus?: string;
  manufacturedMonthYear?: string; cubicCapacity?: string; seatingCapacity?: string;
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

async function fetchSurepassVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleResult> {
  const registrationNumber = normalizeRegistrationNumber(input.registrationNumber || '');

  if (!registrationNumber || !isValidRegistrationNumber(registrationNumber)) {
    throw new Error('Invalid registration number.');
  }

  const baseUrl = process.env.VEHICLE_API_BASE_URL || DEFAULT_BASE_URL;
  const apiKey =
    process.env.SUREPASS_API_TOKEN ||
    process.env.VEHICLE_API_KEY ||
    process.env.VEHICLE_API_TOKEN;

  if (!baseUrl || !apiKey) {
    throw new Error('Surepass API credentials are not configured.');
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/rc/rc-v2`;

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
      readField(data, ['maker_model', 'model', 'model_name', 'vehicle_model']),
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
      readField(data, ['insurance_upto', 'insuranceUpto', 'insurance_expiry_date', 'insurance_status', 'insuranceStatus', 'insurance_validity', 'insurance']),
      'Not available'
    ),
    variant: asString(readField(data, ['variant', 'variant_name', 'vehicle_variant']), ''),
    vehicleClass: asString(readField(data, ['vehicle_class', 'vehicleClass', 'class']), ''),
    makerModel: asString(readField(data, ['maker_model', 'makerModel']), ''),
    color: asString(readField(data, ['color', 'vehicle_color']), ''),
    insurerName: asString(readField(data, ['insurance_company', 'insurer_name', 'insurance_provider', 'insuranceCompany']), ''),
    policyNumber: asString(readField(data, ['policy_number', 'insurance_policy_number', 'policyNo']), ''),
    insuranceExpiryDate: asString(readField(data, ['insurance_upto', 'insurance_expiry_date', 'insurance_valid_upto', 'insuranceExpiryDate']), ''),
    pucExpiryDate: asString(readField(data, ['pucc_upto', 'puc_upto', 'puccUpto', 'puc_expiry_date', 'puc_valid_upto']), ''),
    taxValidity: asString(readField(data, ['tax_upto', 'tax_validity', 'tax_valid_upto']), ''),
    financier: asString(readField(data, ['financed', 'financer', 'financier', 'hypothecation']), ''),
    ownershipCount: asString(readField(data, ['owner_count', 'ownership_count', 'owner_serial_no']), ''),
    chassisNumber: asString(readField(data, ['vehicle_chasi_number', 'chassis_number', 'chasi_no']), ''),
    engineNumber: asString(readField(data, ['vehicle_engine_number', 'engine_number', 'engine_no']), ''),
    bodyType: asString(readField(data, ['body_type', 'bodyType']), ''),
    normsType: asString(readField(data, ['norms_type', 'normsType']), ''),
    vehicleCategory: asString(readField(data, ['vehicle_category_description', 'vehicle_category', 'vehicleCategory']), ''),
    registeredAt: asString(readField(data, ['registered_at', 'registeredAt', 'rto_name']), ''),
    rcExpiryDate: asString(readField(data, ['rc_expiry_date', 'rcExpiryDate', 'registration_upto']), ''),
    blacklistStatus: asString(readField(data, ['blacklist_status', 'blackListStatus']), ''),
    manufacturedMonthYear: asString(readField(data, ['manufactured_month_year', 'manufacturing_month_year', 'manufacturedMonthYear']), ''),
    cubicCapacity: asString(readField(data, ['cubic_capacity', 'cubicCapacity', 'cc']), ''),
    seatingCapacity: asString(readField(data, ['seating_capacity', 'seatingCapacity']), ''),
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


const STAMPMITRA_BASE_URL = 'https://api-b2b.stampmitra.in';

function stampmitraErrorMessage(status: number): string {
  if (status === 401) return 'StampMitra sandbox authentication failed. Check the Preview API key.';
  if (status === 403) return 'StampMitra API key does not have the RC verification scope.';
  if (status === 429) return 'StampMitra sandbox rate limit reached. Please wait before retrying.';
  if (status === 502) return 'StampMitra verification service is temporarily unavailable.';
  return 'StampMitra vehicle verification failed.';
}

async function fetchStampMitraVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleResult> {
  const registrationNumber = normalizeRegistrationNumber(input.registrationNumber || '')
    .replace(/[.\\-]/g, '');

  // StampMitra publishes dedicated synthetic sandbox numbers. Do not allow
  // these fixture identifiers to pass through to the production Surepass path.
  const sandboxFixtureNumbers = new Set(['SB00SA0001', 'SB00SA0002', 'SB00SA0004']);
  const isSandboxFixture = sandboxFixtureNumbers.has(registrationNumber);
  const isIndianRegistration = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(registrationNumber);

  if (!isIndianRegistration && !isSandboxFixture) {
    throw new Error('Invalid registration number.');
  }

  const apiKey = process.env.STAMPMITRA_API_KEY;
  if (!apiKey) {
    throw new Error('StampMitra API credentials are not configured.');
  }

  let response: Response;
  try {
    response = await fetch(`${STAMPMITRA_BASE_URL}/v1/verify/rc`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ vehicleNumber: registrationNumber }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.toLowerCase().includes('abort')) {
      throw new Error('StampMitra vehicle verification request timed out.');
    }
    throw new Error('StampMitra verification service is temporarily unavailable.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const requestId = isRecord(payload) && isRecord(payload.error)
      ? asString(payload.error.requestId, '')
      : '';
    console.error('StampMitra RC API request failed:', response.status, requestId || 'no request id');
    throw new Error(stampmitraErrorMessage(response.status));
  }

  if (!isRecord(payload)) {
    throw new Error('StampMitra returned an unexpected response structure.');
  }

  const returnedRegistrationNumber = normalizeRegistrationNumber(
    asString(payload.regNo, registrationNumber)
  ).replace(/[.\\-]/g, '');
  if (returnedRegistrationNumber !== registrationNumber) {
    throw new Error('Returned vehicle registration number does not match.');
  }

  const referenceId = asString(payload.referenceId, '');
  if (!referenceId) {
    throw new Error('StampMitra response did not include a reference ID.');
  }

  return {
    registrationNumber: returnedRegistrationNumber,
    status: asString(payload.rcStatus, asString(payload.registrationStatus, 'Not available')),
    ownerName: asString(payload.ownerName, 'Owner not available'),
    make: asString(payload.vehicleManufacturerName, 'Vehicle'),
    model: asString(payload.model, 'Model not available'),
    fuelType: 'Not supplied by StampMitra RC response',
    registrationDate: asString(payload.registrationDate, 'Not available'),
    insuranceStatus: asString(payload.insuranceUpto, 'Not available'),
    fitnessStatus: 'Not supplied by StampMitra RC response',
    vehicleClass: asString(payload.vehicleClass, ''),
    color: asString(payload.vehicleColor, ''),
    chassisNumber: asString(payload.chassis, ''),
    engineNumber: asString(payload.engine, ''),
    rcExpiryDate: asString(payload.rcExpiryDate, ''),
    verificationScore: 0,
    source: 'stampmitra_rc',
    referenceId,
    warnings: [
      'StampMitra sandbox returns sample data and does not verify a real vehicle.',
      'Insurance date is an RC response field, not insurer-confirmed policy status.',
      'Claim history is not provided by this RC endpoint.',
    ],
  };
}

export async function fetchVehicleRecord(
  input: VehicleLookupInput
): Promise<VehicleResult> {
  const provider = (process.env.VEHICLE_PROVIDER || 'surepass').toLowerCase();
  if (provider === 'stampmitra') {
    return fetchStampMitraVehicleRecord(input);
  }
  if (provider === 'surepass') {
    return fetchSurepassVehicleRecord(input);
  }
  throw new Error('Configured vehicle provider is not supported.');
}
