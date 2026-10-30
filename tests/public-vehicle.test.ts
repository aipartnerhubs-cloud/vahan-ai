import test from 'node:test';
import assert from 'node:assert/strict';

import { toPublicVehicleResult } from '../lib/public-vehicle.ts';

test('public partner result excludes owner identity, confidence score and provider warnings', () => {
  const result = toPublicVehicleResult({
    registrationNumber: 'MH12AB1234',
    status: 'Active',
    ownerName: 'Private Test Owner',
    make: 'Tata',
    model: 'Nexon',
    fuelType: 'Electric',
    registrationDate: '2024-01-01',
    insuranceStatus: 'Valid',
    fitnessStatus: 'Current',
    verificationScore: 99,
    source: 'surepass_rc_v2',
    warnings: ['Private provider warning'],
  });

  assert.deepEqual(result, {
    registrationNumber: 'MH12AB1234',
    status: 'Active',
    make: 'Tata',
    model: 'Nexon',
    fuelType: 'Electric',
    registrationDate: '2024-01-01',
    insuranceStatus: 'Valid',
    fitnessStatus: 'Current',
    source: 'surepass_rc_v2',
  });
  assert.equal('ownerName' in result, false);
  assert.equal('verificationScore' in result, false);
  assert.equal('warnings' in result, false);
});
