import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchVehicleRecord } from '../lib/vehicle-service.ts';

async function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => void | Promise<void>
) {
  const keys = Object.keys(values);
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const devEnv = {
  NODE_ENV: 'test',
  VERCEL_ENV: 'preview',
  APP_MODE: 'sandbox',
  VEHICLE_PROVIDER: 'surepass',
  EKO_API_BASE_URL: undefined,
  EKO_DEVELOPER_KEY: undefined,
  EKO_ACCESS_KEY: undefined,
  EKO_INITIATOR_ID: undefined,
  VEHICLE_API_BASE_URL: 'https://sandbox.surepass.app/api/v1',
  VEHICLE_API_KEY: 'test-token',
  VEHICLE_API_TOKEN: undefined,
};

test('rejects an empty registration number', async () => {
  await assert.rejects(
    () => fetchVehicleRecord({ registrationNumber: '' }),
    /invalid registration number/i
  );
});

test('rejects unsupported registration characters', async () => {
  await assert.rejects(
    () => fetchVehicleRecord({ registrationNumber: 'MH12/AB1234' }),
    /invalid registration number/i
  );
});

test('requires provider credentials', async () => {
  await withEnvironment({
    NODE_ENV: 'test',
    VERCEL_ENV: 'preview',
    VEHICLE_API_BASE_URL: undefined,
    VEHICLE_API_KEY: undefined,
    VEHICLE_API_TOKEN: undefined,
  }, async () => {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /credentials are not configured/i
    );
  });
});

test('normalizes registration and maps the fields actually returned by Surepass', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: {
      rc_number: 'MH12AB1234',
      owner_name: 'Example Test Owner',
      maker_description: 'Hyundai',
      model: 'Creta',
      fuel_type: 'Petrol',
      registration_date: '2020-04-15',
      insurance_status: 'Valid',
      fitness_status: 'Current',
      verification_score: 91,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    await withEnvironment(devEnv, async () => {
      const result = await fetchVehicleRecord({ registrationNumber: 'MH 12 AB 1234' });
      assert.equal(result.registrationNumber, 'MH12AB1234');
      assert.equal(result.ownerName, 'Example Test Owner');
      assert.equal(result.make, 'Hyundai');
      assert.equal(result.model, 'Creta');
      assert.equal(result.fuelType, 'Petrol');
      assert.equal(result.registrationDate, '2020-04-15');
      assert.equal(result.insuranceStatus, 'Valid');
      assert.equal(result.fitnessStatus, 'Current');
      assert.equal(result.verificationScore, 91);
      assert.equal(result.source, 'surepass_rc_v2');
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not invent a score or owner details when the provider omits them', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: { rc_number: 'MH12AB1234', maker_description: 'Tata' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    await withEnvironment(devEnv, async () => {
      const result = await fetchVehicleRecord({ registrationNumber: 'MH12AB1234' });
      assert.equal(result.verificationScore, null);
      assert.equal(result.ownerName, null);
      assert.equal(result.make, 'Tata');
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects unexpected provider response structures', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await withEnvironment(devEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
        /unexpected response structure/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('maps provider errors to a generic error without exposing upstream response data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await withEnvironment(devEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
        /temporarily unavailable/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handles request timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new DOMException('The operation was aborted', 'AbortError');
  };

  try {
    await withEnvironment(devEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
        /timed out|aborted|temporarily unavailable/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects a mismatched vehicle registration number', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: { rc_number: 'DL08AB1234', maker_description: 'Hyundai' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    await withEnvironment(devEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
        /registration number does not match/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects production mode if the provider URL is not explicitly configured', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    APP_MODE: 'production',
    VEHICLE_API_BASE_URL: undefined,
    VEHICLE_API_KEY: 'test-token',
    VEHICLE_API_TOKEN: undefined,
  }, async () => {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /credentials are not configured/i
    );
  });
});

test('rejects sandbox hosts in production', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    APP_MODE: 'production',
    VEHICLE_API_BASE_URL: 'https://sandbox.surepass.app/api/v1',
    VEHICLE_API_KEY: 'test-token',
    VEHICLE_API_TOKEN: undefined,
  }, async () => {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /sandbox/i
    );
  });
});

