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

export class VehicleServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'VehicleServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeRegistrationNumber(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function isValidRegistrationNumber(value: string): boolean {
  const normalized = normalizeRegistrationNumber(value);
  return /^[A-Z0-9]{5,20}$/.test(normalized);
}

export function normalizeOptionalString(value: unknown, fallback = 'Not available'): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return fallback;
}

function readPayloadValue(data: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!data) {
    return undefined;
  }

  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeVendorResponse(
  rawPayload: unknown,
  requestedRegistrationNumber: string
): VehicleResult {
  const payload = isRecord(rawPayload) ? rawPayload : undefined;
  const data = isRecord(payload?.data) ? payload.data : payload;

  if (!data || typeof data !== 'object') {
    throw new VehicleServiceError('Malformed vendor response.', 502, 'RC_VENDOR_RESPONSE_MALFORMED');
  }

  const requested = normalizeRegistrationNumber(requestedRegistrationNumber);
  const actual = normalizeRegistrationNumber(
    String(readPayloadValue(data, ['rc_number', 'registrationNumber', 'id_number', 'registration_number']) ?? requested)
  );

  if (requested && actual && actual !== requested) {
    throw new VehicleServiceError('Vendor response registration number does not match the request.', 502, 'RC_REGISTRATION_NUMBER_MISMATCH');
  }

  const warnings: string[] = Array.isArray(payload?.warnings)
    ? payload.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
    : [];

  const status = normalizeOptionalString(readPayloadValue(data, ['status', 'verification_status', 'rc_status']), 'Not available');
  const ownerName = normalizeOptionalString(readPayloadValue(data, ['owner_name', 'ownerName', 'name', 'registered_owner']), 'Not available');
  const make = normalizeOptionalString(readPayloadValue(data, ['make', 'manufacturer', 'vehicle_make']), 'Not available');
  const model = normalizeOptionalString(readPayloadValue(data, ['model', 'vehicle_model']), 'Not available');
  const fuelType = normalizeOptionalString(readPayloadValue(data, ['fuel_type', 'fuelType']), 'Not available');
  const registrationDate = normalizeOptionalString(readPayloadValue(data, ['registration_date', 'registrationDate', 'registered_on']), 'Not available');
  const insuranceStatus = normalizeOptionalString(readPayloadValue(data, ['insurance_status', 'insuranceStatus']), 'Not available');
  const fitnessStatus = normalizeOptionalString(readPayloadValue(data, ['fitness_status', 'fitnessStatus']), 'Not available');

  const rawScore = readPayloadValue(data, ['verification_score', 'verificationScore']);
  const verificationScore = typeof rawScore === 'number' ? rawScore : Number(rawScore ?? 0);

  return {
    registrationNumber: actual || requested,
    status,
    ownerName,
    make,
    model,
    fuelType,
    registrationDate,
    insuranceStatus,
    fitnessStatus,
    verificationScore: Number.isFinite(verificationScore) ? Math.max(0, Math.min(100, verificationScore)) : 0,
    source: 'Surepass Sandbox RC V2 API',
    warnings,
  };
}

export async function fetchVehicleRecord(input: VehicleRequest): Promise<VehicleResult> {
  const registrationNumber = normalizeRegistrationNumber(input.registrationNumber);

  if (!isValidRegistrationNumber(registrationNumber)) {
    throw new VehicleServiceError('Invalid registration number format.', 400, 'RC_INVALID_REGISTRATION_NUMBER');
  }

  const { baseUrl, apiKey, apiToken, apiSecret, username, password, timeoutMs, isConfigured } = await import('./server-config').then((module) => ({
    baseUrl: module.getVehicleApiConfig().baseUrl,
    apiKey: module.getVehicleApiConfig().apiKey,
    apiToken: module.getVehicleApiConfig().apiToken,
    apiSecret: module.getVehicleApiConfig().apiSecret,
    username: module.getVehicleApiConfig().username,
    password: module.getVehicleApiConfig().password,
    timeoutMs: module.getVehicleApiConfig().timeoutMs,
    isConfigured: module.getVehicleApiConfig().isConfigured,
  }));

  if (!isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw new VehicleServiceError('RC verification is unavailable because the Surepass API is not configured.', 503, 'RC_API_CONFIG_MISSING');
    }

    const mockModeAllowed = process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_RC_RESPONSE === 'true';
    if (!mockModeAllowed) {
      throw new VehicleServiceError('RC verification is unavailable because the Surepass API is not configured.', 503, 'RC_API_CONFIG_MISSING');
    }
  }

  if (baseUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      const bearerToken = apiKey || apiToken;
      if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`;
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
        signal: controller.signal,
        body: JSON.stringify({
          id_number: registrationNumber,
          enrich: false,
          ...(input.chassisNumber ? { chassis_number: normalizeRegistrationNumber(input.chassisNumber) } : {}),
          ...(input.engineNumber ? { engine_number: normalizeRegistrationNumber(input.engineNumber) } : {}),
        }),
        cache: 'no-store',
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new VehicleServiceError('Vendor authentication failed.', 401, 'RC_VENDOR_AUTH_FAILED');
        }
        if (response.status === 429) {
          throw new VehicleServiceError('Vendor rate limit exceeded.', 429, 'RC_VENDOR_RATE_LIMITED');
        }
        if (response.status === 408) {
          throw new VehicleServiceError('Vendor request timed out.', 504, 'RC_VENDOR_TIMEOUT');
        }

        const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'Vendor request failed.';
        throw new VehicleServiceError(message, response.status >= 500 ? 502 : 400, 'RC_VENDOR_REQUEST_FAILED');
      }

      const rawResponse = await response.json();
      return normalizeVendorResponse(rawResponse, registrationNumber);
    } catch (error) {
      if (error instanceof VehicleServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new VehicleServiceError('Vendor request timed out.', 504, 'RC_VENDOR_TIMEOUT');
      }

      if (error instanceof Error) {
        throw new VehicleServiceError('Unable to reach the RC verification vendor.', 502, 'RC_VENDOR_UNAVAILABLE');
      }

      throw new VehicleServiceError('Unable to reach the RC verification vendor.', 502, 'RC_VENDOR_UNAVAILABLE');
    }
  }

  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_RC_RESPONSE === 'true') {
    return {
      registrationNumber,
      status: 'Mock response',
      ownerName: 'Mock owner',
      make: 'Mock make',
      model: 'Mock model',
      fuelType: 'Mock fuel',
      registrationDate: 'Not available',
      insuranceStatus: 'Not available',
      fitnessStatus: 'Not available',
      verificationScore: 0,
      source: 'Mock response (development only)',
      warnings: ['This response is a mock and only available in local development.'],
    };
  }

  throw new VehicleServiceError('RC verification is unavailable because the Surepass API is not configured.', 503, 'RC_API_CONFIG_MISSING');
}

export function buildMockVehicleResult(input: VehicleRequest): VehicleResult {
  const registrationNumber = normalizeRegistrationNumber(input.registrationNumber);
  return {
    registrationNumber,
    status: 'Mock response',
    ownerName: 'Mock owner',
    make: 'Mock make',
    model: 'Mock model',
    fuelType: 'Mock fuel',
    registrationDate: 'Not available',
    insuranceStatus: 'Not available',
    fitnessStatus: 'Not available',
    verificationScore: 0,
    source: 'Mock response (development only)',
    warnings: ['This response is a mock and only available in local development.'],
  };
}
