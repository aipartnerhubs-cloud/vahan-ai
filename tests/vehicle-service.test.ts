import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchVehicleRecord } from '../lib/vehicle-service.ts';

test('throws when registration number is missing', async () => {
  await assert.rejects(
    () => fetchVehicleRecord({ registrationNumber: '' }),
    /Invalid registration number/
  );
});

test('throws when registration number is invalid', async () => {
  await assert.rejects(
    () => fetchVehicleRecord({ registrationNumber: 'BAD$REG' }),
    /Invalid registration number/
  );
});

test('throws when API credentials are missing', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  delete process.env.VEHICLE_API_BASE_URL;
  delete process.env.VEHICLE_API_KEY;
  delete process.env.VEHICLE_API_TOKEN;

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /credentials are not configured/i
    );
  } finally {
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('maps a successful Surepass RC response', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          rc_number: 'MH12AB1234',
          owner_name: 'Aditi Sharma',
          maker_description: 'Hyundai',
          model: 'Creta',
          fuel_type: 'Petrol',
          registration_date: '2020-04-15',
          insurance_status: 'Valid',
          fitness_status: 'Current',
          verification_score: 91,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as Response;

  try {
    const result = await fetchVehicleRecord({ registrationNumber: 'MH12AB1234' });

    assert.equal(result.registrationNumber, 'MH12AB1234');
    assert.equal(result.ownerName, 'Aditi Sharma');
    assert.equal(result.make, 'Hyundai');
    assert.equal(result.model, 'Creta');
    assert.equal(result.fuelType, 'Petrol');
    assert.equal(result.insuranceStatus, 'Valid');
    assert.equal(result.fitnessStatus, 'Current');
    assert.equal(result.verificationScore, 91);
    assert.equal(result.source, 'surepass_rc_v2');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('throws on unexpected upstream response structure', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }) as Response;

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /unexpected response structure/i
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('throws on upstream authentication or API failure', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'bad-token';
  delete process.env.VEHICLE_API_TOKEN;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }) as Response;

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /temporarily unavailable/i
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('throws for request timeout', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new DOMException('The operation was aborted', 'AbortError');
  };

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /aborted|temporarily unavailable/i
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('throws when upstream registration number mismatches requested value', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          rc_number: 'DL08AB1234',
          owner_name: 'Aditi Sharma',
          maker_description: 'Hyundai',
          model: 'Creta',
          fuel_type: 'Petrol',
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as Response;

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /registration number does not match/i
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('handles optional fields missing without crashing', async () => {
  const previousBaseUrl = process.env.VEHICLE_API_BASE_URL;
  const previousKey = process.env.VEHICLE_API_KEY;
  const previousToken = process.env.VEHICLE_API_TOKEN;

  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {
          rc_number: 'MH12AB1234',
          owner_name: 'Aditi Sharma',
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as Response;

  try {
    const result = await fetchVehicleRecord({ registrationNumber: 'MH12AB1234' });

    assert.equal(result.make, 'Vehicle');
    assert.equal(result.model, 'Model not available');
    assert.equal(result.fuelType, 'Not available');
    assert.equal(result.insuranceStatus, 'Not available');
    assert.equal(result.fitnessStatus, 'Not available');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBaseUrl) process.env.VEHICLE_API_BASE_URL = previousBaseUrl;
    if (previousKey) process.env.VEHICLE_API_KEY = previousKey;
    if (previousToken) process.env.VEHICLE_API_TOKEN = previousToken;
  }
});

test('fails closed in production when the provider URL is not explicitly configured', async () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    baseUrl: process.env.VEHICLE_API_BASE_URL,
    key: process.env.VEHICLE_API_KEY,
    token: process.env.VEHICLE_API_TOKEN,
    appMode: process.env.APP_MODE,
  };

  process.env.NODE_ENV = 'production';
  delete process.env.VEHICLE_API_BASE_URL;
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;
  process.env.APP_MODE = 'production';

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /credentials are not configured/i
    );
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.baseUrl === undefined) delete process.env.VEHICLE_API_BASE_URL;
    else process.env.VEHICLE_API_BASE_URL = previous.baseUrl;
    if (previous.key === undefined) delete process.env.VEHICLE_API_KEY;
    else process.env.VEHICLE_API_KEY = previous.key;
    if (previous.token === undefined) delete process.env.VEHICLE_API_TOKEN;
    else process.env.VEHICLE_API_TOKEN = previous.token;
    if (previous.appMode === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = previous.appMode;
  }
});

test('rejects a sandbox host in production mode', async () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    baseUrl: process.env.VEHICLE_API_BASE_URL,
    key: process.env.VEHICLE_API_KEY,
    token: process.env.VEHICLE_API_TOKEN,
    appMode: process.env.APP_MODE,
  };

  process.env.NODE_ENV = 'production';
  process.env.VEHICLE_API_BASE_URL = 'https://sandbox.surepass.app/api/v1';
  process.env.VEHICLE_API_KEY = 'test-token';
  delete process.env.VEHICLE_API_TOKEN;
  process.env.APP_MODE = 'production';

  try {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /sandbox/i
    );
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.baseUrl === undefined) delete process.env.VEHICLE_API_BASE_URL;
    else process.env.VEHICLE_API_BASE_URL = previous.baseUrl;
    if (previous.key === undefined) delete process.env.VEHICLE_API_KEY;
    else process.env.VEHICLE_API_KEY = previous.key;
    if (previous.token === undefined) delete process.env.VEHICLE_API_TOKEN;
    else process.env.VEHICLE_API_TOKEN = previous.token;
    if (previous.appMode === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = previous.appMode;
  }
});