test('rejects a Surepass verification_failed response without treating null vehicle fields as a record', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: {
      client_id: 'rc_v2_sandbox_client',
      rc_number: 'DL08AB1234',
      owner_name: null,
      maker_description: null,
      maker_model: null,
      fuel_type: null,
    },
    status_code: 422,
    success: false,
    message: 'Verification Failed.',
    message_code: 'verification_failed',
  }), { status: 422, headers: { 'Content-Type': 'application/json' } });

  try {
    await withEnvironment(devEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'DL08AB1234' }),
        /Surepass verification failed.*No verified vehicle details were returned/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects a semantic Surepass verification failure even when the transport status is 200', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: { client_id: 'rc_v2_sandbox_client', rc_number: 'DL08AB1234' },
    status_code: 422,
    success: false,
    message: 'Verification Failed.',
    message_code: 'verification_failed',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    await withEnvironment(devEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'DL08AB1234' }),
        /Surepass verification failed/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});


const ekoEnv = {
  NODE_ENV: 'test',
  VERCEL_ENV: 'preview',
  APP_MODE: 'sandbox',
  VEHICLE_PROVIDER: 'eko',
  EKO_API_BASE_URL: 'https://staging.eko.in/ekoapi/v3',
  EKO_DEVELOPER_KEY: 'test-developer-key',
  EKO_ACCESS_KEY: 'test-access-key',
  EKO_INITIATOR_ID: '9999999999',
  VEHICLE_API_BASE_URL: undefined,
  VEHICLE_API_KEY: undefined,
  VEHICLE_API_TOKEN: undefined,
};

test('uses Eko UAT with a fresh HMAC signature and maps the documented RC fields', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(JSON.stringify({
      status: 0,
      response_status_id: 0,
      message: 'Vehicle RC verification successful',
      data: {
        reg_no: 'MH12AB1234',
        rc_status: 'Active',
        owner: 'Example Test Owner',
        vehicle_manufacturer_name: 'Hyundai',
        model: 'Creta',
        fuel_type: 'Petrol',
        reg_date: '2021-01-10',
        vehicle_insurance_upto: '2027-01-09',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    await withEnvironment(ekoEnv, async () => {
      const result = await fetchVehicleRecord({ registrationNumber: 'MH 12 AB 1234' });
      assert.equal(requestedUrl, 'https://staging.eko.in/ekoapi/v3/tools/kyc/vehicle-rc');
      assert.equal(result.registrationNumber, 'MH12AB1234');
      assert.equal(result.status, 'Active');
      assert.equal(result.ownerName, 'Example Test Owner');
      assert.equal(result.make, 'Hyundai');
      assert.equal(result.model, 'Creta');
      assert.equal(result.fuelType, 'Petrol');
      assert.equal(result.registrationDate, '2021-01-10');
      assert.equal(result.insuranceStatus, '2027-01-09');
      assert.equal(result.source, 'eko_vehicle_rc');

      const headers = requestedInit?.headers as Record<string, string>;
      const timestamp = headers['secret-key-timestamp'];
      const expectedSignature = createHmac(
        'sha256',
        Buffer.from('test-access-key', 'utf8').toString('base64')
      ).update(timestamp).digest('base64');
      assert.equal(headers.developer_key, 'test-developer-key');
      assert.equal(headers['secret-key'], expectedSignature);

      const body = JSON.parse(String(requestedInit?.body));
      assert.equal(body.initiator_id, '9999999999');
      assert.equal(body.vehicle_number, 'MH12AB1234');
      assert.ok(body.client_ref_id.length <= 20);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('requires all Eko sandbox credentials', async () => {
  await withEnvironment({
    ...ekoEnv,
    EKO_ACCESS_KEY: undefined,
  }, async () => {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /Eko provider credentials are not configured/i
    );
  });
});

test('rejects Eko semantic verification failures without mapping an empty record', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    status: 1,
    message: 'Invalid or unrecognised vehicle number',
    data: null,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    await withEnvironment(ekoEnv, async () => {
      await assert.rejects(
        () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
        /Eko verification failed.*No verified vehicle details were returned/i
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects Eko staging URLs in Production', async () => {
  await withEnvironment({
    ...ekoEnv,
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    APP_MODE: 'production',
  }, async () => {
    await assert.rejects(
      () => fetchVehicleRecord({ registrationNumber: 'MH12AB1234' }),
      /invalid for this environment/i
    );
  });
});
